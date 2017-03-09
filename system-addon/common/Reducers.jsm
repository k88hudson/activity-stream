"use strict";

const {actions} = Components.utils.import("resource://activity-stream/common/Actions.jsm", {});

const INITIAL_STATE = {
  Prefs: {
    // This is set to true when our request returns an error or times out
    error: false,
    // This is an object where each key/value pair is a pref in the addon.
    prefs: {}
  },
  Search: {
    isLoading: false,
    error: false,
    searchString: "",
    suggestions: [],
    formHistory: [],
    currentEngine: {
      name: "",
      icon: ""
    },
    engines: [],
    searchPlaceholder: "",
    searchSettings: "",
    searchHeader: "",
    searchForSomethingWith: ""
  },
  setRowsOrError: {
    rows: [],
    error: false,
    init: false,
    isLoading: false,
    canLoadMore: true
  }
};

function Prefs(prevState = INITIAL_STATE.Prefs, action) {
  const state = Object.assign({}, prevState);
  switch (action.type) {
    case actions.type("PREFS_RESPONSE"):
      if (action.error) {
        state.error = action.data;
      } else {
        state.prefs = action.data;
        state.error = false;
      }
      return state;
    case actions.type("PREF_CHANGED_RESPONSE"):
      state.prefs[action.data.name] = action.data.value;
      return state;
    default:
      return prevState;
  }
}

function Search(prevState = INITIAL_STATE.Search, action) {
  const state = {};
  if (action.error) {
    state.error = action.data;
    return Object.assign({}, prevState, state);
  }
  switch (action.type) {
    case actions.type("SEARCH_STATE_UPDATED"):
      state.currentEngine = JSON.parse(action.data.currentEngine);
      state.engines = action.data.engines.map(engine => ({
        name: engine.name,
        icon: engine.iconBuffer
      }));
      break;
    case actions.type("NOTIFY_UPDATE_SEARCH_STRING"):
      state.searchString = action.data.searchString;
      break;
    case actions.type("SEARCH_SUGGESTIONS_RESPONSE"):
      state.formHistory = action.data.formHistory || [];
      state.suggestions = action.data.suggestions || [];
      break;
    case actions.type("SEARCH_CYCLE_CURRENT_ENGINE_RESPONSE"):
      state.currentEngine = action.data.currentEngine;
      break;
    default:
      return prevState;
  }
  return Object.assign({}, prevState, state);
}

function setRowsOrError(requestType, responseType, querySize) {
  return (prevState = INITIAL_STATE.setRowsOrError, action) => {
    const state = {};
    const meta = action.meta || {};
    switch (action.type) {
      case actions.type(requestType):
        state.isLoading = true;
        break;
      case actions.type(responseType):
        state.isLoading = false;
        if (action.error) {
          state.rows = meta.append ? prevState.rows : [];
          state.error = action.data;
        } else {
          state.init = true;
          state.rows = meta.append ? prevState.rows.concat(action.data) : action.data;
          state.error = false;
          // If there is no data, we definitely can't load more.
          if (!action.data || !action.data.length) {
            state.canLoadMore = false;
          }
          // If the results returned are less than the query size,
          // we should be on our last page of results.
          else if (querySize && action.data.length < querySize) {
            state.canLoadMore = false;
          }
        }
        break;
      case actions.type("RECEIVE_BOOKMARK_ADDED"):
        state.rows = prevState.rows.map(site => {
          if (site.url === action.data.url) {
            const {bookmarkGuid, bookmarkTitle, lastModified} = action.data;
            const frecency = typeof action.data.frecency !== "undefined" ? action.data.frecency : site.frecency;
            return Object.assign({}, site, {bookmarkGuid, bookmarkTitle, frecency, bookmarkDateCreated: lastModified});
          }
          return site;
        });
        break;
      case actions.type("RECEIVE_BOOKMARK_REMOVED"):
        state.rows = prevState.rows.map(site => {
          if (site.url === action.data.url) {
            const frecency = typeof action.data.frecency !== "undefined" ? action.data.frecency : site.frecency;
            const newSite = Object.assign({}, site, {frecency});
            delete newSite.bookmarkGuid;
            delete newSite.bookmarkTitle;
            delete newSite.bookmarkDateCreated;
            return newSite;
          }
          return site;
        });
        break;
      case actions.type("NOTIFY_BLOCK_URL"):
      case actions.type("NOTIFY_HISTORY_DELETE"):
        state.rows = prevState.rows.filter(val => val.url !== action.data);
        break;
      default:
        return prevState;
    }
    return Object.assign({}, prevState, state);
  };
}

const Reducers = {
  TopSites: setRowsOrError("TOP_FRECENT_SITES_REQUEST", "TOP_FRECENT_SITES_RESPONSE"),
  Prefs,
  Search
};

this.Reducers = Reducers;
this.INITIAL_STATE = INITIAL_STATE;
this.EXPORTED_SYMBOLS = [
  "Reducers",
  "INITIAL_STATE"
];
