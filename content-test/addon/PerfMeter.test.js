const createPerfMeter = require("inject!../../lib/PerfMeter");
const simplePrefs = require("mocks/sdk/simple-prefs");
const {SimplePrefsMock} = simplePrefs;

const DEFAULT_OPTIONS = ["activity-streams.html"];
const PREF_NAME = "performance.log";

describe("PerfMeter", () => {
  let PerfMeter;
  let instance;
  function setup(overrides = {}, options = DEFAULT_OPTIONS) {
    PerfMeter = createPerfMeter(overrides).PerfMeter;
    instance = new PerfMeter(options);
  }

  before(() => {global.Services = {obs: {notifyObservers: () => {}}}});
  after(() => {delete global.Services;});
  beforeEach(() => setup());

  it("should set ._trackableURLs", () => {
    assert.equal(instance._trackableURLs, DEFAULT_OPTIONS);
  });

  it("should set ._active to prefs.performance.log", () => {
    const sp = new SimplePrefsMock({"performance.log": true});
    setup({"sdk/simple-prefs": sp});
    assert.isTrue(instance._active);
  });

  it("should add listener on simplePrefs for performance.log", () => {
    const sp = new SimplePrefsMock();
    setup({"sdk/simple-prefs": sp});
    assert.lengthOf(sp.listeners(PREF_NAME), 1, "should add one listener")
    assert.equal(sp.listeners(PREF_NAME)[0], instance.onPrefChange, "listener is .onPrefChange");
  });

  describe("#onOpen(tab)", () => {
    it("should add a listener to tabs/open on instantiation", () => {

    });
    it("should add tab to ._tabs", () => {

    });
    it("should add listeners for tabs/ready, tabs/close", () => {

    });
  });

  describe("#log(tab, tag, data)", () => {
    it("should do nothing if tab.url is not in ._trackableURLs", () => {

    });
    it("should do nothing if tag is not in VALID_TELEMETRY_TAGS", () => {

    });
  });


});
