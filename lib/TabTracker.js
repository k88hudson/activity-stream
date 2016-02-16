const tabs = require("sdk/tabs");
const ss = require("sdk/simple-storage");

const NEWTAB_URL = "resource://activity-streams/data/content/activity-streams.html#/";

const TabTracker = {
  _openTabs: [],

  init: function() {
    this.onOpen = this.onOpen.bind(this);
    tabs.on("open", this.onOpen);
    if (!ss.storage.tabData) {
      ss.storage.tabData = {};
    }
  },

  uninit: function() {
    for (let i in this._openTabs) {
      let tab = this._openTabs[i];
      tab.removeListener("pageshow", this.logShow);
      tab.removeListener("activate", this.logActivate);
      tab.removeListener("deactivate", this.logDeactivate);
      tab.removeListener("close", this.logClose);
    }
    tabs.removeListener("open", TabTracker.onOpen);
  },

  navigateAwayFromNewtab: function(tab) {
    if (!ss.storage.tabData[tab.id]) {
      // We're navigating away from a newtab that didn't even load yet.
      // Let's say it's been active for 0 seconds.
      ss.storage.tabData[tab.id] = {activations: [{startTime: Date.now(), totalTime: 0}]};
      return;
    }
    let activations = ss.storage.tabData[tab.id].activations;
    let lastElement = activations[activations.length - 1];
    if (lastElement.startTime && !lastElement.totalTime) {
      lastElement.totalTime = (Date.now() - lastElement.startTime) / 1000;
    }
  },

  logShow: function(tab) {
    if (tab.url == NEWTAB_URL) {
      ss.storage.tabData[tab.id] = {
        activations: [{startTime: Date.now()}]
      };
      return;
    }
    // We loaded a URL other than our newtab. If this tab had our newtab
    // open before, then update its state.
    if (ss.storage.tabData[tab.id]) {
      this.navigateAwayFromNewtab(tab);
    }
  },

  logActivate: function(tab) {
    if (tab.url == NEWTAB_URL) {
      ss.storage.tabData[tab.id].activations.push({startTime: Date.now()});
    }
  },

  logDeactivate: function(tab) {
    if (tab.url == NEWTAB_URL) {
      this.navigateAwayFromNewtab(tab);
    }
  },

  logClose: function(tab) {
    if (tab.url == NEWTAB_URL) {
      this.navigateAwayFromNewtab(tab);
    }
  },

  onOpen: function(tab) {
    this._openTabs.push(tab);

    this.logShow = this.logShow.bind(this);
    this.logActivate = this.logActivate.bind(this);
    this.logDeactivate = this.logDeactivate.bind(this);
    this.logClose = this.logClose.bind(this);

    tab.on("pageshow", this.logShow);
    tab.on("activate", this.logActivate);
    tab.on("deactivate", this.logDeactivate);
    tab.on("close", this.logClose);
  },
};

exports.TabTracker = TabTracker;
