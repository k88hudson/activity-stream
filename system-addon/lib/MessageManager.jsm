/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* globals AboutNewTab, uuidgen, RemotePages, XPCOMUtils */

"use strict";
const {utils: Cu} = Components;

Cu.import("resource://gre/modules/RemotePageManager.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyServiceGetter(this, "uuidgen",
  "@mozilla.org/uuid-generator;1",
  "nsIUUIDGenerator");

XPCOMUtils.defineLazyModuleGetter(this, "AboutNewTab",
  "resource:///modules/AboutNewTab.jsm");

const ABOUT_NEW_TAB_URL = "about:newtab";

class MessageManager {
  constructor(pageURL) {
    this.pageURL = pageURL;
    this.MAIN_TO_CONTENT_MESSAGE_NAME = "ActivityStream:MainToContent";
    this.CONTENT_TO_MAIN_MESSAGE_NAME = "ActivityStream:ContentToMain";
    this.channel = null;
    this.targets = new Map();

    this.onMessage = this.onMessage.bind(this);
    this.onNewTabLoad = this.onNewTabLoad.bind(this);
    this.onNewTabUnload = this.onNewTabUnload.bind(this);
  }

  /**
   * onAction - This method is called by a Store instance whenever an action is fired.
   *
   * @param  {object} action Redux action
   */
  onAction(action) {
    // This section handles lifecycle methods for MessageManager.
    switch(action.type) {
      case "INIT":
        this.createChannel();
        break;
      case "UNINIT":
        this.destroyChannel();
        break;
    }

    // This section handles message routing.
    // Send to a specific target (i.e. content process) by id.
    if (action.meta && action.meta.send === this.MAIN_TO_CONTENT_MESSAGE_NAME) {
      const target = this.targets.get(action.meta.target);
      if (!target) {
        Cu.reportError(new Error("Tried to send a message to a target that was no longer around."));
        return;
      }
      target.sendAsyncMessage(this.MAIN_TO_CONTENT_MESSAGE_NAME, action);
    }
    // Send to all targets in the channel
    else if (action.meta && action.meta.broadcast === this.MAIN_TO_CONTENT_MESSAGE_NAME) {
      this.channel.sendAsyncMessage(this.MAIN_TO_CONTENT_MESSAGE_NAME, action);
    }
  }

  /**
   * getIdByTarget - Retrieve the id of a message target, if it exists in this.targets
   *
   * @param  {obj} targetObj A message target
   * @return {string} The unique id of the target, if it exists.
   */
  getIdByTarget(targetObj) {
    for (let [id, target] of this.targets) {
      if (targetObj === target) {
        return id;
      }
    }
  }

  /**
   * addTarget - Add a message target to this.targets
   *
   * @param  {object} target A message target
   * @return {string} The unique id of the target
   */
  addTarget(target) {
    const id = uuidgen.generateUUID().toString();
    this.targets.set(id, target);
    return id;
  }

  /**
   * createChannel - Create RemotePages channel to establishing message passing
   *                 between the main process and child pages
   */
  createChannel() {
    //  RemotePageManager must be disabled for about:newtab, since only one can exist at once
    if (this.pageURL === ABOUT_NEW_TAB_URL) {
      AboutNewTab.override();
    }
    this.channel = new RemotePages(this.pageURL);
    this.channel.addMessageListener("RemotePage:Load", this.onNewTabLoad);
    this.channel.addMessageListener("RemotePage:Unload", this.onNewTabUnload);
    this.channel.addMessageListener(this.CONTENT_TO_MAIN_MESSAGE_NAME, this.onMessage);
  }

  /**
   * destroyChannel - Destroys the RemotePages channel
   *
   * @return {type}  description
   */
  destroyChannel() {
    this.targets.clear();
    this.channel.destroy();
    this.channel = null;
    if (this.pageURL === ABOUT_NEW_TAB_URL) {
      AboutNewTab.reset();
    }
  }

  /**
   * onNewTabLoad - Handler for special RemotePage:Load message fired by RemotePages
   *
   * @param  {obj} msg The messsage from a page that was just loaded
   */
  onNewTabLoad(msg) {
    const target = msg.target;
    const id = this.getIdByTarget(target) || this.addTarget(target);
    this.store.dispatch({type: "NEWTAB_LOAD", data: id});
  }

  /**
   * onNewTabUnloadLoad - Handler for special RemotePage:Unload message fired by RemotePages
   *
   * @param  {obj} msg The messsage from a page that was just unloaded
   */
  onNewTabUnload(msg) {
    const target = msg.target;
    const id = this.getIdByTarget(target);
    this.targets.delete(id);
    this.store.dispatch({type: "NEWTAB_UNLOAD", data: id});
  }

  /**
   * onMessage - Handles custom messages from content. It expects all messages to
   *             be formatted as Redux actions, and dispatches them to this.store
   *
   * @param  {obj} msg A custom message from content
   * @param  {obj} msg.action A Redux action (e.g. {type: "HELLO_WORLD"})
   * @param  {obj} msg.target A message target
   */
  onMessage(msg) {
    const action = msg.data;
    if (!action || !action.type) {
      Cu.reportError(new Error("Received an action on the message channel that did not have a type."))
      return;
    }
    const meta = action.meta ? Object.assign({}, action.meta) : {};
    const id = this.getIdByTarget(target) || this.addTarget(target);
    meta.target = id;
    this.store.dispatch(Object.assign({}, action, {meta}));
  }
}

this.MessageManager = MessageManager;
this.EXPORTED_SYMBOLS = ["MessageManager"];
