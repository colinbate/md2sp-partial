var fs = require('fs');
var MetaWeblog = require('./lib/metaweblog').MetaWeblog;
var toml = require('toml');
var marked = require('marked');
var configFile = 'config.toml';

marked.setOptions({
  sanitize: false,
  smartypants: true
});

var filename = process.argv[2];

if (!filename) {
  console.log('Usage: node index.js <filename>');
  process.exit(1);
}

var config = toml.parse(fs.readFileSync(configFile, {encoding: 'utf8'}));
if (!config || !config.connection || ! config.connection.url) {
  console.log('Config file (' + configFile + ') needs to exist with a connection url.');
  process.exit(4);
}
if (!config.frontmatter) {
  config.frontmatter = {};
}

var fullfile = fs.readFileSync(filename, {encoding:'utf8'});

var fileparts = fullfile.split(config.frontmatter.separator || '+++');

if (fileparts.length && !fileparts[0]) {
  fileparts.shift();
}

var meta = toml.parse(fileparts[0].trim());
var payload;
if (config.connection.sendmarkdown) {
  payload = fileparts[1].trim();
} else {
  payload = marked(fileparts[1].trim());
}

if (!meta.title) {
  console.log('No title provided in your file... please add one.');
  process.exit(2);
}

var ntlm = false;
if (config.connection.ntlm) {
  ntlm = {
    username: config.connection.username,
    password: config.connection.password,
    workstation: config.connection.workstation || process.env.COMPUTERNAME || 'WORKSTATION',
    domain: config.connection.domain || ''
  };
}

var blog = new MetaWeblog(config.connection.url, {
  ntlm: ntlm,
  sanitize: false
});

var post = {
  dateCreated: meta.date || new Date(),
  title: meta.title,
  description: payload,
};

if (meta.categories) {
  post.categories = meta.categories;
}

//console.dir(post);

var apiUser = config.connection.ntlm ? '' : config.connection.username;
var apiPass = config.connection.ntlm ? '' : config.connection.password;

var apiKey = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
blog.getUsersBlogs(apiKey, apiUser, apiPass, function (err, data, res) {
  if (err) {
    console.log('Could not fetch blogs successfully:');
    console.dir(err);
    process.exit(3);
  }
  console.dir(data);
});

// blog.newPost(config.connection.blogid || '',
//              apiUser,
//              apiPass,
//              post,
//              true,
//              function (err, data, res) {
//   if (err) {
//     console.log('Could not post successfully:');
//     console.dir(err);
//     process.exit(3);
//   }
//   console.log('Success. New post ID: ' + data);
// });