/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
ChromeUtils.import("resource:///modules/UITour.jsm");
XPCOMUtils.defineLazyGlobalGetters(this, ["fetch"]);
const {ASRouterActions: ra, actionCreators: ac} = ChromeUtils.import("resource://activity-stream/common/Actions.jsm", {});
const {OnboardingMessageProvider} = ChromeUtils.import("resource://activity-stream/lib/OnboardingMessageProvider.jsm", {});

ChromeUtils.defineModuleGetter(this, "ASRouterTargeting",
  "resource://activity-stream/lib/ASRouterTargeting.jsm");
ChromeUtils.defineModuleGetter(this, "ASRouterTriggerListeners",
  "resource://activity-stream/lib/ASRouterTriggerListeners.jsm");

const INCOMING_MESSAGE_NAME = "ASRouter:child-to-parent";
const OUTGOING_MESSAGE_NAME = "ASRouter:parent-to-child";
const MESSAGE_PROVIDER_PREF = "browser.newtabpage.activity-stream.asrouter.messageProviders";
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
// List of hosts for endpoints that serve router messages.
// Key is allowed host, value is a name for the endpoint host.
const DEFAULT_WHITELIST_HOSTS = {
  "activity-stream-icons.services.mozilla.com": "production",
  "snippets-admin.mozilla.org": "preview"
};
const SNIPPETS_ENDPOINT_WHITELIST = "browser.newtab.activity-stream.asrouter.whitelistHosts";
// Max possible impressions cap for any message
const MAX_MESSAGE_LIFETIME_CAP = 100;

const LOCAL_MESSAGE_PROVIDERS = {OnboardingMessageProvider};
const STARTPAGE_VERSION = "0.1.0";

const MessageLoaderUtils = {
  /**
   * _localLoader - Loads messages for a local provider (i.e. one that lives in mozilla central)
   *
   * @param {obj} provider An AS router provider
   * @param {Array} provider.messages An array of messages
   * @returns {Array} the array of messages
   */
  _localLoader(provider) {
    return provider.messages;
  },

  /**
   * _remoteLoader - Loads messages for a remote provider
   *
   * @param {obj} provider An AS router provider
   * @param {string} provider.url An endpoint that returns an array of messages as JSON
   * @returns {Promise} resolves with an array of messages, or an empty array if none could be fetched
   */
  async _remoteLoader(provider) {
    let remoteMessages = [];
    if (provider.url) {
      try {
        const response = await fetch(provider.url);
        if (
          // Empty response
          response.status !== 204 &&
          (response.ok || response.status === 302)
        ) {
          remoteMessages = (await response.json())
            .messages
            .map(msg => ({...msg, provider_url: provider.url}));
        }
      } catch (e) {
        Cu.reportError(e);
      }
    }
    return remoteMessages;
  },

  /**
   * _getMessageLoader - return the right loading function given the provider's type
   *
   * @param {obj} provider An AS Router provider
   * @returns {func} A loading function
   */
  _getMessageLoader(provider) {
    switch (provider.type) {
      case "remote":
        return this._remoteLoader;
      case "local":
      default:
        return this._localLoader;
    }
  },

  /**
   * shouldProviderUpdate - Given the current time, should a provider update its messages?
   *
   * @param {any} provider An AS Router provider
   * @param {int} provider.updateCycleInMs The number of milliseconds we should wait between updates
   * @param {Date} provider.lastUpdated If the provider has been updated, the time the last update occurred
   * @param {Date} currentTime The time we should check against. (defaults to Date.now())
   * @returns {bool} Should an update happen?
   */
  shouldProviderUpdate(provider, currentTime = Date.now()) {
    return (!(provider.lastUpdated >= 0) || currentTime - provider.lastUpdated > provider.updateCycleInMs);
  },

  /**
   * loadMessagesForProvider - Load messages for a provider, given the provider's type.
   *
   * @param {obj} provider An AS Router provider
   * @param {string} provider.type An AS Router provider type (defaults to "local")
   * @returns {obj} Returns an object with .messages (an array of messages) and .lastUpdated (the time the messages were updated)
   */
  async loadMessagesForProvider(provider) {
    const messages = (await this._getMessageLoader(provider)(provider))
        .map(msg => ({...msg, provider: provider.id}));
    const lastUpdated = Date.now();
    return {messages, lastUpdated};
  },

  async installAddonFromURL(browser, url) {
    try {
      const aUri = Services.io.newURI(url);
      const systemPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
      const install = await AddonManager.getInstallForURL(aUri.spec, "application/x-xpinstall");
      await AddonManager.installAddonFromWebpage("application/x-xpinstall", browser,
        systemPrincipal, install);
    } catch (e) {}
  }
};

this.MessageLoaderUtils = MessageLoaderUtils;

/**
 * @class _ASRouter - Keeps track of all messages, UI surfaces, and
 * handles blocking, rotation, etc. Inspecting ASRouter.state will
 * tell you what the current displayed message is in all UI surfaces.
 *
 * Note: This is written as a constructor rather than just a plain object
 * so that it can be more easily unit tested.
 */
class _ASRouter {
  constructor(messageProviderPref = MESSAGE_PROVIDER_PREF, localProviders = LOCAL_MESSAGE_PROVIDERS) {
    this.initialized = false;
    this.messageChannel = null;
    this.dispatchToAS = null;
    this._storage = null;
    this._resetInitialization();
    this._state = {
      lastMessageId: null,
      providers: [],
      messageBlockList: [],
      providerBlockList: [],
      messageImpressions: {},
      providerImpressions: {},
      messages: []
    };
    this._triggerHandler = this._triggerHandler.bind(this);
    this._messageProviderPref = messageProviderPref;
    this._localProviders = localProviders;
    this.onMessage = this.onMessage.bind(this);
    this._handleTargetingError = this._handleTargetingError.bind(this);
  }

  // Update message providers and fetch new messages on pref change
  async observe(aSubject, aTopic, aPrefName) {
    if (aPrefName === this._messageProviderPref) {
      this._updateMessageProviders();
    }

    await this.loadMessagesFromAllProviders();
  }

  // Fetch and decode the message provider pref JSON, and update the message providers
  _updateMessageProviders() {
    // If we have added a `preview` provider, hold onto it
    const existingPreviewProvider = this.state.providers.find(p => p.id === "preview");
    const providers = existingPreviewProvider ? [existingPreviewProvider] : [];
    const providersJSON = Services.prefs.getStringPref(this._messageProviderPref, "");
    try {
      JSON.parse(providersJSON).forEach(provider => {
        if (provider.enabled) {
          providers.push(provider);
        }
      });
    } catch (e) {
      Cu.reportError("Problem parsing JSON message provider pref for ASRouter");
    }

    providers.forEach(provider => {
      if (provider.type === "local" && !provider.messages) {
        // Get the messages from the local message provider
        const localProvider = this._localProviders[provider.localProvider];
        provider.messages = localProvider ? localProvider.getMessages() : [];
      }
      if (provider.type === "remote" && provider.url) {
        provider.url = provider.url.replace(/%STARTPAGE_VERSION%/g, STARTPAGE_VERSION);
        provider.url = Services.urlFormatter.formatURL(provider.url);
      }
      // Reset provider update timestamp to force message refresh
      provider.lastUpdated = undefined;
    });

    const providerIDs = providers.map(p => p.id);
    this.setState(prevState => ({
      providers,
      // Clear any messages from removed providers
      messages: [...prevState.messages.filter(message => providerIDs.includes(message.provider))]
    }));
  }

  get state() {
    return this._state;
  }

  set state(value) {
    throw new Error("Do not modify this.state directy. Instead, call this.setState(newState)");
  }

  /**
   * _resetInitialization - adds the following to the instance:
   *  .initialized {bool}            Has AS Router been initialized?
   *  .waitForInitialized {Promise}  A promise that resolves when initializion is complete
   *  ._finishInitializing {func}    A function that, when called, resolves the .waitForInitialized
   *                                 promise and sets .initialized to true.
   * @memberof _ASRouter
   */
  _resetInitialization() {
    this.initialized = false;
    this.waitForInitialized = new Promise(resolve => {
      this._finishInitializing = () => {
        this.initialized = true;
        resolve();
      };
    });
  }

  /**
   * loadMessagesFromAllProviders - Loads messages from all providers if they require updates.
   *                                Checks the .lastUpdated field on each provider to see if updates are needed
   * @memberof _ASRouter
   */
  async loadMessagesFromAllProviders() {
    const needsUpdate = this.state.providers.filter(provider => MessageLoaderUtils.shouldProviderUpdate(provider));
    // Don't do extra work if we don't need any updates
    if (needsUpdate.length) {
      let newState = {messages: [], providers: []};
      for (const provider of this.state.providers) {
        if (needsUpdate.includes(provider)) {
          const {messages, lastUpdated} = await MessageLoaderUtils.loadMessagesForProvider(provider);
          newState.providers.push({...provider, lastUpdated});
          newState.messages = [...newState.messages, ...messages];
        } else {
          // Skip updating this provider's messages if no update is required
          let messages = this.state.messages.filter(msg => msg.provider === provider.id);
          newState.providers.push(provider);
          newState.messages = [...newState.messages, ...messages];
        }
      }

      // Some messages have triggers that require us to initalise trigger listeners
      const unseenListeners = new Set(ASRouterTriggerListeners.keys());
      for (const {trigger} of newState.messages) {
        if (trigger && ASRouterTriggerListeners.has(trigger.id)) {
          ASRouterTriggerListeners.get(trigger.id).init(this._triggerHandler, trigger.params);
          unseenListeners.delete(trigger.id);
        }
      }
      // We don't need these listeners, but they may have previously been
      // initialised, so uninitialise them
      for (const triggerID of unseenListeners) {
        ASRouterTriggerListeners.get(triggerID).uninit();
      }

      // We don't want to cache preview endpoints, remove them after messages are fetched
      await this.setState(this._removePreviewEndpoint(newState));
      await this.cleanupImpressions();
    }
  }

  /**
   * init - Initializes the MessageRouter.
   * It is ready when it has been connected to a RemotePageManager instance.
   *
   * @param {RemotePageManager} channel a RemotePageManager instance
   * @param {obj} storage an AS storage instance
   * @param {func} dispatchToAS dispatch an action the main AS Store
   * @memberof _ASRouter
   */
  async init(channel, storage, dispatchToAS) {
    this.messageChannel = channel;
    this.messageChannel.addMessageListener(INCOMING_MESSAGE_NAME, this.onMessage);
    Services.prefs.addObserver(this._messageProviderPref, this);
    this._storage = storage;
    this.WHITELIST_HOSTS = this._loadSnippetsWhitelistHosts();
    this.dispatchToAS = dispatchToAS;

    const messageBlockList = await this._storage.get("messageBlockList") || [];
    const providerBlockList = await this._storage.get("providerBlockList") || [];
    const messageImpressions = await this._storage.get("messageImpressions") || {};
    const providerImpressions = await this._storage.get("providerImpressions") || {};
    await this.setState({messageBlockList, providerBlockList, messageImpressions, providerImpressions});
    this._updateMessageProviders();
    await this.loadMessagesFromAllProviders();

    // sets .initialized to true and resolves .waitForInitialized promise
    this._finishInitializing();
  }

  uninit() {
    this.messageChannel.sendAsyncMessage(OUTGOING_MESSAGE_NAME, {type: "CLEAR_ALL"});
    this.messageChannel.removeMessageListener(INCOMING_MESSAGE_NAME, this.onMessage);
    this.messageChannel = null;
    this.dispatchToAS = null;
    Services.prefs.removeObserver(this._messageProviderPref, this);
    // Uninitialise all trigger listeners
    for (const listener of ASRouterTriggerListeners.values()) {
      listener.uninit();
    }
    this._resetInitialization();
  }

  setState(callbackOrObj) {
    const newState = (typeof callbackOrObj === "function") ? callbackOrObj(this.state) : callbackOrObj;
    this._state = {...this.state, ...newState};
    return new Promise(resolve => {
      this._onStateChanged(this.state);
      resolve();
    });
  }

  getMessageById(id) {
    return this.state.messages.find(message => message.id === id);
  }

  _onStateChanged(state) {
    this.messageChannel.sendAsyncMessage(OUTGOING_MESSAGE_NAME, {type: "ADMIN_SET_STATE", data: state});
  }

  _handleTargetingError(type, error, message) {
    Cu.reportError(error);
    if (this.dispatchToAS) {
      this.dispatchToAS(ac.ASRouterUserEvent({
        message_id: message.id,
        action: "asrouter_undesired_event",
        event: "TARGETING_EXPRESSION_ERROR",
        value: type
      }));
    }
  }

  _findMessage(candidateMessages, trigger) {
    const messages = candidateMessages.filter(m => this.isBelowFrequencyCaps(m));

     // Find a message that matches the targeting context as well as the trigger context (if one is provided)
     // If no trigger is provided, we should find a message WITHOUT a trigger property defined.
    return ASRouterTargeting.findMatchingMessage({messages, trigger, onError: this._handleTargetingError});
  }

  _orderBundle(bundle) {
    return bundle.sort((a, b) => a.order - b.order);
  }

  // Work out if a message can be shown based on its and its provider's frequency caps.
  isBelowFrequencyCaps(message) {
    const {providers, messageImpressions, providerImpressions} = this.state;

    const provider = providers.find(p => p.id === message.provider);
    const impressionsForMessage = messageImpressions[message.id];
    const impressionsForProvider = providerImpressions[message.provider];

    return (this._isBelowItemFrequencyCap(message, impressionsForMessage, MAX_MESSAGE_LIFETIME_CAP) &&
      this._isBelowItemFrequencyCap(provider, impressionsForProvider));
  }

  // Helper for isBelowFrecencyCaps - work out if the frequency cap for the given
  //                                  item has been exceeded or not
  _isBelowItemFrequencyCap(item, impressions, maxLifetimeCap = Infinity) {
    if (item && item.frequency && impressions && impressions.length) {
      if (
        item.frequency.lifetime &&
        impressions.length >= Math.min(item.frequency.lifetime, maxLifetimeCap)
      ) {
        return false;
      }
      if (item.frequency.custom) {
        const now = Date.now();
        for (const setting of item.frequency.custom) {
          let {period} = setting;
          if (period === "daily") {
            period = ONE_DAY_IN_MS;
          }
          const impressionsInPeriod = impressions.filter(t => (now - t) < period);
          if (impressionsInPeriod.length >= setting.cap) {
            return false;
          }
        }
      }
    }
    return true;
  }

  async _getBundledMessages(originalMessage, target, trigger, force = false) {
    let result = [{content: originalMessage.content, id: originalMessage.id, order: originalMessage.order || 0}];

    // First, find all messages of same template. These are potential matching targeting candidates
    let bundledMessagesOfSameTemplate = this._getUnblockedMessages()
                                          .filter(msg => msg.bundled && msg.template === originalMessage.template && msg.id !== originalMessage.id);

    if (force) {
      // Forcefully show the messages without targeting matching - this is for about:newtab#asrouter to show the messages
      for (const message of bundledMessagesOfSameTemplate) {
        result.push({content: message.content, id: message.id});
        // Stop once we have enough messages to fill a bundle
        if (result.length === originalMessage.bundled) {
          break;
        }
      }
    } else {
      while (bundledMessagesOfSameTemplate.length) {
        // Find a message that matches the targeting context - or break if there are no matching messages
        const message = await this._findMessage(bundledMessagesOfSameTemplate, trigger);
        if (!message) {
          /* istanbul ignore next */ // Code coverage in mochitests
          break;
        }
        // Only copy the content of the message (that's what the UI cares about)
        // Also delete the message we picked so we don't pick it again
        result.push({content: message.content, id: message.id, order: message.order || 0});
        bundledMessagesOfSameTemplate.splice(bundledMessagesOfSameTemplate.findIndex(msg => msg.id === message.id), 1);
        // Stop once we have enough messages to fill a bundle
        if (result.length === originalMessage.bundled) {
          break;
        }
      }
    }

    // If we did not find enough messages to fill the bundle, do not send the bundle down
    if (result.length < originalMessage.bundled) {
      return null;
    }

    return {bundle: this._orderBundle(result), provider: originalMessage.provider, template: originalMessage.template};
  }

  _getUnblockedMessages() {
    let {state} = this;
    return state.messages.filter(item =>
      !state.messageBlockList.includes(item.id) &&
      !state.providerBlockList.includes(item.provider)
    );
  }

  async _sendMessageToTarget(message, target, trigger, force = false) {
    let bundledMessages;
    // If this message needs to be bundled with other messages of the same template, find them and bundle them together
    if (message && message.bundled) {
      bundledMessages = await this._getBundledMessages(message, target, trigger, force);
    }
    if (message && !message.bundled) {
      // If we only need to send 1 message, send the message
      target.sendAsyncMessage(OUTGOING_MESSAGE_NAME, {type: "SET_MESSAGE", data: message});
    } else if (bundledMessages) {
      // If the message we want is bundled with other messages, send the entire bundle
      target.sendAsyncMessage(OUTGOING_MESSAGE_NAME, {type: "SET_BUNDLED_MESSAGES", data: bundledMessages});
    } else {
      target.sendAsyncMessage(OUTGOING_MESSAGE_NAME, {type: "CLEAR_ALL"});
    }
  }

  async addImpression(message) {
    const provider = this.state.providers.find(p => p.id === message.provider);
    // We only need to store impressions for messages that have frequency, or
    // that have providers that have frequency
    if (message.frequency || (provider && provider.frequency)) {
      const time = Date.now();
      await this.setState(state => {
        const messageImpressions = this._addImpressionForItem(state, message, "messageImpressions", time);
        const providerImpressions = this._addImpressionForItem(state, provider, "providerImpressions", time);
        return {messageImpressions, providerImpressions};
      });
    }
  }

  // Helper for addImpression - calculate the updated impressions object for the given
  //                            item, then store it and return it
  _addImpressionForItem(state, item, impressionsString, time) {
    // The destructuring here is to avoid mutating existing objects in state as in redux
    // (see https://redux.js.org/recipes/structuring-reducers/prerequisite-concepts#immutable-data-management)
    const impressions = {...state[impressionsString]};
    if (item.frequency) {
      impressions[item.id] = impressions[item.id] ? [...impressions[item.id]] : [];
      impressions[item.id].push(time);
      this._storage.set(impressionsString, impressions);
    }
    return impressions;
  }

  /**
   * getLongestPeriod
   *
   * @param {obj} message An ASRouter message
   * @returns {int|null} if the message has custom frequency caps, the longest period found in the list of caps.
                         if the message has no custom frequency caps, null
   * @memberof _ASRouter
   */
  getLongestPeriod(message) {
    if (!message.frequency || !message.frequency.custom) {
      return null;
    }
    return message.frequency.custom.sort((a, b) => b.period - a.period)[0].period;
  }

  /**
   * cleanupImpressions - this function cleans up obsolete impressions whenever
   * messages are refreshed or fetched. It will likely need to be more sophisticated in the future,
   * but the current behaviour for when both message impressions and provider impressions are
   * cleared is as follows (where `item` is either `message` or `provider`):
   *
   * 1. If the item id for a list of item impressions no longer exists in the ASRouter state, it
   *    will be cleared.
   * 2. If the item has time-bound frequency caps but no lifetime cap, any item impressions older
   *    than the longest time period will be cleared.
   */
  async cleanupImpressions() {
    await this.setState(state => {
      const messageImpressions = this._cleanupImpressionsForItems(state, state.messages, "messageImpressions");
      const providerImpressions = this._cleanupImpressionsForItems(state, state.providers, "providerImpressions");
      return {messageImpressions, providerImpressions};
    });
  }

  // Helper for cleanupImpressions - calculate the updated impressions object for
  //                                 the given items, then store it and return it
  _cleanupImpressionsForItems(state, items, impressionsString) {
    const impressions = {...state[impressionsString]};
    let needsUpdate = false;
    Object.keys(impressions).forEach(id => {
      const [item] = items.filter(x => x.id === id);
      // Don't keep impressions for items that no longer exist
      if (!item || !item.frequency || !Array.isArray(impressions[id])) {
        delete impressions[id];
        needsUpdate = true;
        return;
      }
      if (!impressions[id].length) {
        return;
      }
      // If we don't want to store impressions older than the longest period
      if (item.frequency.custom && !item.frequency.lifetime) {
        const now = Date.now();
        impressions[id] = impressions[id].filter(t => (now - t) < this.getLongestPeriod(item));
        needsUpdate = true;
      }
    });
    if (needsUpdate) {
      this._storage.set(impressionsString, impressions);
    }
    return impressions;
  }

  async sendNextMessage(target, trigger) {
    const msgs = this._getUnblockedMessages();
    let message = null;
    const previewMsgs = this.state.messages.filter(item => item.provider === "preview");
    // Always send preview messages when available
    if (previewMsgs.length) {
      [message] = previewMsgs;
    } else {
      message = await this._findMessage(msgs, trigger);
    }

    if (previewMsgs.length) {
      // We don't want to cache preview messages, remove them after we selected the message to show
      await this.setState(state => ({
        lastMessageId: message.id,
        messages: state.messages.filter(m => m.id !== message.id)
      }));
    } else {
      await this.setState({lastMessageId: message ? message.id : null});
    }
    await this._sendMessageToTarget(message, target, trigger);
  }

  async setMessageById(id, target, force = true, action = {}) {
    await this.setState({lastMessageId: id});
    const newMessage = this.getMessageById(id);

    await this._sendMessageToTarget(newMessage, target, force, action.data);
  }

  async blockMessageById(idOrIds) {
    const idsToBlock = Array.isArray(idOrIds) ? idOrIds : [idOrIds];

    await this.setState(state => {
      const messageBlockList = [...state.messageBlockList, ...idsToBlock];
      // When a message is blocked, its impressions should be cleared as well
      const messageImpressions = {...state.messageImpressions};
      idsToBlock.forEach(id => delete messageImpressions[id]);
      this._storage.set("messageBlockList", messageBlockList);
      return {messageBlockList, messageImpressions};
    });
  }

  async blockProviderById(idOrIds) {
    const idsToBlock = Array.isArray(idOrIds) ? idOrIds : [idOrIds];

    await this.setState(state => {
      const providerBlockList = [...state.providerBlockList, ...idsToBlock];
      // When a provider is blocked, its impressions should be cleared as well
      const providerImpressions = {...state.providerImpressions};
      idsToBlock.forEach(id => delete providerImpressions[id]);
      this._storage.set("providerBlockList", providerBlockList);
      return {providerBlockList, providerImpressions};
    });
  }

  openLinkIn(url, target, {isPrivate = false, trusted = false, where = ""}) {
    const win = target.browser.ownerGlobal;
    const params = {
      private: isPrivate,
      triggeringPrincipal: Services.scriptSecurityManager.createNullPrincipal({})
    };
    if (trusted) {
      win.openTrustedLinkIn(url, where);
    } else {
      win.openLinkIn(url, where, params);
    }
  }

  _validPreviewEndpoint(url) {
    try {
      const endpoint = new URL(url);
      if (!this.WHITELIST_HOSTS[endpoint.host]) {
        Cu.reportError(`The preview URL host ${endpoint.host} is not in the whitelist.`);
      }
      if (endpoint.protocol !== "https:") {
        Cu.reportError("The URL protocol is not https.");
      }
      return (endpoint.protocol === "https:" && this.WHITELIST_HOSTS[endpoint.host]);
    } catch (e) {
      return false;
    }
  }

  _loadSnippetsWhitelistHosts() {
    let additionalHosts = [];
    const whitelistPrefValue = Services.prefs.getStringPref(SNIPPETS_ENDPOINT_WHITELIST, "");
    try {
      additionalHosts = JSON.parse(whitelistPrefValue);
    } catch (e) {
      if (whitelistPrefValue) {
        Cu.reportError(`Pref ${SNIPPETS_ENDPOINT_WHITELIST} value is not valid JSON`);
      }
    }

    if (!additionalHosts.length) {
      return DEFAULT_WHITELIST_HOSTS;
    }

    // If there are additional hosts we want to whitelist, add them as
    // `preview` so that the updateCycle is 0
    return additionalHosts.reduce((whitelist_hosts, host) => {
      whitelist_hosts[host] = "preview";
      Services.console.logStringMessage(`Adding ${host} to whitelist hosts.`);
      return whitelist_hosts;
    }, {...DEFAULT_WHITELIST_HOSTS});
  }

  // To be passed to ASRouterTriggerListeners
  async _triggerHandler(target, trigger) {
    await this.onMessage({target, data: {type: "TRIGGER", trigger}});
  }

  _removePreviewEndpoint(state) {
    state.providers = state.providers.filter(p => p.id !== "preview");
    return state;
  }

  async _addPreviewEndpoint(url) {
    const providers = [...this.state.providers];
    if (this._validPreviewEndpoint(url) && !providers.find(p => p.url === url)) {
      providers.push({id: "preview", type: "remote", url, updateCycleInMs: 0});
      await this.setState({providers});
    }
  }

  async handleUserAction({data: action, target}) {
    switch (action.type) {
      case ra.OPEN_PRIVATE_BROWSER_WINDOW:
        // Forcefully open about:privatebrowsing
        target.browser.ownerGlobal.OpenBrowserWindow({private: true});
        break;
      case ra.OPEN_URL:
        this.openLinkIn(action.data.url, target, {
          isPrivate: false,
          where: "tabshifted",
          triggeringPrincipal: Services.scriptSecurityManager.getNullPrincipal({})
        });
        break;
      case ra.OPEN_ABOUT_PAGE:
        this.openLinkIn(`about:${action.data.page}`, target, {
          isPrivate: false,
          trusted: true,
          where: "tab",
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()
        });
        break;
      case ra.OPEN_APPLICATIONS_MENU:
        UITour.showMenu(target.browser.ownerGlobal, action.data.target);
        break;
      case ra.INSTALL_ADDON_FROM_URL:
        await MessageLoaderUtils.installAddonFromURL(target.browser, action.data.url);
        break;
    }
  }

  async onMessage({data: action, target}) {
    switch (action.type) {
      case "USER_ACTION":
        if (action.data.type in ra) {
          await this.handleUserAction({data: action.data, target});
        }
        break;
      case "CONNECT_UI_REQUEST":
      case "GET_NEXT_MESSAGE":
      case "TRIGGER":
        // Wait for our initial message loading to be done before responding to any UI requests
        await this.waitForInitialized;
        if (action.data && action.data.endpoint) {
          await this._addPreviewEndpoint(action.data.endpoint.url);
        }
        // Check if any updates are needed first
        await this.loadMessagesFromAllProviders();
        await this.sendNextMessage(target, (action.data && action.data.trigger) || {});
        break;
      case "BLOCK_MESSAGE_BY_ID":
        await this.blockMessageById(action.data.id);
        this.messageChannel.sendAsyncMessage(OUTGOING_MESSAGE_NAME, {type: "CLEAR_MESSAGE", data: {id: action.data.id}});
        break;
      case "BLOCK_PROVIDER_BY_ID":
        await this.blockProviderById(action.data.id);
        this.messageChannel.sendAsyncMessage(OUTGOING_MESSAGE_NAME, {type: "CLEAR_PROVIDER", data: {id: action.data.id}});
        break;
      case "BLOCK_BUNDLE":
        await this.blockMessageById(action.data.bundle.map(b => b.id));
        this.messageChannel.sendAsyncMessage(OUTGOING_MESSAGE_NAME, {type: "CLEAR_BUNDLE"});
        break;
      case "UNBLOCK_MESSAGE_BY_ID":
        await this.setState(state => {
          const messageBlockList = [...state.messageBlockList];
          messageBlockList.splice(messageBlockList.indexOf(action.data.id), 1);
          this._storage.set("messageBlockList", messageBlockList);
          return {messageBlockList};
        });
        break;
      case "UNBLOCK_PROVIDER_BY_ID":
        await this.setState(state => {
          const providerBlockList = [...state.providerBlockList];
          providerBlockList.splice(providerBlockList.indexOf(action.data.id), 1);
          this._storage.set("providerBlockList", providerBlockList);
          return {providerBlockList};
        });
        break;
      case "UNBLOCK_BUNDLE":
        await this.setState(state => {
          const messageBlockList = [...state.messageBlockList];
          for (let message of action.data.bundle) {
            messageBlockList.splice(messageBlockList.indexOf(message.id), 1);
          }
          this._storage.set("messageBlockList", messageBlockList);
          return {messageBlockList};
        });
        break;
      case "OVERRIDE_MESSAGE":
        await this.setMessageById(action.data.id, target, true, action);
        break;
      case "ADMIN_CONNECT_STATE":
        if (action.data && action.data.endpoint) {
          this._addPreviewEndpoint(action.data.endpoint.url);
          await this.loadMessagesFromAllProviders();
        } else {
          target.sendAsyncMessage(OUTGOING_MESSAGE_NAME, {type: "ADMIN_SET_STATE", data: this.state});
        }
        break;
      case "IMPRESSION":
        await this.addImpression(action.data);
        break;
    }
  }
}
this._ASRouter = _ASRouter;

/**
 * ASRouter - singleton instance of _ASRouter that controls all messages
 * in the new tab page.
 */
this.ASRouter = new _ASRouter();

const EXPORTED_SYMBOLS = ["_ASRouter", "ASRouter", "MessageLoaderUtils"];
