var fs = require('fs');
var Q = require('kew');
var path = require('path');

var hasSafeNum = /-(\d+)$/;

var readFileAsync = function (filename) {
  return Q.nfcall(fs.readFile, filename, {encoding: 'utf8'});
};

var getNextFilename = function (filename) {
  var ext = path.extname(filename),
      base = path.basename(filename, ext),
      match = hasSafeNum.exec(base);
  if (match) {
    return base.substring(0, match.index) + '-' + (match[1] * 1 + 1) + ext;
  } else {
    return base + '-1' + ext;
  }
};

function writeFileAsync(filename, data, safe) {
  var flag = safe ? 'wx' : 'w';
  return Q.nfcall(fs.writeFile, filename, data, {encoding: 'utf8', flag: flag});
}

function writeSafely(filename, data) {
  return writeFileAsync(filename, data, true).fail(function (err) {
    if (err && err.code === 'EEXIST') {
      filename = getNextFilename(filename);
      console.log('File', err.path, 'already exists. Trying', filename, '...');
      return writeSafely(filename, data);
    }
  });
}

module.exports = {
  readAsync: readFileAsync,
  writeAsync: writeFileAsync,
  writeSafely: writeSafely
};