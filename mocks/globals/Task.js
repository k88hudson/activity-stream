const co = require("co");

// This is not a mock, it actually a shim for Task.jsm.
// co.spawn and co.async have equivalent functionality to co and co.wrap respectively
module.exports = {
  spawn: co,
  async: co.wrap
};
