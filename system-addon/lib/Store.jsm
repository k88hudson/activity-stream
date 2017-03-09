"use strict";

const {utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const {redux} = Cu.import("resource://activity-stream/vendor/Redux.jsm", {});

XPCOMUtils.defineLazyModuleGetter(this, "Reducers",
  "resource://activity-stream/common/Reducers.jsm");

function createStore() {
  return redux.createStore(redux.combineReducers(Reducers));
}

this.EXPORTED_SYMBOLS = ["createStore"];
