const createPerfMeter = require("inject!addon/PerfMeter");
const {SimplePrefs} = require("mocks/sdk/simple-prefs");
const {Tabs, Tab} = require("mocks/sdk/tabs");

const DEFAULT_OPTIONS = ["activity-streams.html"];
const PREF_NAME = "performance.log";

describe("PerfMeter", () => {
  let PerfMeter;
  let instance;
  function setup(overrides = {}, options = DEFAULT_OPTIONS) {
    PerfMeter = createPerfMeter(overrides).PerfMeter;
    instance = new PerfMeter(options);
  }
  function teardown() {
    instance.uninit();
  }

  before(() => {global.Services = {obs: {notifyObservers: () => {}}}});
  after(() => {delete global.Services;});
  beforeEach(() => setup());
  afterEach(() => teardown());

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
    assert.lengthOf(simplePrefs.listeners(PREF_NAME), 1, "should add one listener")
    assert.equal(simplePrefs.listeners(PREF_NAME)[0], instance.onPrefChange, "listener is .onPrefChange");
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
      assert.lengthOf(tabs.listeners("open"), 1, "should add one listener");
    });
    it("should add tab to ._tabs", () => {
      tabs.emit("open", tab);

      assert.property(instance._tabs, tab.id, "should add tab.id to ._tabs");
      assert.equal(instance._tabs[tab.id].tab, tab);
    });
    it("should add listeners for onReady, onClose", () => {
      tabs.emit("open", tab);

      assert.lengthOf(tab.listeners("ready"), 1, "should add a onReady listener");
      assert.lengthOf(tab.listeners("close"), 1, "should add a onClose listener");
    });
  });
});
