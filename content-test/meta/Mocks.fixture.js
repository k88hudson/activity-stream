const {Cu} = require("chrome");

Cu.import("foo");
exports.Test = () => {
  Cu.import("bar");
};
