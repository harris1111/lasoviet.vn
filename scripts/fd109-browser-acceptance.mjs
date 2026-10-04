import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createHash, randomUUID} from "node:crypto";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import net from "node:net";
import path from "node:path";
import {chromium, firefox, webkit, expect} from "@playwright/test";
import {createAnonymousChart} from "../tests/e2e/helpers/create-anonymous-chart.ts";
import {monitorClientErrors} from "./fd109-client-error-monitor.mjs";
import {measureThrottledChromium, observePerformance, verifyQueryAndBreakpoints} from "./fd109-supplemental-acceptance.mjs";
import {startCanonicalQaProxy} from "./fd109-qa-proxy.mjs";

const evidence = path.resolve(process.env.LSV_QA_EVIDENCE_DIRECTORY);
mkdirSync(evidence, {recursive: true, mode: 0o700});
const identity = JSON.parse(readFileSync(path.join(evidence, "qa-app-identity.json"), "utf8"));
assert(/^[0-9a-f]{40}$/.test(identity.releaseSha));
const inspect = name => JSON.parse(execFileSync("docker", ["inspect", name], {encoding: "utf8"}))[0];
const network = JSON.parse(execFileSync("docker", ["network", "inspect", "lsv72-qa"], {encoding: "utf8"}))[0];
assert.equal(network.Internal, true);
for (const kind of ["web", "api"]) {
  const container = inspect(`lsv72-qa-${kind}`);
  assert.equal(container.Config.Image, identity.images[kind]);
  assert(container.Config.Image.endsWith(`:sha-${identity.releaseSha}`));
  const environment = Object.fromEntries(container.Config.Env.map(item => item.split(/=(.*)/s).slice(0, 2)));
  assert.equal(new URL(environment.DATABASE_URL).hostname, "lsv72-qa-db");
  assert.equal(environment.FREE_PALACE_GENERATION_ENABLED, "false");
  assert(!environment.AI_API_KEY && !environment.GOOGLE_CLIENT_SECRET && !environment.TELEGRAM_BOT_TOKEN);
  assert.deepEqual(Object.keys(container.NetworkSettings.Networks), ["lsv72-qa"]);
  if (kind === "web" && identity.candidateStandalone) {
    assert(container.Mounts.some(mount => mount.Destination === "/app" && mount.Source === identity.candidateStandalone.mountedBuild && mount.RW === false));
    const manifest = readFileSync(path.join(identity.candidateStandalone.mountedBuild, "apps/web/.next/build-manifest.json"));
    assert.equal(createHash("sha256").update(manifest).digest("hex"), identity.candidateStandalone.buildManifestSha256);
  }
}
const database = statement => execFileSync("docker", ["exec", "lsv72-qa-db", "psql", "-U", "qa", "-d", "lsv72_qa", "-Atc", statement], {encoding: "utf8"}).trim();
const supplementalOnly = process.env.LSV_QA_SUPPLEMENTAL_ONLY === "1";
const resume = process.env.LSV_QA_RESUME === "1";
const previous = supplementalOnly || resume ? JSON.parse(readFileSync(path.join(evidence, "browser-matrix.json"), "utf8")) : null;
if (previous) {
  assert.equal(previous.releaseSha, identity.releaseSha, "MATRIX_RELEASE_MISMATCH");
  assert.deepEqual(previous.candidateStandalone ?? null, identity.candidateStandalone ?? null, "MATRIX_BUILD_MISMATCH");
  if (resume) assert(previous.cells.every(row => row.pass), "RESUME_MUST_NOT_DISCARD_FAILURES");
}
const rows = previous?.cells ?? [];
const seeds = new Map();
let proxy;
let stage = "bootstrap";
const browsers = [];
const supplemental = [];
const performanceRows = [];
const webIp = inspect("lsv72-qa-web").NetworkSettings.Networks["lsv72-qa"].IPAddress;
// Docker internal networks have no host port publishing on this engine. The
// relay binds only loopback and targets the inspected, pinned QA web container.
const relay = net.createServer(client => {
  const upstream = net.connect(3000, webIp, () => {client.pipe(upstream); upstream.pipe(client);});
  upstream.on("error", () => client.destroy()); client.on("error", () => upstream.destroy());
  client.on("close", () => upstream.destroy());
});
const canonical = "https://lasoviet.net";
const contextOptions = () => ({baseURL: canonical, proxy: {server: proxy.server}, ignoreHTTPSErrors: true});
const blocks = ["chart", "insights", "free-palace", "scores", "year", "palaces", "topics", "completion", "evidence"];

async function seed(browser, locale, actor) {
  stage = `seed-${locale}-${actor}`;
  const context = await browser.newContext({...contextOptions(), viewport: {width: 390, height: 844}});
  if (actor === "account") {
    const email = `qa-${randomUUID()}@example.test`;
    const password = randomUUID() + randomUUID();
    const signup = await context.request.post(`${canonical}/api/auth/sign-up/email`, {
      headers: {origin: canonical, "accept-language": locale}, data: {name: "FD109 isolated QA", email, password},
    });
    assert(signup.ok(), "SUPPORTED_SIGNUP_REQUIRED");
    let verification;
    await expect.poll(() => {
      verification = database(`select request_payload->>'actionUrl' from notification_deliveries where kind='email_verification' and status='sent' and request_payload->>'recipient'='${email}' order by created_at desc limit 1`);
      return Boolean(verification);
    }).toBe(true);
    assert.equal(new URL(verification).origin, canonical);
    assert((await context.request.get(verification)).ok(), "SUPPORTED_VERIFICATION_REQUIRED");
    assert((await context.request.post(`${canonical}/api/auth/sign-in/email`, {
      headers: {origin: canonical}, data: {email, password},
    })).ok(), "SUPPORTED_SIGNIN_REQUIRED");
    assert.equal(database(`select email_verified from auth_users where email='${email}'`), "t");
  }
  const page = await context.newPage();
  if (actor === "account") {
    await page.goto(`${locale === "en" ? "/en" : ""}/tao-la-so/tu-vi`);
    const notice = page.locator(".welcome-grant-notice");
    await expect(notice).toBeVisible();
    await notice.locator("button").click(); await expect(notice).toBeHidden();
  }
  const chartUrl = await createAnonymousChart(page, locale);
  await expect(page.getByTestId("fd109-free-result")).toBeVisible();
  seeds.set(`${locale}-${actor}`, {chartUrl, state: await context.storageState()});
  console.log(JSON.stringify({stage, realChartReady: true}));
  await context.close();
}

async function cell(browser, engine, locale, actor, width, theme) {
  const name = `${engine}-${locale}-${actor}-${width}-${theme}`; stage = name;
  const source = seeds.get(`${locale}-${actor}`);
  const context = await browser.newContext({...contextOptions(), storageState: source.state,
    viewport: {width, height: 900}, colorScheme: theme});
  await context.addInitScript(value => localStorage.setItem("lasoviet:theme", value), theme);
  await context.addInitScript(observePerformance);
  const page = await context.newPage();
  const result = page.getByTestId("fd109-free-result");
  const monitor = await monitorClientErrors(context, page, engine);
  const responses = [];
  page.on("response", response => {const url = new URL(response.url()); if (url.origin === canonical) responses.push({path: url.pathname, status: response.status()});});
  let functionalPass = false;
  try {
    const response = await page.goto(source.chartUrl, {waitUntil: "load"});
    assert.equal(response.status(), 200);
    await expect(result).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    assert.deepEqual(await result.locator("[data-free-result-block]").evaluateAll(elements => elements.map(item => item.getAttribute("data-free-result-block"))), blocks);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await expect(result.locator('[data-free-result-block]:not([data-free-result-block="completion"]) a[href*="/chon-luan-giai"]')).toHaveCount(0);
    await expect(result.getByTestId("fd109-palace-preview")).toHaveCount(11);
    await expect(result.locator("[data-topic-id]")).toHaveCount(2);
    await page.evaluate(() => document.fonts.ready);
    const cold = await page.evaluate(() => ({...window.__qaPerformance, duration: performance.getEntriesByType("navigation")[0].duration}));
    await page.reload({waitUntil: "load"});
    await expect(result).toBeVisible(); await page.evaluate(() => document.fonts.ready);
    const warm = await page.evaluate(() => ({...window.__qaPerformance, duration: performance.getEntriesByType("navigation")[0].duration}));
    if (width >= 1024) {
      await expect(result.getByRole("tablist")).toBeVisible();
      await expect(result.getByRole("tab")).toHaveCount(6);
      await page.locator("#tab-chart").focus(); await page.keyboard.press("End");
      await expect(page.locator("#tab-evidence")).toBeFocused();
      await expect(result).toHaveAttribute("data-active-tab", "evidence");
      await page.keyboard.press("Home"); await expect(page.locator("#tab-chart")).toBeFocused();
      await expect(result).toHaveAttribute("data-active-tab", "chart");
      await page.locator("#tab-palaces").click();
      await expect(result).toHaveAttribute("data-active-tab", "palaces");
      await expect(page.locator("#panel-palaces")).toHaveAttribute("role", "tabpanel");
      await expect(page.locator("#panel-palaces")).toHaveAttribute("aria-labelledby", "tab-palaces");
    } else {
      await expect(result.getByRole("tablist")).toBeHidden();
      for (const block of blocks) await expect(result.locator(`[data-free-result-block="${block}"]`)).toBeVisible();
      await expect(page.locator("#panel-palaces")).toHaveAttribute("role", "region");
      const enlarge = result.getByTestId("fd109-chart-enlarge");
      await enlarge.click(); const dialog = page.getByTestId("fd109-preview-dialog");
      await expect(dialog).toBeVisible(); await expect(dialog.getByTestId("ziwei-palace")).toHaveCount(12);
      assert(await dialog.getByTestId("ziwei-palace").evaluateAll(elements => elements.every(item => {
        const rect = item.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44;
      })));
      await page.keyboard.press("Escape"); await expect(dialog).toBeHidden(); await expect(enlarge).toBeFocused();
    }
    const trigger = result.getByTestId("fd109-palace-preview").first();
    await trigger.scrollIntoViewIfNeeded(); await trigger.click();
    const dialog = page.getByTestId("fd109-preview-dialog"); await expect(dialog).toBeVisible();
    await expect(dialog.locator(".report-how")).toBeVisible();
    await page.goBack(); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
    await page.goForward(); await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape"); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden");
    if (width === 390 && engine === "chromium") await page.screenshot({path: path.join(evidence, `${name}.png`), fullPage: true});
    functionalPass = true;
    const clientErrors = monitor.verify();
    rows.push({engine, locale, actor, width, theme, pass: true, functionalPass, cold, warm,
      realApi: true, privateBoundary: true, historyFocus: true, chartTargets: width < 1024 ? "enlarged-44px" : "desktop",
      disclosure: true, overflow: false, clientErrors, clientProtocolAcceptance: clientErrors.unclassifiedRscFetchDiagnostics === 0});
  } catch (error) {
    await page.screenshot({path: path.join(evidence, `${name}-failure.png`), fullPage: true});
    writeFileSync(path.join(evidence, `${name}-private-state.json`), JSON.stringify({url: page.url(), activeTab: await result.getAttribute("data-active-tab"), responses: responses.slice(-15), clientErrors: monitor.snapshot()}), {mode: 0o600});
    writeFileSync(path.join(evidence, `${name}-private-error.txt`), String(error.stack), {mode: 0o600});
    rows.push({engine, locale, actor, width, theme, pass: false, functionalPass,
      failure: error.message, actualUnhandledClientExceptions: monitor.snapshot().exceptions.length});
  } finally {await context.close();}
  if (rows.length % 8 === 0) console.log(JSON.stringify({completed: rows.length, passed: rows.filter(row => row.pass).length}));
  writeFileSync(path.join(evidence, "browser-matrix.json"), JSON.stringify({releaseSha: identity.releaseSha, candidateStandalone: identity.candidateStandalone ?? null, cells: rows}, null, 2), {mode: 0o600});
}

async function main() {
  await new Promise((resolve, reject) => {relay.once("error", reject); relay.listen(65520, "127.0.0.1", resolve);});
  proxy = await startCanonicalQaProxy({certificateDirectory: evidence, webOrigin: identity.loopbackWebOrigin});
  const seedBrowser = await chromium.launch({headless: true}); browsers.push(seedBrowser);
  for (const locale of ["vi", "en"]) for (const actor of ["guest", "account"]) await seed(seedBrowser, locale, actor);
  // Preserve the indistinguishable unauthorized boundary before canonical redirects.
  for (const locale of ["vi", "en"]) {
    const context = await seedBrowser.newContext({...contextOptions(), storageState: seeds.get(`${locale}-account`).state});
    assert.equal((await context.request.get(seeds.get(`${locale}-guest`).chartUrl + "?tab=invalid&unknown=1")).status(), 404);
    await context.close();
    const guest = await seedBrowser.newContext({...contextOptions(), storageState: seeds.get(`${locale}-guest`).state});
    assert.equal((await guest.request.get(seeds.get(`${locale}-account`).chartUrl + "?tab=invalid&unknown=1")).status(), 404);
    await guest.close();
  }
  for (const [engine, launcher] of [["chromium", chromium], ["webkit", webkit], ["firefox", firefox]]) {
    const browser = engine === "chromium" ? seedBrowser : await launcher.launch({headless: true});
    if (engine !== "chromium") browsers.push(browser);
    const pending = [];
    for (const locale of ["vi", "en"]) for (const actor of ["guest", "account"])
      for (const width of [360, 390, 430, 1280]) for (const theme of ["light", "dark"])
        if (!rows.some(row => row.engine === engine && row.locale === locale && row.actor === actor && row.width === width && row.theme === theme)) pending.push([locale, actor, width, theme]);
    // Independent contexts retain their own cookies, storage and assertions.
    if (!supplementalOnly) await Promise.all(Array.from({length: 2}, async () => {
      while (pending.length) {
        const next = pending.shift();
        await cell(browser, engine, ...next);
      }
    }));
    for (const locale of ["vi", "en"]) for (const actor of ["guest", "account"]) {
      supplemental.push({engine, locale, actor, ...await verifyQueryAndBreakpoints(browser, contextOptions(), seeds.get(`${locale}-${actor}`))});
      writeFileSync(path.join(evidence, "supplemental-browser.json"), JSON.stringify(supplemental, null, 2), {mode: 0o600});
      console.log(JSON.stringify({stage: "supplemental", engine, locale, actor, pass: true}));
    }
  }
  for (const locale of ["vi", "en"]) for (const actor of ["guest", "account"]) {
    performanceRows.push({locale, actor, ...await measureThrottledChromium(seedBrowser, contextOptions(), seeds.get(`${locale}-${actor}`))});
    writeFileSync(path.join(evidence, "throttled-performance.json"), JSON.stringify(performanceRows, null, 2), {mode: 0o600});
    console.log(JSON.stringify({stage: "throttled-performance", locale, actor, coldLcp: performanceRows.at(-1).cold.lcp}));
  }
  writeFileSync(path.join(evidence, "supplemental-browser.json"), JSON.stringify(supplemental, null, 2), {mode: 0o600});
  assert.equal(rows.length, 96); assert.equal(new Set(rows.map(row => JSON.stringify([row.engine,row.locale,row.actor,row.width,row.theme]))).size, 96);
  assert.equal(database("select count(*) from ai_call_attempts"), "0");
  const summary = {releaseSha: identity.releaseSha, candidateStandalone: identity.candidateStandalone ?? null, cells: 96, passed: rows.filter(row => row.pass).length,
    realWebApiDatabase: true, supportedSignupVerificationSignin: true, isolatedGuestAccountBoundary: true,
    freeAiOff: true, providerCalls: 0, blockedExternalDestinations: proxy.blockedDestinations(),
    localProxyTransport: true, physicalSafariOr4G: false,
    functionalPassed: rows.filter(row => row.functionalPass).length,
    failures: rows.filter(row => !row.pass).map(({engine, locale, actor, width, theme, failure}) => ({engine, locale, actor, width, theme, failure})),
    actualUnhandledClientExceptions: rows.reduce((sum, row) => sum + (row.clientErrors?.actualUnhandled ?? row.actualUnhandledClientExceptions ?? 0), 0),
    handledCanceledFetchDiagnostics: rows.reduce((sum, row) => sum + (row.clientErrors?.handledCanceledFetchDiagnostics ?? 0), 0),
    unclassifiedRscFetchDiagnostics: rows.reduce((sum, row) => sum + (row.clientErrors?.unclassifiedRscFetchDiagnostics ?? 0), 0),
    fullAcceptance: false};
  writeFileSync(path.join(evidence, "browser-acceptance-summary.json"), JSON.stringify(summary, null, 2), {mode: 0o600});
  console.log(JSON.stringify(summary));
  assert(rows.every(row => row.pass), "MATRIX_HAS_FAILURES");
}
try {await main();} catch (error) {
  writeFileSync(path.join(evidence, "bootstrap-private-error.txt"), String(error.stack), {mode: 0o600});
  console.error(`QA_BROWSER_ACCEPTANCE_FAILED:${stage}`); process.exitCode = 1;
} finally {
  await Promise.all(browsers.map(browser => browser.close()));
  relay.close(); if (proxy) await proxy.close();
}
