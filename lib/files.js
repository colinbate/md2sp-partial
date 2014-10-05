var fs = require('fs');
var Q = require('kew');

var readFileAsync = function (filename) {
  return Q.nfcall(fs.readFile, filename, {encoding: 'utf8'});
};

var writeFileAsync = function (filename, data) {
  return Q.nfcall(fs.writeFile, filename, data, {encoding: 'utf8'});
};

module.exports = {
  readAsync: readFileAsync,
  writeAsync: writeFileAsync
};