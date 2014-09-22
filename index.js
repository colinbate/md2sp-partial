var fs = require('fs');
var path = require('path');
var Q = require('kew');
var MetaWeblog = require('./lib/metaweblog').MetaWeblog;
var toml = require('toml');
var tomlify = require('tomlify');
var marked = require('marked');
var configFile = 'md2sp.toml';

marked.setOptions({
  sanitize: false,
  smartypants: true
});

var readFileAsync = function (filename) {
  return Q.nfcall(fs.readFile, filename, {encoding: 'utf8'});
};

var writeFileAsync = function (filename, data) {
  return Q.nfcall(fs.writeFile, filename, data, {encoding: 'utf8'});
}

var configPromise;
function readConfig(dir) {
  return readFileAsync(path.join(dir, configFile)).fail(function () {
    var updir = path.join(dir, '..');
    if (updir === dir) {
      return new Error('Could not find ' + configFile + ' file in current or parent folder.');
    }
    return readConfig(updir);
  });
}

var loadConfig = function () {
  var cwd = process.cwd();

  return readConfig(cwd).then(toml.parse).then(function (config) {
    if (!config || !config.url) {
      return new Error('Config file could not be parsed, or invalid.');
    }
    if (!config.frontmatter) {
      config.frontmatter = {};
    }
    config.apiUser = config.ntlm ? '' : config.username;
    config.apiPass = config.ntlm ? '' : config.password;
    config.blogid = config.blogid || '';
    return config;
  });
};

var getConfig = function (force) {
  if (!configPromise || force) {
    configPromise = loadConfig();
  }
  return configPromise;
};

var parseContent = function (content) {
  var fileparts = content.split(config.frontmatter.separator || '+++'),
      meta,
      payload,
      post;

  if (fileparts.length && !fileparts[0]) {
    fileparts.shift();
  }

  if (!fileparts.length) {
    return new Error('No content provided.');
  }

  meta = toml.parse(fileparts[0].trim());
  if (config.sendmarkdown) {
    payload = fileparts[1].trim();
  } else {
    payload = marked(fileparts[1].trim());
  }

  if (!meta.title) {
    return new Error('No title provided in your content... please add one.');
  }

  post = {
    dateCreated: meta.date || new Date(),
    title: meta.title,
    description: payload,
  };
  if (meta.categories) {
    post.categories = meta.categories;
  }

  return post;
};

var parseFile = function (filename) {
  return readFileAsync(filename).then(parseContent);
};

var getBlog = function (config) {
  var ntlm = false;
  if (config.ntlm) {
    ntlm = {
      username: config.username,
      password: config.password,
      workstation: config.workstation || process.env.COMPUTERNAME || 'WORKSTATION',
      domain: config.domain || ''
    };
  }

  var blog = new MetaWeblog(config.url, {
    ntlm: ntlm,
    sanitize: false
  });
  blog.config = config;
  return blog;
};

var newPost = function (filename) {
  return Q.all([parseFile(filename), getConfig().then(getBlog)]).then(function (all) {
    var c = all[1].config,
        post = Q.nfcall(all[1].newPost, c.blogid, c.apiUser, c.apiPass, all[0], true);
    return post.fail(function (msg) {
      return new Error('Could not create new post: ' msg.message);
    });
  });
};


var setupSpBlog = function (url, user, pass) {
  if (url.slice(-12) === 'default.aspx') {
    url = slice(0, -12);
  }
  if (url[url.length - 1] !== '/') {
    url += '/';
  }
  return setupBlog(url + '_layout/metaweblog.aspx');
};

var getUsersBlogs = function (config) {
  var apiKey = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      blog = getBlog(config),
      getBlogs = blog.getUsersBlogs.bind(blog, apiKey);
  return Q.nfcall(getBlogs, config.apiUser, config.apiPass);
};

var saveConfig = function (config) {
  var tomlStr = tomlify(config),
      file = path.join(process.cwd(), configFile);
  return writeFileAsync(file, tomlStr);
};

var setupBlog = function (endpoint, user, pass) {
  var info = {
        url: endpoint,
        blogid: void 0,
        ntlm: false,
        username: user,
        password: pass,
        apiUser: user,
        apiPass: pass,
        sendmarkdown: false,
        frontmatter: {
          language: 'toml',
          separator: '+++'
        }
      },
      blog;
  // 1. getUsersBlogs() with API credentials.
  return getUsersBlogs(info).fail(function () {
    // 2. If 1 fails, getUsersBlogs with NTLM.
    // 3. Set ntlm option
    info.ntlm = true;
    info.apiUser = '';
    info.apiPass = '';
    return getUsersBlogs(info);
  }).then(function (id) {
    delete info.apiUser;
    delete info.apiPass;
    // 4. Set blog id
    info.blogid = id;
    return info;
    // 5. Save info to toml file
  }).then(saveConfig);
};

module.exports = {
  parseFile: parseFile,
  newPost: newPost,
  //updatePost: updatePost,
  setupBlog: setupBlog
  setupSpBlog: setupSpBlog
};