var url = require('url');
var Q = require('kew');

var maxRedirects = 3;

var followRedirects = function (redirectsSoFar, blogUrl, options) {
  if(redirectsSoFar < maxRedirects) {
    var reqUrl = url.parse(blogUrl),
        isHttps = reqUrl.protocol === 'https:',
        client = isHttps ? require('https') : require('http'),
        opts = {
          host: reqUrl.hostname,      
          path: reqUrl.pathname || '/',
          port: reqUrl.port,
          method: 'HEAD'
        };
    if (options.caCert) {
      opts.ca = options.caCert;
    }
    var defered = Q.defer();
    var req = client.request(opts, function (res) {
      if ((res.statusCode >= 300 || res.statusCode < 400) && ('location' in res.headers)) {        
        return defered.resolve(followRedirects(redirectsSoFar++, url.resolve(reqUrl, res.headers.location), options));
      } else {
        return defered.resolve(url.format(reqUrl));
      }
    });
    req.end();
    return defered.promise;
  } else {
    return Q.resolve(blogUrl);
  }
};

module.exports = {
  followRedirects: followRedirects.bind(followRedirects, 0)
};