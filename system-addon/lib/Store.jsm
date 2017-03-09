"use strict";

const {utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "redux",
  "resource://activity-stream/vendor/Redux.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Reducers",
  "resource://activity-stream/common/Reducers.jsm");

class Store {
  constructor() {
    constructor(store) {
      this.store = redux.createStore(redux.combineReducers(Reducers));
      this.subscribers = new Set();
      this.store.subscribe(action => this.subscribers.forEach(s => s.onAction(action)));
    }
    register(subscriber) {
      subscriber.store = this.store;
      this.subscribers.add(subscribers);
    }
    clear() {
      this.subscribers.clear();
    }
  }
}

this.Store = Store;
this.EXPORTED_SYMBOLS = ["Store"];
