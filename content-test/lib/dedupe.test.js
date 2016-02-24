const urlParse = require("url-parse");
const {assert} = require("chai");

const sites = [
  "http://facebook.com",
  "http://facebook.com",
  "http://www.facebook.com",
  "http://facebook.com/",
  "https://facebook.com",
  "https://facebook.com/foo",
  "https://facebook.com?foo=bar"
]
.map(url => ({url}))
.map(site => {
  site.parsedUrl = urlParse(site.url);
  return site;
});

describe("dedupe", () => {
  const urlMap = new Map();
  it("should dedupe", () => {
    sites.forEach(site => {
      const parsed = urlParse(site.url);
      const host = parsed.host.toLowerCase().replace(/^www\./i, "");
      const pathname = parsed.pathname.replace(/\/$/, "")
      const key = host + pathname;
      if (urlMap.has(key)) {
        const otherSite = urlMap.get(key);
        if (site.frecency > otherSite.frecency) {
          urlMap.set(key, site);
        }
      } else {
        urlMap.set(key, site);
      }
    });
    console.log(urlMap);
  });
});
