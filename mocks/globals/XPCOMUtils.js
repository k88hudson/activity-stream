class XPCOMUtils {
  constructor() {
    // methods
    this.defineLazyModuleGetter = sinon.spy();
  }
}

module.exports = new XPCOMUtils();
module.XPCOMUtils = XPCOMUtils;
