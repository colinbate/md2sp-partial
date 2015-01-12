var marked = require('marked');
var highlightjs = require('highlight.js');
var mixtur = require('mixtur');
var Q = require('kew');
var files = require('./files');

marked.setOptions({
  sanitize: false,
  smartypants: true,
  highlight: function (code) {
    return highlightjs.highlightAuto(code).value;
  }
});

var loadStyleIfExists = function (cssFilePath) {
  return files.readAsync(cssFilePath).then(function (cssString) {
    return cssString; 
  });
};

var generateHtmlAsync = function (rawMarkdown, config) {  
  if (config.cssFile) {
    return loadStyleIfExists(config.cssFile).then(function (css) {
      return mixtur(marked(rawMarkdown), css);
    });
  }
  return Q.resolve(marked(rawMarkdown));
};

module.exports = {
  generateHtmlAsync: generateHtmlAsync,
};