const {createStore, applyMiddleware, combineReducers} = require("redux");
const {ADDON_TO_CONTENT, CONTENT_TO_ADDON} = require("common/event-constants");
const thunk = require("redux-thunk").default;
const reducers = require("reducers/reducers");
const {Channel} = require("lib/ReduxChannel");
let fakeData;
if (__CONFIG__.USE_SHIM) {
  fakeData = require("lib/fake-data-raw");
} else {
  fakeData = {};
}


const channel = new Channel({
  incoming: ADDON_TO_CONTENT,
  outgoing: CONTENT_TO_ADDON
});

const middleware = [
  thunk,
  channel.middleware,
  require("lib/parse-url-middleware")
];

// Logging for debugging redux actions
if (__CONFIG__.LOGGING) {
  if (__CONFIG__.USE_SHIM) {
    const createLogger = require("redux-logger");
    middleware.push(createLogger({
      level: "info",
      collapsed: true
    }));
  } else {
    middleware.push(store => next => action => {
      console.log("action: " + action.type);
      next(action);
    });
  }
}

const store = createStore(
  combineReducers(reducers),
  fakeData,
  applyMiddleware(...middleware)
);

channel.connectStore(store);

module.exports = store;
