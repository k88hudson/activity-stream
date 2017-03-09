"use strict";

const {utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const {redux} = Cu.import("resource://activity-stream/vendor/Redux.jsm", {});
const {Reducers} = Cu.import("resource://activity-stream/common/Reducers", {});

function createStore() {
  return redux.createStore(f => f);
}

this.EXPORTED_SYMBOLS = ["createStore"];
