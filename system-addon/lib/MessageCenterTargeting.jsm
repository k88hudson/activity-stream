ChromeUtils.import("resource://normandy/lib/FilterExpressions.jsm");
ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "ShellService",
  "resource:///modules/ShellService.jsm");
ChromeUtils.defineModuleGetter(this, "ProfileAge",
  "resource://gre/modules/ProfileAge.jsm");

const FXA_USERNAME_PREF = "services.sync.username";

const RULES = {
  get profileAge() {
    const profileAge = new ProfileAge(null, null);
    return {
      created: profileAge.created,
      reset: profileAge.reset
    };
  },
  get hasFxAccount() {
    return Services.prefs.prefHasUserValue(FXA_USERNAME_PREF);
  },
  get isDefaultBrowser() {
    try {
      return ShellService.isDefaultBrowser();
    } catch (e) {
      // istanbul ignore next
      return null;
    }
  }
};

this.RulesConfig = RULES;

this.MessageCenterTargeting = {
  isMatch(message, context = RULES) {
    if (!message.filter) {
      return Promise.resolve(true);
    }
    return FilterExpressions.eval(message.filter, context);
  }
};

this.EXPORTED_SYMBOLS = ["RulesConfig", "MessageCenterTargeting"];
