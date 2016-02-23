const TEMP_MAX_LENGTH = 100;
const ALLOWED_PROTOCOLS = new Set([
  "http:",
  "https:"
]);
const DISALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0"
]);

function createFilter(definition) {
  return function(item) {
    let result = true;
    definition.forEach(test => {
      if (!test(item)) {
        result = false;
      }
    });
    return result;
  };
}

const URL_FILTERS = [
  (item) => !!item.url,
  // This is temporary, until we can use POST-style requests
  // see https://github.com/mozilla/embedly-proxy/issues/1
  (item) => item.url && item.url.length < TEMP_MAX_LENGTH,
  (item) => item.parsedUrl && ALLOWED_PROTOCOLS.has(item.parsedUrl.protocol),
  (item) => item.parsedUrl && !DISALLOWED_HOSTS.has(item.parsedUrl.hostname)
];

const DATA_FILTERS = [
  item => !(item.error_code || item.error_message)
];

module.exports = {
  createFilter,
  urlFilter: createFilter(URL_FILTERS),
  siteFilter: createFilter(DATA_FILTERS),
  dedupeFilter(item, i, array) {
    let result = true;
    if (!item.parsedUrl) return false;

    array.forEach((otherSite, index) => {
      if (index === i) {
        return;
      }
      if (!otherSite.url || !otherSite.parsedUrl) {
        return;
      }
      if (item.url === otherSite.url) {
        return result = false;
      }
      if ((otherSite.parsedUrl.host + otherSite.parsedUrl.path) === (item.parsedUrl.host + item.parsedUrl.path)) {
        return result = false;
      }
      if (item.url.protocol === "http:" && otherSite.url.replace(otherSite.parsedUrl.protocol) === item.url.replace(item.parsedUrl.protocol)) {
        return result = false;
      }
      if (otherSite.url === item.url.replace("www.", "")) {
        return result = false;
      }
    });
    return result;
  }
};
