const {Cc, Ci} = require("chrome");
const {getColor} = require("lib/ColorAnalyzerProvider");
const {storage} = require("sdk/simple-storage");

function getDocumentObject(data) {
  const parser = Cc["@mozilla.org/xmlextras/domparser;1"]
                .createInstance(Ci.nsIDOMParser);
  parser.init(null, {url: data.documentURI}, {url: data.baseURI});
  return parser.parseFromString(data.fullText, "text/html");
}


function protocolRelativeToHttps(url, baseUrl) {
  url = url.replace(/^\/\//, "https://");
  if (!url.match(/^http/)) {
    url = baseUrl + "/" + url.replace(/^\//, "");
  }
  return url;
}


function makeImage(url, baseUrl) {
  return {
    url: protocolRelativeToHttps(url, baseUrl),
    height: 400,
    width: 500
  };
}

function makeSelectors(baseUrl) {
  return {
    title: {
      oneOf: [
        ['meta[property="og:title"]', el => el.content],
        ['meta[property="twitter:title"]', el => el.content],
        ['title', el => el.textContent],
        ['link[rel="canonical"]', el => el.href || el.text]
      ]
    },
    favicon_url: {
      oneOf: [
        ['link[rel="apple-touch-icon-precomposed"]', el => el.href],
        ['link[rel="apple-touch-icon"]', el => el.href],
        ['link[rel="shortcut icon"]', el => el.text],
        ['link[rel="fluid-icon"]', el => el.href],
        ['meta[name="msapplication-square*logo"]', el => el.content],
        ['meta[name="msapplication-TileImage"]', el => el.content],
    //   ]
    // },
    // favicon: {
    //   oneOf: [
        ['link[rel="shortcut icon"]', el => el.href],
        ['link[rel="icon"]', el => el.href],
        ['link[type="image/x-icon"]', el => el.href]
      ]
    },
    description: {
      oneOf: [
        ['meta[property="og:description"]', el => el.content],
        ['meta[name="description"]', el => el.content]
      ]
    },
    image: {
      oneOf: [
        ['meta[property="og:image"]', el => el.content],
        ['img', el => el.src]
      ]
    },
    images: {
      allOf: [
        ['meta[property="og:image"]', el => makeImage(el.content, baseUrl)],
        ['img', el => makeImage(el.src, baseUrl)]
      ]
    }
  };
}

exports.getMetadata = function (data) {
  return new Promise(resolve => {
    const htmlDoc = getDocumentObject(data);
    const selectors = makeSelectors(data.documentURI);
    let rules = Object.keys(selectors).map(key => {
      const rules = selectors[key];
      let result;
      if (rules.oneOf) {
        rules.oneOf.some(rule => {
          const [selector, extract] = rule;
          const el = htmlDoc.querySelector(selector);
          if (!el) return;
          const extracted = extract(el);
          if (!extracted) return;
          result = {};
          result[key] = extracted;
          return true;
        });
      }
      else if (rules.allOf) {
        result = {};
        result[key] = [];
        rules.allOf.forEach(rule => {
          const [selector, extract] = rule;
          const els = Array.from(htmlDoc.querySelectorAll(selector));
          els.forEach(el => {
            const extracted = extract(el);
            if (!extracted) return;
            result[key].push(extracted);
          });
        });
      }
      return result;
    })
    .filter(item => item)
    .reduce((prev, current) => {
      return Object.assign(prev, current);
    }, {});
    rules.url = data.documentURI;
    console.log('rules', rules);
    resolve(rules);
  });
};
