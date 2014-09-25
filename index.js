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
  var checkFile = path.join(dir, configFile);
  return readFileAsync(checkFile).fail(function () {
    var updir = path.join(dir, '..');
    if (updir === dir) {
      throw new Error('Could not find ' + configFile + ' file in current or parent folder.');
    }
    return readConfig(updir);
  });
}

var loadConfig = function () {
  var cwd = process.cwd();

  return readConfig(cwd).then(toml.parse).then(function (config) {
    if (!config || !config.url) {
      throw new Error('Config file could not be parsed, or invalid.');
    }
    if (!config.frontmatter) {
      config.frontmatter = {};
    }
    config.frontmatter.separator = config.frontmatter.separator || '+++';
    config.apiUser = config.ntlm ? '' : config.username;
    config.apiPass = config.ntlm ? '' : config.password;
    config.blogid = config.blogid || '';
    return config;
  });
};

var getConfig = function (force, filter) {
  if (!configPromise || force) {
    configPromise = loadConfig();
    if (filter) {
      configPromise = configPromise.then(filter);
    }
  }
  return configPromise;
};

var savePostFile = function (meta, payload, config, filename) {
  var metaStr, content, update = false;
  if (!meta.date) {
    meta.date = new Date();
    update = true;
  }
  if (!meta.postid && config.postid) {
    meta.postid = config.postid;
    update = true;
  }
  if (update) {
    metaStr = tomlify(meta, {delims: config.frontmatter.separator});
    content = metaStr + payload;
    return writeFileAsync(filename, content);
  }
  return Q.resolve(true);
};

var parseContent = function (content, config, filename) {
  var fileparts = content.split(config.frontmatter.separator),
      meta,
      payload;

  if (fileparts.length && !fileparts[0]) {
    fileparts.shift();
  }

  if (!fileparts.length) {
    throw new Error('No content provided.');
  }

  meta = toml.parse(fileparts[0].trim());
  if (config.sendmarkdown) {
    payload = fileparts[1].trim();
  } else {
    payload = marked(fileparts[1].trim());
  }

  if (!meta.title) {
    throw new Error('No title provided in your content... please add one.');
  }

  return savePostFile(meta, fileparts[1], config, filename).then(function () {
    meta.dateCreated = meta.date;
    delete meta.date;
    meta.description = payload;
    return meta;
  });
};

var parseFile = function (filename) {
  return Q.all([readFileAsync(filename), getConfig()]).then(function (res) {
    return parseContent(res[0], res[1], filename);
  });
};

var getBlog = function (config) {
  var ntlm = false;
  if (!config.url) {
    throw new Error('No URL provided to setup.')
  }
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
        def = Q.defer();
    all[1].newPost(c.blogid, c.apiUser, c.apiPass, all[0], true, function (err, data) {
      if (err || !data) {
        def.reject(new Error('Could not create new post: ' + err.faultString));
        return;
      }
      def.resolve({filename: filename, id: data});
    });
    return def.promise;
  });
};

var editPost = function (filename) {
  return Q.all([parseFile(filename), getConfig().then(getBlog)]).then(function (all) {
    var c = all[1].config,
        def = Q.defer(),
        postId = '' + all[0].postid;
    if (typeof postId === 'undefined') {
      def.reject(new Error('No postid value present in file.'));
      return def.promise;
    }
    delete all[0].postid;
    all[1].editPost(postId, c.apiUser, c.apiPass, all[0], true, function (err, data) {
      if (err) {
        err = err || { faultString: 'Unknown error' };
        def.reject(new Error('Could not update post: ' + err.faultString));
        return;
      }
      def.resolve({filename: filename, success: data});
    });
    return def.promise;
  });
};

var addPostId = function (filename, conf, postid) {
  return readFileAsync(filename).then(function (str) {
    conf.postid = postid;
    return parseContent(str, conf, filename);
  });
};

var setupSpBlog = function (config) {
  if (config.url.slice(-12) === 'default.aspx') {
    config.url = config.url.slice(0, -12);
  }
  if (config.url[config.url.length - 1] !== '/') {
    config.url += '/';
  }
  config.url += '_layouts/metaweblog.aspx';
  return setupBlog(config);
};

var getUsersBlogs = function (config) {
  var apiKey = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      blog = getBlog(config),
      def = Q.defer();
  blog.getUsersBlogs(apiKey, config.apiUser, config.apiPass, function (err, data) {
    if (err || !data) {
      def.reject(new Error('Could not get users blogs'));
      return;
    }
    if (data && data.length) {
      data = data[0];
    }
    def.resolve(data);
  });
  return def.promise;
};

var saveConfig = function (config) {
  var tomlStr = tomlify(config),
      file = path.join(process.cwd(), configFile);
  console.log('Writing config file: ./' + configFile);
  return writeFileAsync(file, tomlStr);
};

var setupBlog = function (info) {
  var blog;
  info.blogid = void 0;
  info.ntlm = false;
  info.apiUser = info.username;
  info.apiPass = info.password;
  info.sendmarkdown = false;
  info.frontmatter = {
    language: 'toml',
    separator: '+++'
  };

  // 1. getUsersBlogs() with API credentials.
  return getUsersBlogs(info).fail(function (err) {
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
    info.blogid = id.blogid;
    info.blogname = id.blogName;

    if (!info.savepass) {
      delete info.password;
    }
    delete info.savepass;
    delete info.sharepoint;

    return info;
    // 5. Save info to toml file
  }).then(saveConfig);
};

var setup = function (config) {
  if (config.sharepoint) {
    return setupSpBlog(config);
  }
  return setupBlog(config);
};

module.exports = {
  getConfig: getConfig,
  parseFile: parseFile,
  newPost: newPost,
  editPost: editPost,
  addPostId: addPostId,
  setup: setup,
  configFile: configFile
};