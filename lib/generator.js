var ask = require('./ask');
var files = require('./files');
var config = require('./config');
var tomlify = require('tomlify');

var createSlug = function (txt) {
  if (!txt) {
    return '';
  }
  return txt.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

var makeFile = function (filename, meta) {
  var metaStr;
  return config.get().fail(function () {
    return {
      frontmatter: {
        separator: '+++'
      }
    };
  }).then(function (conf) {
    if (!meta.title) {
      throw new Error('No title provided');
    }
    metaStr = tomlify(meta, {delims: conf.frontmatter.separator});
    metaStr += '\n';
    return files.writeSafely(filename, metaStr);
  });
};

var askForTitle = function (obj) {
  if (obj.title) {
    return ask.toGet.nothing(obj);
  }
  return ask.toGet.string('Enter a title:').then(function (title) {
    obj.title = title;
    return obj;
  });
};

var askForDate = function (obj) {
  var msg = 'Enter a date (blank to omit, now for now):';
  return ask.toGet.string(msg).then(function (dstr) {
    var parsed;
    if (dstr === 'now') {
      parsed = new Date();
    } else if (dstr) {
      parsed = new Date(dstr);
    }
    if (parsed) {
      obj.date = parsed;
    }
    return obj;
  });
};

function askForCategory(obj) {
  var msg = 'Category (blank to stop):';
  return ask.toGet.string(msg).then(function (cat) {
    if (!cat) {
      return obj;
    }
    if (!obj.categories) {
      obj.categories = [];
    }
    obj.categories.push(cat);
    return askForCategory(obj);
  });
}

var create = function (title, interactive) {
  var filename = createSlug(title) + '.md',
      meta = {
        title: title
      };
  if (interactive) {
    return askForTitle(meta).then(askForDate).then(askForCategory).then(function (obj) {
      filename = createSlug(obj.title) + '.md';
      return makeFile(filename, obj);
    });
  } else {
    return makeFile(filename, meta);
  }
};

module.exports = {
  create: create,
};