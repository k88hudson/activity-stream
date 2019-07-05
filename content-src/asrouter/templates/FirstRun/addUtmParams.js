  /**
   * Takes in a url as a string or URL object and returns a URL object with the
   * utm_* parameters added to it. If a URL object is passed in, the paraemeters
   * are added to it (the return value can be ignored in that case as it's the
   * same object).
   */
  export function addUtmParams(url, utmTerm, isCard = false) {
    let returnUrl = url;
    if (typeof returnUrl === "string") {
      returnUrl = new URL(url);
    }
    returnUrl.searchParams.append("utm_source", "activity-stream");
    returnUrl.searchParams.append("utm_campaign", "firstrun");
    returnUrl.searchParams.append("utm_medium", "referral");
    returnUrl.searchParams.append("utm_term", `${utmTerm}${isCard ? "-card" : ""}`);
    return returnUrl;
  }
