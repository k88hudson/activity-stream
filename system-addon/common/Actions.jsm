"use strict";

class Actions extends Set {
  type(key) {
    if (this.has(key)) {
      return key;
    } else {
      throw new Error(`${key} is not a defined action`);
    }
  }
}

const actions = new Actions([
  "HIGHLIGHTS_REQUEST",
  "HIGHLIGHTS_RESPONSE",
  "NOTIFY_BLOCK_URL",
  "NOTIFY_HISTORY_DELETE",
  "NOTIFY_UPDATE_SEARCH_STRING",
  "PREFS_RESPONSE",
  "PREF_CHANGED_RESPONSE",
  "RECEIVE_BOOKMARK_ADDED",
  "RECEIVE_BOOKMARK_REMOVED",
  "SEARCH_CYCLE_CURRENT_ENGINE_RESPONSE",
  "SEARCH_STATE_UPDATED",
  "SEARCH_SUGGESTIONS_RESPONSE",
  "TOP_FRECENT_SITES_REQUEST",
  "TOP_FRECENT_SITES_RESPONSE",
]);

this.EXPORTED_SYMBOLS = ["actions"];
