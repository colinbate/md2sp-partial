var HttpsAgent = require('agentkeepalive').HttpsAgent;

function Factory() { }
Factory.prototype.create = function create() {
    
    var options = {};
    // create a function on this module to add the CA cert
    if(this.getCACert)
    {
      options.ca = [];
      options.ca.push(this.getCACert());
    }
    return new HttpsAgent(options);
};
// singleton so that changes can be made at runtime
module.exports = exports = new Factory();