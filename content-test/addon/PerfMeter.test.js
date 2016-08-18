const createPerfMeter = require("inject!addon/PerfMeter");
const {SimplePrefs} = require("mocks/sdk/simple-prefs");
const simplePrefs = require("sdk/simple-prefs");

const {Tabs, Tab} = require("mocks/sdk/tabs");
const {defineGlobals} = require("test/test-utils");
const DEFAULT_OPTIONS = ["activity-streams.html"];
const PREF_NAME = "performance.log";

describe("PerfMeter", () => {
  let PerfMeter;
  let instance;
  function setup(overrides = {}, options = DEFAULT_OPTIONS) {
    PerfMeter = createPerfMeter(overrides).PerfMeter;
    instance = new PerfMeter(options);
  }
  defineGlobals({Services: {obs: {notifyObservers: () => {}}}});
  beforeEach(() => setup());
  afterEach(() => instance.uninit());

  it("should set ._trackableURLs", () => {
    assert.equal(instance._trackableURLs, DEFAULT_OPTIONS);
  });

  it("should set ._active to prefs.performance.log", () => {
    const simplePrefs = new SimplePrefs({"performance.log": true});
    setup({"sdk/simple-prefs": simplePrefs});
    assert.isTrue(instance._active);
  });

  it("should add listener on simplePrefs for performance.log", () => {
    const simplePrefs = new SimplePrefs();
    setup({"sdk/simple-prefs": simplePrefs});
    assert.ok(simplePrefs.on.calledWith(PREF_NAME, instance.onPrefChange));
  });

  describe("#onOpen(tab)", () => {
    let tabs;
    let tab;
    beforeEach(() => {
      // Use custom tab instances for these tests, so we can hook into events
      tab = new Tab();
      tabs = new Tabs();
      setup({"sdk/tabs": tabs});
    });
    it("should add a listener to tabs/open on instantiation", () => {
      assert.ok(tabs.on.calledWith("open", instance.onOpen));
    });
    it("should add tab to ._tabs", () => {
      instance.onOpen(tab);
      assert.property(instance._tabs, tab.id, "should add tab.id to ._tabs");
      assert.equal(instance._tabs[tab.id].tab, tab);
    });
    it("should add listeners for onReady, onClose", () => {
      instance.onOpen(tab);
      assert.ok(tab.on.calledWith("ready", instance.onReady));
      assert.ok(tab.on.calledWith("close", instance.onClose));
    });
  });
});
