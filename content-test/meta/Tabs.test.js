const {Tabs, Tab} = require("mocks/sdk/tabs");

describe("Tabs", () => {
  const tabs = new Tabs();
  const tab = new Tab();
  tab.close();
  it("should do stuff", () => {
    console.log(tab.close.called);
  });
});
