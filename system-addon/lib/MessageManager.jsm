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
    this.onMessage = this.onMessage.bind(this);
    this.channel = null;
    this.targets = new Map();
  }

  onAction(action) {
    if (!action || !action.type) {
      Cu.reportError(new Error("Received an action on the message channel that did not have a type."))
      return;
    }
    // Send to a specific target
    if (action.meta && action.meta.send === "addon-to-content") {
      const target = this.targets.get(action.meta.target);
      if (!target) {
        Cu.reportError(new Error("Tried to send a message to a target that was no longer around."));
        return;
      }
      target.sendAsyncMessage("addon-to-content", action);
    }
    else if (action.meta && action.meta.broadcast === "addon-to-content") {
      this.channel.sendAsyncMessage("addon-to-content", action);
    }
    switch(action.type) {
      case "INIT":
        AboutNewTab.override();
        this.addChannel();
        break;
      case "UNINIT":
        this.removeChannel();
        AboutNewTab.restore();
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
      channel.addMessageListener("RemotePage:Load", msg => {
        const target = msg.target;
        const id = this.getIdByTarget(target) || this.addTarget(target);
        this.store.dispatch({type: "NEWTAB_LOAD", data: id});
      });
      channel.addMessageListener("RemotePage:Unload", msg => {
        const id = this.getIdByTarget(target);
        this.targets.delete(id);
        this.store.dispatch({type: "NEWTAB_UNLOAD", data: id});
      });
      channel.addMessageListener("content-to-addon", this.onMessage);
    });
  }

  removeChannel() {
    this.targets.clear();
    RemotePageManager.removeRemotePageListener(this.pageURL);
    this.channel = null;
  }

  onMessage(msg) {
    const action = msg.data;
    const meta = action.meta ? Object.assign({}, action.meta) : {};
    let id = this.getIdByTarget(target) || this.addTarget(target);
    meta.target = id;
    this.dispatch(msg.data);
  }
}

this.MessageManager = MessageManager;
this.EXPORTED_SYMBOLS = ["MessageManager"];
