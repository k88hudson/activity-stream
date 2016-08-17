const EventEmitter = require("eventemitter2");

class SimplePrefsMock extends EventEmitter {
  constructor(prefs) {
    super();
    this.prefs = prefs || {};
  }
}

module.exports = new SimplePrefsMock();
module.exports.SimplePrefsMock = SimplePrefsMock;
