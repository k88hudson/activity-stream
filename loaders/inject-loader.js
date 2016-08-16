const loaderUtils = require("loader-utils");

function hasOnlyExcludeFlags(query) {
  return Object.keys(query).filter(function(key) {
    return query[key] === true;
  }).length === 0;
}

function escapePath(path) {
  return path.replace("/", "\\/");
}

function quoteRegexString() {
  return "[\'|\"]{1}";
}

function createRequireStringRegex(query) {
  const regexArray = [];

  // if there is no query then replace everything
  if (Object.keys(query).length === 0) {
    regexArray.push("([^\\)]+)")
  } else {
    // if there are only negation matches in the query then replace everything
    // except them
    if (hasOnlyExcludeFlags(query)) {
      Object.keys(query).forEach(function(key) {
        regexArray.push("(?!" + quoteRegexString() + escapePath(key) + ")")
      });
      regexArray.push("([^\\)]+)")
    } else {
      regexArray.push("(" + quoteRegexString() + "(")
      regexArray.push(Object.keys(query).map(function(key) {
        return escapePath(key);
      }).join("|"));
      regexArray.push(")" + quoteRegexString() + ")")
    }
  }

  // Wrap the regex to match `require()`
  regexArray.unshift("require\\(")
  regexArray.push("\\)")

  return new RegExp(regexArray.join(""), "g");
};

module.exports = function inject(src) {
  this.cacheable && this.cacheable();
  const regex = createRequireStringRegex(loaderUtils.parseQuery(this.query));

  return `module.exports = function inject(injections) {
  var module = {exports: {}};
  var exports = module.exports;
  ${src.replace(regex, "(injections[$1] || /* istanbul ignore next */ $&)")}
  return module.exports;
}\n`;
};
