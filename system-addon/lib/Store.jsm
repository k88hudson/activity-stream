"use strict";

const {utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "redux",
  "resource://activity-stream/vendor/Redux.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Reducers",
  "resource://activity-stream/common/Reducers.jsm");

function createStore() {
  return redux.createStore(redux.combineReducers(Reducers));
}

this.createStore = createStore;
this.EXPORTED_SYMBOLS = ["createStore"];
