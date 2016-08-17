const EventEmitter = require("eventemitter2");
const faker = require("faker");

/**
 * Tab
 * This is a mock for an individual tab. It will generate plausable
 * properties (e.g. id, title, etc.) You may pass it custom properties
 * if you wish
 */
class Tab extends EventEmitter {
  constructor(custom = {}) {
    super();
    const props = Object.assign({
      id: faker.random.uuid(),
      title: faker.hacker.phrase(),
      url: faker.internet.url(),
      favicon: faker.image.imageUrl(),
      contentType: "text/html",
      index: 0,
      isPinned: false,
      window: {},
      readyState: "complete"
    }, custom);
    Object.keys(props).forEach(key => this[key] = props[key]);
  }
  pin() {}
  unpin() {}
  open() {}
  close() {}
  reload() {}
  activate() {}
  getThumbnail() {}
  attach() {}
}


/**
 * Tabs
 * This is the mock for what gets returned from sdk/tabs
 */
class Tabs extends EventEmitter {
  constructor() {
    const firstTab = new Tab();
    super();
    this._tabs = new Set([firstTab]);
    this._activeTab = firstTab;
  }
  get activeTab() {
    return this._activeTab;
  }
  get length() {
    return this._tabs.length;
  }
  open() {}
}

module.exports = new Tabs();
module.exports.Tabs = Tabs;
module.exports.Tab = Tab;
