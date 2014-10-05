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

var start = function () {
  prompt.start();
}

module.exports = {
  promptAsync: promptAsync,
  confirmAsync: confirmAsync,
  start: start
};