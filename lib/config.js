var configFile = 'md2sp.toml';
var toml = require('toml');
var tomlify = require('tomlify');
var path = require('path');
var files = require('./files');

var configPromise;
var currentFolder;
function readConfig(dir) {
  var checkFile = path.join(dir, configFile);
  currentFolder = dir;
  return files.readAsync(checkFile).fail(function () {
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
    config._folder = currentFolder;
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

var saveConfig = function (config) {
  var tomlStr = tomlify(config),
      file = path.join(process.cwd(), configFile);
  console.log('Writing config file: ./' + configFile);
  return files.writeAsync(file, tomlStr);
};

module.exports = {
  get: getConfig,
  save: saveConfig
};