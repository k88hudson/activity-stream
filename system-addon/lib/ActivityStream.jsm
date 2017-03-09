/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {utils: Cu} = Components;
const {createStore} = Cu.import("resource://activity-stream/lib/Store.jsm", {});
const {FeedController} = Cu.import("resource://activity-stream/lib/FeedController.jsm", {});

class ActivityStream {

  /**
   * constructor - Initializes an instance of ActivityStream
   *
   * @param  {object} options Options for the ActivityStream instance
   * @param  {string} options.id Add-on ID. e.g. "activity-stream@mozilla.org".
   * @param  {string} options.version Version of the add-on. e.g. "0.1.0"
   * @param  {string} options.newTabURL URL of New Tab page on which A.S. is displayed. e.g. "about:newtab"
   */
  constructor(options) {
    this.initialized = false;
    this.options = options;
    this.store = null;
    this.fc = null;
  }
  init() {
    this.initialized = true;
    this.store = createStore();
    this.fc = new FeedController(this.store);
    this.store.dispatch({type: "INIT"});
  }
  uninit() {
    this.store.dispatch({type: "UNINIT"});
    this.store = null;
    this.fc = null;
    this.initialized = false;
  }
}

this.EXPORTED_SYMBOLS = ["ActivityStream"];
