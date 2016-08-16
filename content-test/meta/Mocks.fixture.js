const {Cu} = require("chrome");
const tabs = require("sdk/tabs");
const simpleStorage = require("sdk/simple-storage");

Cu.import("foo");

exports.init = () => {
  tabs.open();
};
