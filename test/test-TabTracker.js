"use strict";

const {before, after} = require("sdk/test/utils");
const tabs = require("sdk/tabs");
const ss = require("sdk/simple-storage");
const {setTimeout} = require("sdk/timers");
const {TabTracker} = require("lib/TabTracker");

const NEWTAB_URL = "resource://activity-streams/data/content/activity-streams.html#/";

exports.test_TabTracker_init = function(assert) {
  assert.deepEqual(ss.storage.tabData, {}, "tabData storage starts out empty");
};

exports.test_TabTracker_open_close_tab = function*(assert) {
  let tabClosedPromise = new Promise(resolve => {
    let onOpen = function(tab) {
      setTimeout(function() {
        tab.close(() => {
          tabs.removeListener("pageshow", onOpen);
          resolve();
        });
      }, 5000);
    };

    tabs.on("pageshow", onOpen);
  });

  assert.deepEqual(ss.storage.tabData, {}, "tabData storage starts out empty");

  tabs.open(NEWTAB_URL);

  yield tabClosedPromise;
  assert.equal(Object.keys(ss.storage.tabData).length, 1, "There was only one newtab tab");
  assert.equal(ss.storage.tabData["-3-2"].activations.length, 1, "The newtab page was only activated once");

  let secondsOpen = ss.storage.tabData["-3-2"].activations[0].totalTime;
  assert.ok(secondsOpen >= 5, "The tab should have stayed open for at least 5 seconds");
};

exports.test_TabTracker_reactivating = function*(assert) {
  let openTabs = [];

  let tabsOpenedPromise = new Promise(resolve => {
    let onOpen = function(tab) {
      openTabs.push(tab);
      if (openTabs.length == 2) {
        tabs.removeListener("pageshow", onOpen);
        resolve();
      }
    };

    tabs.on("pageshow", onOpen);
  });

  assert.deepEqual(ss.storage.tabData, {}, "tabData storage starts out empty");

  tabs.open("http://foo.com");
  tabs.open(NEWTAB_URL);

  // Wait until both tabs have opened
  yield tabsOpenedPromise;

  assert.equal(tabs.activeTab.url, NEWTAB_URL, "The newtab should be the currently active tab");

  // Activate and deactivate the newtab tab 3 times.
  let activationsGoal = 5;
  let numActivations = 0;
  let activationsPromise = new Promise(resolve => {
    tabs.on("activate", function() {
      numActivations++;
      if (numActivations == activationsGoal) {
        tabs.removeListener("activate", this);
        resolve();
      }
    });
  });

  for (let i = 0; i < openTabs.length * 3; i++) {
    openTabs[i % 2].activate();
  }
  yield activationsPromise;

  // Close both tabs.
  let tabClosedPromise = new Promise(resolve => {
    for (let i in openTabs) {
      openTabs[i].close(() => {
        if (i == openTabs.length - 1) {
          // We've closed the last tab
          resolve();
        }
      });
    }
  });

  yield tabClosedPromise;

  assert.equal(Object.keys(ss.storage.tabData).length, 1, "There was only one newtab tab");

  let key = Object.keys(ss.storage.tabData)[0];
  assert.equal(ss.storage.tabData[key].activations.length, 3, "The newtab page was activated 3 times");
};

before(exports, function() {
  TabTracker.init();
});

after(exports, function() {
  ss.storage = {};
  TabTracker.uninit();
});

require("sdk/test").run(exports);
