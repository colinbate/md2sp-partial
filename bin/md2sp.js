#!/usr/bin/env node
var md2sp = require('../index');
var prompt = require('prompt');
prompt.message = '';
prompt.delimiter = '';
var Q = require('kew');
var args = process.argv.slice(2);
var filename, update = false, setup = false;

if (!args.length) {
  // Setup
  setup = true;
} else if (args[0] === '-e') {
  // Update!
  update = true;
  filename = args[1];
} else {
  // New
  filename = args[0]
}

if (!setup && !filename) {
  console.log('Usage:');
  console.log('    md2sp [[-e] <filename>]');
  process.exit(1);
}

var promptAsync = function (specs) {
  var getprompt = prompt.get.bind(prompt);
  return Q.nfcall(getprompt, specs);
};

var confirmAsync = function (question) {
  var confirmprompt = prompt.confirm.bind(prompt);
  return Q.nfcall(confirmprompt, question);
};

var promptForOverwrite = function () {
  var confirm = 'Do you want to set up a blog here?';
  return md2sp.getConfig().then(function (conf) {
    console.log('WARNING: There is already a blog set up for this folder (' + conf.blogname + ')');
    console.log('Setting up a blog here will override your existing configuration');
    return confirm;
  }).fail(function () {
    return confirm;
  });
};

var promptForType = function () {
  return promptForOverwrite().then(confirmAsync).then(function (answer) {
    if (!answer) {
      process.exit(0);
      return;
    }
    return confirmAsync('Is it a Sharepoint blog?');
  });
};

var promptForInfo = function (sp) {
  var asking = [],
      descUrl = sp ? 'Enter blog URL:' : 'Enter metaweblog endpoint:';
  // ask for url
  asking.push({
    name: 'url',
    description: descUrl,
    required: true
  });
  // ask for username
  asking.push({
    name: 'username',
    description: 'Your username:'
  });
  // ask for password
  asking.push({
    name: 'password',
    description: 'Your password:',
    hidden: true
  });

  return promptAsync(asking).then(function (obj) {
    obj.sharepoint = sp;
    return obj;
  });
};

var promptSavePass = function (obj) {
  return confirmAsync('Do you want to save your password (as plain text)?').then(function (save) {
    obj.savepass = save;
    return obj;
  });
};

var promptForPassword = function () {
  return promptAsync([{
    name: 'password',
    description: 'Enter your password:',
    hidden: true
  }]);
};

var checkPassword = function (config) {
  if (!config.password) {
    return promptForPassword().then(function (obj) {
      config.password = obj.password;
      config.apiPass = config.ntlm ? '' : obj.password;
      return config;
    });
  }
  return config;
};

if (setup) {
  prompt.start();
  promptForType().then(promptForInfo).then(promptSavePass).then(md2sp.setup).end();
} else if (filename) {
  md2sp.getConfig(false, checkPassword).then(function (conf) {
    if (!update) {
      console.log('Creating new post on ' + conf.blogname + ' from ' + filename);
      return md2sp.newPost(filename).then(function (id) {
        console.log('New post ID: ' + id);
      });
    } else {
      console.log('Updating post from ' + filename);
      return md2sp.editPost(filename).then(function (success) {
        if (success) {
          console.log('Post updated.');
        }
      });
    }
  }).fail(function (err) {
    console.log(''+err);
    process.exit(1);
  });
}