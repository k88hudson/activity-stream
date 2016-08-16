describe("PerfMeter", () => {
  it("should mock sdk/tabs", () => {
    const open = sinon.spy();
    const Mocks = require("inject!./Mocks.fixture")({
      "sdk/tabs": {open}
    });
    Mocks.init();
    assert.isTrue(open.called);
  });
});
