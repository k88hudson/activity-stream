ChromeUtils.import("resource://normandy/lib/FilterExpressions.jsm");
ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "ShellService",
  "resource:///modules/ShellService.jsm");
ChromeUtils.defineModuleGetter(this, "ProfileAge",
  "resource://gre/modules/ProfileAge.jsm");

const FXA_USERNAME_PREF = "services.sync.username";

/**
 * removeRandomItemFromArray - Removes a random item from the array and returns it.
 *
 * @param {Array} arr An array of items
 * @returns one of the items in the array
 */
function removeRandomItemFromArray(arr) {
  const index = Math.floor(Math.random() * arr.length);
  return arr.splice(index, 1)[0];
}

const TargetingGetters = {
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
this.TargetingGetters = TargetingGetters;

this.MessageCenterTargeting = {
  isMatch(filterExpression, context = TargetingGetters) {
    return FilterExpressions.eval(filterExpression, context);
  },
  async findMatchingItem(originalArray, options = DEFAULT_MATCHING_ITEM_OPTIONS) {
    const arrayOfItems = [...originalArray];
    let match;
    while (!match && arrayOfItems.length) {
      const candidate = removeRandomItemFromArray(arrayOfItems);
      if (await this.isMatch(candidate)) {
        match = candidate;
      }
    }
    return match;
  }
};

this.EXPORTED_SYMBOLS = ["TargetingGetters", "MessageCenterTargeting"];
