const EventEmitter = require("eventemitter2");

class SimplePrefs extends EventEmitter {
  constructor(prefs) {
    super();
    this.prefs = prefs || {};
  }
}

module.exports = new SimplePrefs();
module.exports.SimplePrefs  = SimplePrefs;
