// Extract full text!
function extractFullText() {
  const data = {
    baseURI: document.baseURI,
    documentURI: document.documentURI,
    fullText: document.documentElement.innerHTML
  };
  self.port.emit("metadata-full-text", data);
  window.removeEventListener("load", extractFullText);
}

if (document.readyState === "complete") {
  extractFullText();
} else {
  window.addEventListener("load", extractFullText);
}
