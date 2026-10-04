import assert from "node:assert/strict";
import {expect} from "@playwright/test";

export function observePerformance() {
  const supported = PerformanceObserver.supportedEntryTypes;
  window.__qaPerformance = {lcp: null, cls: supported.includes("layout-shift") ? 0 : null, supportedEntryTypes: supported};
  if (supported.includes("largest-contentful-paint")) new PerformanceObserver(list => {
    for (const item of list.getEntries()) window.__qaPerformance.lcp = item.startTime;
  }).observe({type: "largest-contentful-paint", buffered: true});
  // Maximum session-window score: <1s gaps and <5s total, per web.dev/articles/cls.
  let firstShift = 0, lastShift = 0, sessionValue = 0;
  if (supported.includes("layout-shift")) new PerformanceObserver(list => {
    for (const item of list.getEntries()) {
      if (item.hadRecentInput) continue;
      if (sessionValue && item.startTime - lastShift < 1000 && item.startTime - firstShift < 5000) sessionValue += item.value;
      else {firstShift = item.startTime; sessionValue = item.value;}
      lastShift = item.startTime;
      window.__qaPerformance.cls = Math.max(window.__qaPerformance.cls, sessionValue);
    }
  }).observe({type: "layout-shift", buffered: true});
}

async function verifyNativeDialogKeyboardBoundary(page, dialog, background) {
  const controls = dialog.locator('button:visible:not([disabled]), a[href]:visible, input:visible:not([disabled]), select:visible:not([disabled]), textarea:visible:not([disabled]), summary:visible, [tabindex]:visible:not([tabindex="-1"])');
  assert(await controls.count() >= 2, "REAL_DIALOG_CONTROLS_REQUIRED");
  for (const [start, key] of [[controls.last(), "Tab"], [controls.first(), "Shift+Tab"]]) {
    await start.focus();
    let returned = false;
    for (let step = 0; step < 4; step++) {
      await page.keyboard.press(key);
      const state = await dialog.evaluate(node => ({documentHasFocus: document.hasFocus(), inside: node.contains(document.activeElement)}));
      // Native dialogs permit browser-chrome focus; background page controls remain inert.
      assert(!state.documentHasFocus || state.inside, "FOCUS_MUST_NOT_ESCAPE_TO_BACKGROUND_PAGE");
      if (state.documentHasFocus && state.inside) {returned = true; break;}
    }
    assert(returned, "NATIVE_KEYBOARD_MUST_RETURN_TO_DIALOG");
  }
  await controls.first().focus(); await background.evaluate(node => node.focus());
  assert(await dialog.evaluate(node => node.contains(document.activeElement)), "BACKGROUND_MUST_REMAIN_INERT");
}

async function measure(page) {
  await page.getByTestId("fd109-free-result").waitFor({state: "visible"});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  return page.evaluate(() => ({...window.__qaPerformance,
    navigationMs: performance.getEntriesByType("navigation")[0].duration,
    transferBytes: performance.getEntriesByType("resource").reduce((total, item) => total + item.transferSize, 0),
    resources: performance.getEntriesByType("resource").length}));
}

export async function verifyQueryAndBreakpoints(browser, contextOptions, source) {
  const context = await browser.newContext({...contextOptions, storageState: source.state, viewport: {width: 1280, height: 900}});
  try {
    const page = await context.newPage();
    const base = new URL(source.chartUrl).pathname;
    const result = page.getByTestId("fd109-free-result");
    for (const [query, expected] of [
      ["?tab=annual&unknown=1", "?tab=nam-nay"], ["?tab=topics&tab=palaces&open=wealth", ""],
      ["?tab=topics&open=unknown", "?tab=topics"], ["?tab=topics&open=wealth", "?tab=topics&open=wealth"],
    ]) {
      assert.equal((await page.goto(base + query)).status(), 200);
      await expect(page).toHaveURL(new URL(base + expected, contextOptions.baseURL).href);
    }
    for (const topic of ["career_wealth", "relationship_marriage"]) {
      assert.equal((await page.goto(base + "?tab=topics&open=" + topic)).status(), 200);
      const dialog = page.getByTestId("fd109-preview-dialog");
      await expect(dialog).toBeVisible(); await expect(dialog.locator(".report-how")).toBeVisible();
      await expect(dialog.locator("li")).not.toHaveCount(0);
      await verifyNativeDialogKeyboardBoundary(page, dialog, page.locator("#tab-topics"));
      await page.keyboard.press("Escape"); await expect(dialog).toBeHidden();
      await expect(page).toHaveURL(new URL(base + "?tab=topics", contextOptions.baseURL).href);
    }
    await page.goto(base + "?tab=topics");
    await expect(result).toHaveAttribute("data-active-tab", "topics");
    await expect(result.getByRole("tablist")).toBeVisible();
    await expect(page.locator("#panel-topics")).toHaveAttribute("role", "tabpanel");
    await page.locator("#tab-topics").focus();
    await page.setViewportSize({width: 390, height: 900});
    await expect(result.getByRole("tablist")).toBeHidden();
    await expect(page.locator("#panel-topics")).toBeFocused();
    await expect(page.locator("#panel-topics")).toHaveAttribute("role", "region");
    const trigger = result.locator("button[data-topic-id]").first();
    await trigger.click(); const dialog = page.getByTestId("fd109-preview-dialog");
    await expect(dialog).toBeVisible();
    await page.setViewportSize({width: 1280, height: 900});
    await expect(dialog).toBeVisible(); await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
    return {canonicalAliases: true, duplicateAndUnknownQueryRejected: true, legacyPalaceTopicLink: true,
      twoAuthorizedTopicDeepLinks: true, nativeTabAndShiftTabBoundary: true, backgroundInert: true, breakpointFocusRestored: true, dialogAcrossBreakpoint: true};
  } finally {await context.close();}
}

export async function measureThrottledChromium(browser, contextOptions, source) {
  const context = await browser.newContext({...contextOptions, storageState: source.state, viewport: {width: 390, height: 844}});
  try {
    await context.addInitScript(observePerformance);
    const page = await context.newPage(); const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    const network = {offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8};
    await cdp.send("Network.emulateNetworkConditions", network);
    await cdp.send("Emulation.setCPUThrottlingRate", {rate: 4});
    await page.goto(source.chartUrl, {waitUntil: "load"}); const cold = await measure(page);
    await page.reload({waitUntil: "load"}); const warm = await measure(page);
    assert(cold.lcp !== null && warm.lcp !== null, "CHROMIUM_LCP_REQUIRED");
    return {viewport: 390, network, cpuSlowdown: 4, cold, warm,
      realApi: true, proxyOverheadIncluded: true, physicalAndroidOr4G: false,
      referenceBudgetMs: 2500, emulatedColdWithinBudget: cold.lcp < 2500, emulatedWarmWithinBudget: warm.lcp < 2500};
  } finally {await context.close();}
}
