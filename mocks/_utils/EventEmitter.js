class EventEmitter {
  constructor() {
    this.on = sinon.spy();
    this.removeListener = sinon.spy();
  }
}

module.exports = EventEmitter;
