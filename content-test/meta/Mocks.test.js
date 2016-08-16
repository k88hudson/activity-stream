const {assert} = require("chai");
const {Test} = require("./Mocks.fixture");
const chrome = require("mocks/chrome");

describe("PerfMeter", () => {
  it("should be a thing", () => {
    Test();
    chrome.Cu.import = (str) => console.log(str);
    Test();
  });
});
