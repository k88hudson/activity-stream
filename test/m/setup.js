import { JSDOM } from 'jsdom'
import Adapter from "enzyme-adapter-react-16";
import enzyme from "enzyme";
import * as sinon from "sinon";
import * as chai from "chai";
const {assert} = chai;

// This exposes sinon assertions to chai.assert
sinon.assert.expose(assert, {prefix: ""});

const globalNode = {
  window,
  document: window.document,
  navigator: {
    userAgent: 'node.js',
  },
  ...global,
}

// Simulate window for Node.js
if (!globalNode.window && !globalNode.document) {
  const { window } = new JSDOM('<!doctype html><html><body></body></html>', {
    beforeParse(win) {
      win.scrollTo = () => {};
    },
    pretendToBeVisual: false,
    userAgent: 'mocha',
  });

  // Configure global variables which like to be used in testing
  globalNode.window = window;
  globalNode.document = window.document;
  globalNode.navigator = window.navigator;
}

global.sinon = sinon;
global.assert = assert;

enzyme.configure({ adapter: new Adapter() });
