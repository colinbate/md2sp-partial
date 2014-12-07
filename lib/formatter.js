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

var loadStyleIfExists = function () {
    return files.readAsync('default.css')
        .fail(function () {
            // cannot find any sytle sheet so leave unstyled
            return '';
        })
        .then(function (cssString) { return cssString; });
};

var generateHtmlAsync = function (rawMarkdown) {
    return Q.resolve(loadStyleIfExists()
        .then(function(css) {
            return mixtur(marked(rawMarkdown),css);
        }));
};

module.exports = {
  generateHtmlAsync: generateHtmlAsync,
};