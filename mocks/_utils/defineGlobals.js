module.exports = shims => {
  const cachedValues = {};
  before(() => {
    Object.keys(shims).forEach(key => {
      cachedValues[key] = global[key];
      global[key] = shims[key];
    });
  });
  after(() => {
    Object.keys(shims).forEach(key => {
      if (typeof cachedValues[key] !== "undefined") {
        global[key] = cachedValues[key];
      } else {
        delete global[key];
      }
    });
  });
};
