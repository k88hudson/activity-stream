const React = require("react");
const ReactDOM = require("react-dom");
const {Provider} = require("react-redux");

const Routes = require("components/Routes/Routes");
const store = require("./store");

// require("lib/shim")();

const Root = React.createClass({
  render() {
    return (<Provider store={store}>
      <Routes />
    </Provider>);
  }
});
//
// function renderRootWhenAddonIsReady() {
//   if (window.navigator.activity_streams_addon || __CONFIG__.USE_SHIM) {
//
//   } else {
//     // If the content bridge to the addon isn't set up yet, try again soon.
//     setTimeout(renderRootWhenAddonIsReady, 50);
//   }
// }

ReactDOM.render(<Root />, document.getElementById("root"));
//
// renderRootWhenAddonIsReady();
