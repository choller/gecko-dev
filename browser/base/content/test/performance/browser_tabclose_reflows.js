"use strict";

/**
 * WHOA THERE: We should never be adding new things to EXPECTED_REFLOWS. This
 * is a whitelist that should slowly go away as we improve the performance of
 * the front-end. Instead of adding more reflows to the whitelist, you should
 * be modifying your code to avoid the reflow.
 *
 * See https://developer.mozilla.org/en-US/Firefox/Performance_best_practices_for_Firefox_fe_engineers
 * for tips on how to do that.
 */
const EXPECTED_REFLOWS = [
  [
    "_adjustFocusAfterTabSwitch@chrome://browser/content/tabbrowser.xml",
  ],
];

if (gMultiProcessBrowser) {
  EXPECTED_REFLOWS.push(
    [
      "_adjustFocusAfterTabSwitch@chrome://browser/content/tabbrowser.xml",
    ],
  );
}

/*
 * This test ensures that there are no unexpected
 * uninterruptible reflows when closing new tabs.
 */
add_task(async function() {
  // If we've got a preloaded browser, get rid of it so that it
  // doesn't interfere with the test if it's loading. We have to
  // do this before we disable preloading or changing the new tab
  // URL, otherwise _getPreloadedBrowser will return null, despite
  // the preloaded browser existing.
  let preloaded = gBrowser._getPreloadedBrowser();
  if (preloaded) {
    preloaded.remove();
  }

  await SpecialPowers.pushPrefEnv({
    set: [["browser.newtab.preload", false]],
  });

  let aboutNewTabService = Cc["@mozilla.org/browser/aboutnewtab-service;1"]
                             .getService(Ci.nsIAboutNewTabService);
  aboutNewTabService.newTabURL = "about:blank";

  registerCleanupFunction(() => {
    aboutNewTabService.resetNewTabURL();
  });

  // Because the tab strip is a scrollable frame, we can't use the
  // default dirtying function from withReflowObserver and reliably
  // get reflows for the strip. Instead, we provide a node that's
  // already in the scrollable frame to dirty - in this case, the
  // original tab.
  let origTab = gBrowser.selectedTab;

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  await BrowserTestUtils.waitForCondition(() => tab._fullyOpen);

  // Add a reflow observer and open a new tab.
  await withReflowObserver(async function() {
    let switchDone = BrowserTestUtils.waitForEvent(window, "TabSwitchDone");
    gBrowser.removeTab(tab, { animate: true });
    await BrowserTestUtils.waitForEvent(tab, "transitionend",
        false, e => e.propertyName === "max-width");
    await switchDone;
  }, EXPECTED_REFLOWS, window, origTab);
});
