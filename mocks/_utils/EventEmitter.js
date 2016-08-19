class EventEmitter {
  constructor() {
    this.on = sinon.spy();
    this.off = sinon.spy();
  }
}

module.exports = EventEmitter;
