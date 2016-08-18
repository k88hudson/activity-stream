const EventEmitter = require("mocks/_utils/EventEmitter");

class SimplePrefs extends EventEmitter {
  constructor(prefs) {
    super();
    this.prefs = prefs || {};
  }
}

module.exports = new SimplePrefs();
module.exports.SimplePrefs  = SimplePrefs;
