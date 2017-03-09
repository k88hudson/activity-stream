/* globals uuidgen */

"use strict";
const {utils: Cu} = Components;
const {RemotePageManager} = Cu.import("resource://gre/modules/RemotePageManager.jsm");
const {XPCOMUtils} = Cu.import("resource://gre/modules/XPCOMUtils.jsm", {});

XPCOMUtils.defineLazyServiceGetter(this, "uuidgen",
  "@mozilla.org/uuid-generator;1",
  "nsIUUIDGenerator");

XPCOMUtils.defineLazyModuleGetter(this, "AboutNewTab",
  "resource:///modules/AboutNewTab.jsm");

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

  onAction(action) {
    // Send to a specific target
    if (action.meta && action.meta.send === this.MAIN_TO_CONTENT_MESSAGE_NAME) {
      const target = this.targets.get(action.meta.target);
      if (!target) {
        Cu.reportError(new Error("Tried to send a message to a target that was no longer around."));
        return;
      }
      target.sendAsyncMessage(this.MAIN_TO_CONTENT_MESSAGE_NAME, action);
    }
    else if (action.meta && action.meta.broadcast === this.MAIN_TO_CONTENT_MESSAGE_NAME) {
      this.channel.sendAsyncMessage(this.MAIN_TO_CONTENT_MESSAGE_NAME, action);
    }
    switch(action.type) {
      case "INIT":
        AboutNewTab.override();
        this.addChannel();
        break;
      case "UNINIT":
        this.removeChannel();
        AboutNewTab.reset();
        break;
    }
  }

  getIdByTarget(targetObj) {
    for (let [id, target] of this.targets) {
      if (targetObj === target) {
        return id;
      }
    }
  }

  addTarget(target) {
    const id = uuidgen.generateUUID().toString();
    this.targets.set(id, target);
    return id;
  }

  addChannel() {
    RemotePageManager.addRemotePageListener(this.pageURL, channel => {
      channel.addMessageListener("RemotePage:Load", this.onNewTabLoad);
      channel.addMessageListener("RemotePage:Unload", this.onNewTabUnload);
      channel.addMessageListener(this.CONTENT_TO_MAIN_MESSAGE_NAME, this.onMessage);
    });
  }

  removeChannel() {
    this.targets.clear();
    RemotePageManager.removeRemotePageListener(this.pageURL);
    this.channel = null;
  }

  onNewTabLoad(msg) {
    const target = msg.target;
    const id = this.getIdByTarget(target) || this.addTarget(target);
    this.store.dispatch({type: "NEWTAB_LOAD", data: id});
  }

  onNewTabUnload(msg) {
    const target = msg.target;
    const id = this.getIdByTarget(target);
    this.targets.delete(id);
    this.store.dispatch({type: "NEWTAB_UNLOAD", data: id});
  }

  onMessage(msg) {
    const action = msg.data;
    if (!action || !action.type) {
      Cu.reportError(new Error("Received an action on the message channel that did not have a type."))
      return;
    }
    const meta = action.meta ? Object.assign({}, action.meta) : {};
    let id = this.getIdByTarget(target) || this.addTarget(target);
    meta.target = id;
    this.store.dispatch(msg.data);
  }
}

this.MessageManager = MessageManager;
this.EXPORTED_SYMBOLS = ["MessageManager"];
