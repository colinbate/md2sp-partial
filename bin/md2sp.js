#!/usr/bin/env node
var md2sp = require('../index');
var generator = require('../lib/generator');
var config = require('../lib/config');
var ask = require('../lib/ask');
var args = process.argv.slice(2);
var filename, update = false, setup = false, generate;

if (!args.length) {
  // Setup
  setup = true;
} else if (args[0] === 'new') {
  // Generator
  generate = {
    interactive: (args.length === 1 || args[1] === '-i'),
    title: (args[1] === '-i') ? args[2] : args[1]
  };
} else if (args[0] === '-e') {
  // Update!
  update = true;
  filename = args[1];
} else {
  // New
  filename = args[0];
}

if (!setup && !filename && !generate) {
  console.log('Usage:');
  console.log('    md2sp [[-e] <filename>]');
  console.log('    md2sp new [-i] <title>');
  process.exit(1);
}

var promptForOverwrite = function () {
  var confirm = 'Do you want to set up a blog here?';
  return config.get().then(function (conf) {
    console.log('WARNING: There is already a blog set up for this folder (' + conf.blogname + ')');
    console.log('Setting up a blog here will override your existing configuration');
    return confirm;
  }).fail(function () {
    return confirm;
  });
};

var promptForType = function () {
  return promptForOverwrite().then(ask.confirmAsync).then(function (answer) {
    if (!answer) {
      process.exit(0);
      return;
    }
    return ask.confirmAsync('Is it a Sharepoint blog?');
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

  return ask.promptAsync(asking).then(function (obj) {
    obj.sharepoint = sp;
    return obj;
  });
};

var promptSavePass = function (obj) {
  return ask.confirmAsync('Do you want to save your password (as plain text)?').then(function (save) {
    obj.savepass = save;
    return obj;
  });
};

var promptForPassword = function () {
  return ask.promptAsync([{
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

if (generate) {
  generator.create(generate.title, generate.interactive).fail(function (err) {
    console.log(''+err);
    process.exit(1);
  });
} else if (setup) {
  ask.start();
  promptForType().then(promptForInfo).then(promptSavePass).then(md2sp.setup).end();
} else if (filename) {
  config.get(false, checkPassword).then(function (conf) {
    if (!update) {
      console.log('Creating new post on ' + conf.blogname + ' from ' + filename);
      return md2sp.newPost(filename).then(function (obj) {
        console.log('New post ID: ' + obj.id);
        return md2sp.addPostId(filename, conf, obj.id);
      });
    } else {
      console.log('Updating post from ' + filename);
      return md2sp.editPost(filename).then(function (obj) {
        if (obj.success) {
          console.log('Post updated.');
        }
      });
    }
  }).fail(function (err) {
    console.log(''+err);
    process.exit(1);
  });
}