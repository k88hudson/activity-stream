const urlParse = require("url-parse");
const am = require("actions/action-manager");

// This middleware adds a parsedUrl object to every action that has
//

module.exports = () => next => action => {

  if (!am.ACTIONS_WITH_SITES.has(action.type)) {
    return next(action);
  }

  if (action.error || !action.data || !action.data.length) {
    return next(action);
  }

  const data = action.data.map(site => {
    if (!site.url) {
      return site;
    }
    const parsedUrl = urlParse(site.url);
    return Object.assign({}, site, {parsedUrl});
  });

  next(Object.assign({}, action, {data}));
};
