class Services {
  constructor() {
    this.obs = {notifyObservers: sinon.spy()};
  }
}

module.exports = new Services();
module.Services = Services;
