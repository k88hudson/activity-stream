const tabs = require("sdk/tabs");
const as = require("lib/main");
const {data} = require("sdk/self");
const {setTimeout} = require("sdk/timers");

as.main({});

tabs.on("open", tab => {
  console.log("OPENED");
  tab.on("ready", () => {
    console.log("READY");
    setTimeout(() => {
      tab.close(() => {
        console.log("CLOSING");
      });
    }, 3000);
  });
});

tabs.open(data.url("content/activity-streams.html"));
