const faker = require("test/faker");

module.exports = {
  "WeightedHighlights": {
    "init": true,
    "rows": faker.createRows({images: 3}),
    "error": false,
    "weightedHighlights": false
  },
  "TopSites": {
    "init": true,
    "rows": faker.createRows({images: 3}),
    "error": false
  },
  "History": {
    "init": true,
    "rows": faker.createRows({images: 3}),
    "error": false
  },
  "Highlights": {
    "init": true,
    "rows": faker.createRows({images: 3}),
    "error": false
  },
  "Bookmarks": {
    "init": true,
    "rows": faker.createRows({images: 3, type: "bookmark"}),
    "error": false
  },
  "Search": {
    "error": false,
    "searchString": "he",
    "suggestions": ["help", "helloworld"],
    "formHistory": ["hello"],
    "currentEngine": {
      "name": "Google",
      "icon": ""
    },
    "engines": [{"name": "Google", "icon": ""}, {"name": "Yahoo", "icon": ""}],
    "searchPlaceholder": "",
    "searchSettings": "",
    "searchHeader": "",
    "searchForSomethingWith": ""
  },
  "Experiments": {
    "init": true,
    "values": {},
    "error": false
  },
  "Prefs": {
    "init": true,
    "prefs": {},
    "error": false
  }
};
