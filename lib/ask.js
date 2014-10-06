var prompt = require('prompt');
var Q = require('kew');

prompt.message = '';
prompt.delimiter = '';

var promptAsync = function (specs) {
  var getprompt = prompt.get.bind(prompt);
  return Q.nfcall(getprompt, specs);
};

var confirmAsync = function (question) {
  var confirmprompt = prompt.confirm.bind(prompt);
  return Q.nfcall(confirmprompt, question);
};

var strip = function (field) {
  return function (obj) {
    return obj[field];
  };
};

var inputString = function (label) {
  return Q.resolve([{
    name: 'mystring',
    description: label
  }]).then(promptAsync).then(strip('mystring'));
};

var inputPassword = function (label) {
  return Q.resolve([{
    name: 'password',
    description: label,
    hidden: true
  }]).then(promptAsync).then(strip('password'));
};

var nothing = function (obj) {
  return Q.resolve(obj);
};

var start = function () {
  prompt.start();
};

module.exports = {
  promptAsync: promptAsync,
  confirmAsync: confirmAsync,
  toGet: {
    string: inputString,
    password: inputPassword,
    bool: confirmAsync,
    nothing: nothing
  },
  start: start
};