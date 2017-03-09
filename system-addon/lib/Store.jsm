"use strict";

const {utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "redux",
  "resource://activity-stream/vendor/Redux.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Reducers",
  "resource://activity-stream/common/Reducers.jsm");

function createMiddleware(subscribers) {
  return store => next => action => {
    next(action);
    subscribers.forEach(sub => {
      sub.onAction(action);
    });
  };
}

class Store {
  constructor(store) {
    this.subscribers = new Set();
    this.store = redux.createStore(
      redux.combineReducers(Reducers),
      redux.applyMiddleware(createMiddleware(this.subscribers))
    );
    this.dispatch = this.store.dispatch.bind(this.store);
    this.getState = this.store.getState.bind(this.store);
  }
  register(subscribers) {
    subscribers.forEach(subscriber => {
      subscriber.store = this.store;
      this.subscribers.add(subscriber);
    });
  }
  clear() {
    this.subscribers.clear();
  }
}

this.Store = Store;
this.EXPORTED_SYMBOLS = ["Store"];
