import {expect, test, type BrowserContext, type Page} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {randomUUID} from "node:crypto";
import {existsSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {GuaranteeClaimResultV1Schema, WalletBalanceV1Schema} from "../../packages/contracts/dist/index.js";
import {createAnonymousChart} from "./helpers/create-anonymous-chart";

const canonical = "https://lasoviet.net";
const evidence = process.env.LSV_ACCEPTANCE_EVIDENCE_DIRECTORY!;
const identity = JSON.parse(readFileSync(path.join(evidence, "identity.json"), "utf8"));
if (identity.network !== "lsv5863-qa" || !identity.builtCandidateNotPublishedArtifact || !identity.noWorkerRunning) throw Error("OWNED_ISOLATED_QA_REQUIRED");
const database = (statement: string) => execFileSync("docker", ["exec", "lsv5863-qa-db", "psql", "-U", "qa", "-d", "lsv5863_qa", "-Atc", statement], {encoding: "utf8"}).trim();
function fixture(action: string, ownerId: string, chart?: {chartId?: string; chartVersionId?: string; reportId?: string}) {
  return JSON.parse(execFileSync("docker", ["run", "--rm", "-i", "--network", "lsv5863-qa", "--env-file", path.join(evidence, "app.env"),
    "-v", `${identity.sourceRoot}:/app:ro`, "-v", `${evidence}:/qa:ro`, "-v", `${evidence}/qa-cert.pem:/qa-cert.pem:ro`, "-w", "/app",
    "node:24.16.0-bookworm-slim", "node", "--import", "./scripts/acceptance-qa-clock.mjs", "scripts/acceptance-qa-fixtures.mjs"], {
    input: JSON.stringify({action, ownerId, ...chart}), encoding: "utf8", timeout: 120_000,
  }));
}
const pacingFile = path.join(evidence, "auth-pacing.json");
async function account(context: BrowserContext, signIn = true) {
  // Advance the shared isolated server clock without disabling Better Auth's limiter.
  const clock = JSON.parse(readFileSync(path.join(evidence, "clock.json"), "utf8"));
  setClock(new Date(Date.parse(clock.now) + 11_000).toISOString());
  const pacing = existsSync(pacingFile) ? JSON.parse(readFileSync(pacingFile, "utf8")) : {count: 0, completedAt: 0};
  const email = `qa-paid-${randomUUID()}@example.test`, password = randomUUID() + randomUUID();
  const signup = await context.request.post(`${canonical}/api/auth/sign-up/email`, {headers: {origin: canonical}, data: {name: "Isolated golden path", email, password}});
  writeFileSync(pacingFile, JSON.stringify({count: pacing.count + 1, completedAt: Date.now()}), {mode: 0o600});
  expect(signup.ok(), `SUPPORTED_SIGNUP_STATUS_${signup.status()}`).toBe(true);
  let verification = "";
  await expect.poll(() => {
    verification = database(`select request_payload->>'actionUrl' from notification_deliveries where kind='email_verification' and status='sent' and request_payload->>'recipient'='${email}' order by created_at desc limit 1`);
    return Boolean(verification);
  }).toBe(true);
  expect(new URL(verification).origin).toBe(canonical);
  expect((await context.request.get(verification)).ok()).toBe(true);
  if (signIn) {
    const response = await context.request.post(`${canonical}/api/auth/sign-in/email`, {headers: {origin: canonical}, data: {email, password}});
    expect(response.ok(), `SUPPORTED_SIGNIN_STATUS_${response.status()}`).toBe(true);
  }
  const ownerId = database(`select id from auth_users where email='${email}' and email_verified and not is_anonymous`);
  expect(ownerId).toMatch(/^[A-Za-z0-9_-]{1,200}$/);
  if (signIn) {
    const response = await context.request.get(`${canonical}/api/auth/get-session`);
    expect(response.ok(), `SUPPORTED_SESSION_STATUS_${response.status()}`).toBe(true);
    expect((await response.json()).user?.id).toBe(ownerId);
  }
  return {email, password, ownerId};
}
async function createChart(page: Page) {
  const startedAt = Date.now();
  const walletResponses: Array<{endpoint: string; status: number; receipt: boolean; elapsedMs: number}> = [];
  page.on("response", response => {
    const endpoint = new URL(response.url()).pathname;
    if (endpoint === "/api/commerce/wallet/balance" || endpoint === "/api/auth/get-session") {
      walletResponses.push({endpoint, status: response.status(), receipt: Boolean(response.headers()["x-wallet-welcome-granted-at"]), elapsedMs: Date.now() - startedAt});
    }
  });
  await page.goto("/");
  const notice = page.locator(".welcome-grant-notice");
  // This notice includes session hydration and a committed wallet transaction.
  try { await expect(notice).toBeVisible({timeout: 30_000}); } catch {
    throw Error(`WELCOME_NOTICE_REQUIRED: wallet responses ${JSON.stringify(walletResponses)}`);
  }
  console.log(JSON.stringify({welcomeNoticeElapsedMs: Date.now() - startedAt, safeResponses: walletResponses}));
  await notice.locator("button").click();
  const chartUrl = await createAnonymousChart(page, "vi");
  const chartId = new URL(chartUrl).pathname.split("/").pop()!;
  expect(chartId).toMatch(/^[a-f0-9-]{36}$/);
  const chartVersionId = database(`select id from ziwei_chart_versions where chart_id='${chartId}' order by created_at desc limit 1`);
  expect(chartVersionId).toMatch(/^[a-f0-9-]{36}$/);
  await expect(page.getByTestId("fd109-free-result")).toBeVisible({timeout: 30_000});
  // Simulate the persisted state of a prior visit; let the mounted collector produce the event.
  await page.evaluate(() => {
    sessionStorage.removeItem("lasoviet:session_active");
    localStorage.setItem("lasoviet:last_visit_timestamp", String(Date.now() - 2 * 86_400_000));
  });
  await page.reload();
  await expect(page.getByTestId("fd109-free-result")).toBeVisible();
  return {chartId, chartVersionId};
}

const products = [
  {id: "relationship", sku: "ZIWEI-RELATIONSHIP-P0", price: 480},
  {id: "career", sku: "ZIWEI-CAREER-P0", price: 480},
  {id: "monthly", sku: "ZIWEI-MONTHLY-P0", price: 300},
  {id: "annual2026", sku: "ZIWEI-YEAR-P0", price: 480, targetYear: 2026},
  {id: "annual2027", sku: "ZIWEI-YEAR-P0", price: 480, targetYear: 2027},
];
function setClock(now: string) {
  expect(now).toMatch(/^(?:2026-10-(10|11)T23:[0-5][0-9]:[0-5][0-9]|2027-02-06T12:[0-5][0-9]:[0-5][0-9]|2028-02-01T12:[0-5][0-9]:[0-5][0-9])\.000Z$/);
  writeFileSync(path.join(evidence, "clock.json"), JSON.stringify({now}), {mode: 0o600});
}
function purchaseScope(chart: {chartId: string; chartVersionId: string}, product: typeof products[number]) {
  return {...chart, sku: product.sku, locale: "vi", ...(product.targetYear ? {targetYear: product.targetYear} : {})};
}
async function balance(page: Page) {
  const response = await page.request.get("/api/commerce/wallet/balance"); expect(response.ok()).toBe(true);
  return WalletBalanceV1Schema.parse(await response.json());
}
async function unlock(page: Page, scope: ReturnType<typeof purchaseScope>) {
  const before = await balance(page);
  const response = await page.request.post("/api/commerce/wallet/purchase-intents", {headers: {origin: canonical}, data: scope});
  expect(response.ok(), `ACTUAL_INTENT_HTTP_${response.status()}`).toBe(true);
  const intent = await response.json();
  const command = {purchaseIntentId: intent.id, expectedIntentVersion: intent.stateVersion,
    expectedWalletVersion: before.stateVersion, idempotencyKey: randomUUID()};
  const results = await Promise.all([0, 1].map(() => page.request.post("/api/commerce/wallet/unlock", {headers: {origin: canonical}, data: command})));
  for (const result of results) {
    const failure = result.ok() ? null : await result.json();
    const code = typeof failure?.code === "string" && /^[A-Z_]+$/.test(failure.code) ? failure.code : "REDACTED";
    expect(result.ok(), `CONCURRENT_UNLOCK_HTTP_${result.status()}_${code}`).toBe(true);
  }
  const result = await results[0].json();
  expect((await results[1].json()).reportId).toBe(result.reportId);
  expect(result.reportId).toMatch(/^[a-f0-9-]{36}$/);
  expect(before.totalLa - result.balance.totalLa).toBe(intent.amountLa);
  const replay = await page.request.post("/api/commerce/wallet/unlock", {headers: {origin: canonical}, data: command});
  expect(replay.ok()).toBe(true); expect((await replay.json()).reportId).toBe(result.reportId);
  expect((await balance(page)).totalLa).toBe(result.balance.totalLa);
  return {before, result, command, intent};
}
async function readerAndPdf(page: Page, ownerId: string, reportId: string, title: string, scenario: string, comprehensive = false) {
  const projection = fixture("read", ownerId, {reportId});
  expect(projection.status).toBe(200); expect(projection.body.value).toMatchObject({state: "ready"});
  if (!comprehensive) expect(projection.body.value.content.title).toBe(title);
  const privatePattern = /evidenceKeys|snapshotHash|inputHash|rawSnapshot|birthProfileId|periodId/;
  expect(JSON.stringify(projection.body.value)).not.toMatch(privatePattern);
  const library = fixture("library", ownerId);
  expect(library.status).toBe(200);
  const libraryItem = library.body.value.items.find((item: {reportId: string}) => item.reportId === reportId);
  expect(libraryItem).toMatchObject({source: "ledger_spend", entitlementStatus: "active", reportId, readUrl: `/bao-cao/${reportId}`, reportStatus: "ready"});
  const libraryV2ReadLinkReady = libraryItem?.readUrl === `/bao-cao/${reportId}` && libraryItem?.reportStatus === "ready";
  await page.goto("/tai-khoan/bao-cao");
  const libraryLinkVisible = await page.locator(`a[href="/bao-cao/${reportId}"]`).first().isVisible();
  writeFileSync(path.join(evidence, `${scenario}-library-gate.json`), JSON.stringify({
    libraryV2OwnedItem: Boolean(libraryItem), libraryV2ReadLinkReady, libraryV2ReportStatus: libraryItem?.reportStatus ?? "MISSING_KNOWN_LSV102", backendLibraryAcceptance: libraryItem ? "PENDING_OTHER_GATES" : "HOLD_LSV102", libraryLinkVisible, productAcceptance: libraryLinkVisible && libraryV2ReadLinkReady ? "PENDING_OTHER_GATES" : "HOLD",
  }), {mode: 0o600});
  // Continue direct-reader evidence collection; a missing library link keeps product acceptance on HOLD.
  console.log(JSON.stringify({scenario, libraryV2OwnedItem: Boolean(libraryItem), libraryV2ReadLinkReady, libraryV2ReportStatus: libraryItem?.reportStatus ?? "MISSING_KNOWN_LSV102", backendLibraryAcceptance: libraryItem ? "PENDING_OTHER_GATES" : "HOLD_LSV102", libraryLinkVisible}));
  for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
    await page.setViewportSize(viewport); await page.goto(`/bao-cao/${reportId}`);
    await expect(page.locator("h1:visible").first()).toHaveText(title);
    await expect(page.locator(comprehensive ? ".report-reader-root" : ".topic-report-reader, .period-report-reader")).toBeVisible();
    expect(await page.locator("main").ariaSnapshot()).not.toMatch(privatePattern);
    const contrast = await page.locator(".report-section-title").first().evaluate(element => {
      const style = getComputedStyle(element), color = style.color;
      let ancestor: Element | null = element, background = "rgb(255, 255, 255)";
      while (ancestor) {
        const candidate = getComputedStyle(ancestor).backgroundColor;
        if (candidate !== "transparent" && candidate !== "rgba(0, 0, 0, 0)") { background = candidate; break; }
        ancestor = ancestor.parentElement;
      }
      const luminance = (value: string) => {
        const channels = value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel => {
          const normalized = channel / 255; return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
      };
      const foreground = luminance(color), backdrop = luminance(background);
      const large = parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight) >= 700;
      return {color, background, ratio: (Math.max(foreground, backdrop) + 0.05) / (Math.min(foreground, backdrop) + 0.05), minimum: large ? 3 : 4.5};
    });
    expect(contrast.ratio).toBeGreaterThanOrEqual(contrast.minimum);
    const html = await page.request.get(`/bao-cao/${reportId}`); expect(html.status()).toBe(200);
    expect(await html.text()).not.toMatch(privatePattern);
    const rsc = await page.request.get(`/bao-cao/${reportId}?_rsc=isolated-paid`, {headers: {RSC: "1"}});
    expect(rsc.status()).toBe(200); expect(await rsc.text()).not.toMatch(privatePattern);
    await page.evaluate(() => {document.documentElement.dataset.printObserved = "0";
      window.addEventListener("beforeprint", () => {document.documentElement.dataset.printObserved = "1";}, {once: true});});
    await page.getByRole("button", {name: comprehensive ? "Tải PDF" : "In bài luận", exact: true}).click();
    await expect(page.locator("html")).toHaveAttribute("data-print-observed", "1");
    await page.emulateMedia({media: "print"});
    const file = path.join(evidence, `${scenario}-${viewport.width}.pdf`);
    const pdf = await page.pdf({path: file, format: "A4", printBackground: true});
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-"); expect(pdf.length).toBeGreaterThan(3000);
    const text = execFileSync("pdftotext", [file, "-"], {encoding: "utf8"});
    expect(text.replace(/\s+/g, " ").trim()).toContain(title.replace(/\s+/g, " ").trim()); expect(text).not.toMatch(privatePattern);
    await page.emulateMedia({media: "screen"});
    console.log(JSON.stringify({scenario, width: viewport.width, pdfBytes: pdf.length, printAction: true, contrast}));
  }
  return {...projection.body.value, libraryLinkVisible, libraryV2ReadLinkReady};
}

test("five authenticated paid scenarios with reserved refusal, generation, browser PDF and guarantee", async ({browser}) => {
  test.setTimeout(900_000);
  const outsiderContext = await browser.newContext(); const outsiderPage = await outsiderContext.newPage();
  await outsiderPage.clock.setFixedTime(new Date(identity.browserInitialNow));
  const outsider = await account(outsiderContext); const outsiderChart = await createChart(outsiderPage);
  const before = fixture("financial", outsider.ownerId);
  const beforeOutbox = database("select count(*) from outbox where event_type like 'report.%'");
  for (const product of [...products, {id: "combo", sku: "ZIWEI-COMBO-P0", price: 1300, targetYear: 2026}]) {
    const response = await outsiderPage.request.post("/api/commerce/wallet/purchase-intents",
      {headers: {origin: canonical}, data: purchaseScope(outsiderChart, product)});
    expect(response.status()).toBe(400);
  }
  expect(fixture("financial", outsider.ownerId)).toEqual(before);
  expect(database("select count(*) from outbox where event_type like 'report.%'")).toBe(beforeOutbox);
  writeFileSync(path.join(evidence, "reserved-layer.json"), JSON.stringify({passed: true, products: 6, noPurchaseMutations: true}), {mode: 0o600});
  writeFileSync(path.join(evidence, "catalog-approved.json"), JSON.stringify({runId: identity.runId, reservedLayerPassed: true}), {mode: 0o600});
  const api = JSON.parse(execFileSync("docker", ["inspect", "lsv5863-qa-api"], {encoding: "utf8"}))[0];
  expect(api.Config.Labels["lasoviet.qa.run"]).toBe(identity.runId);
  expect(Object.keys(api.NetworkSettings.Networks)).toEqual(["lsv5863-qa"]);
  execFileSync("docker", ["restart", "lsv5863-qa-api"], {encoding: "utf8"});
  await expect.poll(async () => (await outsiderPage.request.get("/api/commerce/wallet/balance")).status(), {timeout: 30_000}).toBe(200);
  // Exercise database defaults later than the injected clock, including an unrelated owner control.
  database("alter table outbox alter column available_at set default '2030-01-01T00:00:00Z'::timestamptz; alter table report_queue_jobs alter column available_at set default '2030-01-01T00:00:00Z'::timestamptz");
  fixture("fund", outsider.ownerId);
  const controlPurchase = await unlock(outsiderPage, purchaseScope(outsiderChart, products[2]!));
  const controlOutbox = database(`select json_agg(row_to_json(o) order by id) from outbox o where actor_id='${outsider.ownerId}' and available_at='2030-01-01T00:00:00Z'::timestamptz`);
  expect(JSON.parse(controlOutbox).length).toBeGreaterThan(0);
  const receipts = [];
  for (const product of products) {
    const context = await browser.newContext(); const page = await context.newPage();
    await page.clock.setFixedTime(new Date(identity.browserInitialNow));
    const owner = await account(context); const chart = await createChart(page); fixture("fund", owner.ownerId);
    const scope = purchaseScope(chart, product), original = fixture("financial", owner.ownerId);
    const query = new URLSearchParams({...chart, locale: "vi", ...(product.targetYear ? {targetYear: String(product.targetYear)} : {})});
    const quote = await page.request.get(`/api/commerce/wallet/quotes?${query}`); expect(quote.ok()).toBe(true);
    expect((await quote.json()).quotes.find((row: {sku: string}) => row.sku === product.sku)).toMatchObject({state: "available", priceLa: product.price});
    const foreign = await outsiderPage.request.post("/api/commerce/wallet/purchase-intents", {headers: {origin: canonical}, data: scope});
    expect(foreign.ok()).toBe(false);
    if (product.targetYear) {
      const wrong = await page.request.post("/api/commerce/wallet/purchase-intents", {headers: {origin: canonical}, data: {...scope, targetYear: 2029}});
      expect(wrong.ok()).toBe(false);
    }
    const {result, intent} = await unlock(page, scope); expect(intent.amountLa).toBe(product.price);
    const spent = fixture("financial", owner.ownerId);
    expect(spent.transactions.filter((row: {kind: string}) => row.kind === "spend")).toHaveLength(1);
    expect(spent.ledger.filter((row: {amountLa: number}) => row.amountLa < 0).reduce((sum: number, row: {amountLa: number}) => sum - row.amountLa, 0)).toBe(product.price);
    const generated = fixture("pump", owner.ownerId); expect(generated.processed).toBe(1); expect(generated.requests).toHaveLength(1);
    expect(generated.fixtureScheduledRowsAligned.outbox).toBeGreaterThan(0);
    expect(generated.fixtureScheduledRowsAligned.queue).toBeGreaterThan(0);
    expect(database(`select json_agg(row_to_json(o) order by id) from outbox o where actor_id='${outsider.ownerId}' and available_at='2030-01-01T00:00:00Z'::timestamptz`)).toBe(controlOutbox);
    expect(database(`select count(*) from report_versions where report_id='${controlPurchase.result.reportId}'`)).toBe("0");
    const reportId = result.reportId;
    const ready = fixture("read", owner.ownerId, {reportId}); expect(ready.status).toBe(200);
    const title = ready.body.value.content.title;
    const foreignRead = await outsiderPage.request.get(`/bao-cao/${reportId}`); expect(foreignRead.status()).toBe(404);
    expect(await foreignRead.text()).not.toContain(title);
    const report = await readerAndPdf(page, owner.ownerId, reportId, title, product.id);
    if (product.targetYear) expect(report.content.targetYear).toBe(product.targetYear);
    const asset = database(`select pdf_asset_id from report_versions where report_id='${reportId}'`);
    const serverPdf = await page.request.get(`/api/downloads/${asset}`); expect(serverPdf.status()).toBe(404);
    const claim = {...chart, partId: product.sku, reportId, rating: "inaccurate", idempotencyKey: randomUUID()};
    delete (claim as {chartVersionId?: string}).chartVersionId;
    const wrongTopic = await page.request.post("/api/commerce/wallet/guarantee-claim", {headers: {origin: canonical},
      data: {...claim, partId: product.sku === "ZIWEI-RELATIONSHIP-P0" ? "ZIWEI-CAREER-P0" : "ZIWEI-RELATIONSHIP-P0", idempotencyKey: randomUUID()}});
    expect(wrongTopic.ok()).toBe(false); expect(fixture("financial", owner.ownerId)).toEqual(spent);
    const claimed = await page.request.post("/api/commerce/wallet/guarantee-claim", {headers: {origin: canonical}, data: claim});
    expect(claimed.ok(), `GUARANTEE_HTTP_${claimed.status()}`).toBe(true);
    const approved = GuaranteeClaimResultV1Schema.parse(await claimed.json()); expect(approved.amountLaRestored).toBe(product.price);
    const replay = await page.request.post("/api/commerce/wallet/guarantee-claim", {headers: {origin: canonical}, data: claim});
    expect(replay.ok()).toBe(true); expect((await replay.json()).claimId).toBe(approved.claimId);
    const second = await page.request.post("/api/commerce/wallet/guarantee-claim", {headers: {origin: canonical}, data: {...claim, idempotencyKey: randomUUID()}});
    expect(second.ok()).toBe(false); expect((await second.json()).code).toBe("GUARANTEE_ALREADY_CLAIMED");
    const restored = fixture("financial", owner.ownerId);
    expect(restored.wallet.purchasedBalance).toBe(original.wallet.purchasedBalance);
    expect(restored.wallet.promotionalBalance).toBe(original.wallet.promotionalBalance);
    for (const lot of original.lots) expect(restored.lots.find((row: {id: string}) => row.id === lot.id)).toEqual(lot);
    expect(restored.transactions.filter((row: {kind: string}) => row.kind === "restoration")).toHaveLength(1);
    for (const allocation of restored.spendAllocations) expect(restored.restorationAllocations.find((row: {spendAllocationId: string}) => row.spendAllocationId === allocation.id)).toMatchObject({amountLa: allocation.amountLa, reversedVnd: allocation.recognizedVnd});
    expect(restored.entitlements).toHaveLength(1); expect(restored.entitlements[0].revokedAt).toBeTruthy();
    const queued = fixture("requeue_revoked", owner.ownerId, {reportId});
    const versionsBefore = database(`select count(*) from report_versions where report_id='${reportId}'`);
    const outboxBeforeReplay = database("select count(*) from outbox");
    const delayed = fixture("pump", owner.ownerId); expect(delayed.requests).toHaveLength(0);
    expect(queued.jobId).toBe(`isolated-revoked-replay:${reportId}`);
    const refused = JSON.parse(database(`select json_build_object('attempts',attempt_count,'status',status,'error',last_error_code) from report_queue_jobs where id='${queued.jobId}'`));
    expect(refused).toMatchObject({attempts: 1, status: "processed", error: null});
    expect(database("select count(*) from outbox")).toBe(outboxBeforeReplay);
    expect(database(`select count(*) from report_versions where report_id='${reportId}'`)).toBe(versionsBefore);
    const revokedProjection = fixture("read", owner.ownerId, {reportId});
    expect(revokedProjection.status).toBe(200);
    expect(revokedProjection.body).toMatchObject({ok: false, error: {code: "REPORT_NOT_FOUND"}});
    expect(JSON.stringify(revokedProjection.body)).not.toContain(title);
    const revoked = await page.request.get(`/bao-cao/${reportId}`); expect(revoked.status()).toBe(404); expect(await revoked.text()).not.toContain(title);
    const row = {scenario: product.id, priceLa: product.price, actualAuthenticatedApiPurchase: true, actualOwnedReaderAndBrowserPdf: true,
      accountLibraryLinkVisible: report.libraryLinkVisible, libraryV2ReadLinkReady: report.libraryV2ReadLinkReady, mobileDesktop: true, exactLotAndRevenueRestore: true, guaranteeReplayAndSecondClaimRefusal: true, revokedQueuedReplayNoRegeneration: true,
      syntheticGenerationOnly: true, nativeProviderCalls: 0, productionSalesActivated: false, frontendPurchaseCtaAccepted: false};
    receipts.push(row); writeFileSync(path.join(evidence, "joined-scenarios.json"), JSON.stringify({status: "in_progress", scenarios: receipts}, null, 2), {mode: 0o600});
    await context.close();
  }
  const lateContext = await browser.newContext(), latePage = await lateContext.newPage();
  await latePage.clock.setFixedTime(new Date(identity.browserInitialNow));
  const late = await account(lateContext), lateChart = await createChart(latePage); fixture("fund", late.ownerId);
  const monthly = products[2]!; const purchase = await unlock(latePage, purchaseScope(lateChart, monthly));
  const beforeLate = fixture("financial", late.ownerId);
  setClock(new Date(Date.parse(purchase.intent.createdAt) + 24 * 60 * 60 * 1000).toISOString());
  const lateClaim = await latePage.request.post("/api/commerce/wallet/guarantee-claim", {headers: {origin: canonical},
    data: {chartId: lateChart.chartId, partId: monthly.sku, reportId: purchase.result.reportId, rating: "inaccurate", idempotencyKey: randomUUID()}});
  expect(lateClaim.ok()).toBe(false); expect((await lateClaim.json()).code).toBe("GUARANTEE_WINDOW_EXPIRED");
  expect(fixture("financial", late.ownerId)).toEqual(beforeLate);
  expect(database("select count(*) from ai_call_attempts")).toBe("0");
  writeFileSync(path.join(evidence, "joined-scenarios.json"), JSON.stringify({status: receipts.every(row => row.accountLibraryLinkVisible && row.libraryV2ReadLinkReady) ? "MECHANICS_PASS" : "MECHANICS_PASS_LIBRARY_HOLD",
    productAcceptance: "HOLD", scenarios: receipts, exact24HourExclusion: true,
    futureScheduledDefaultsExercised: true, unrelatedOwnerFutureOutboxUnchanged: true,
    nativeProviderCalls: 0, customerSends: 0, productionMutations: 0, frontendPurchasePresentationStillHeld: true}, null, 2), {mode: 0o600});
  await lateContext.close(); await outsiderContext.close();
});


test("post-Tet current and next Combo delivery preserves both children and one spend", async ({browser}) => {
  test.setTimeout(900_000);
  if (!existsSync(path.join(evidence, "catalog-approved.json"))) {
    const context = await browser.newContext(), page = await context.newPage();
    await page.clock.setFixedTime(new Date(identity.browserInitialNow));
    const owner = await account(context), chart = await createChart(page);
    const before = fixture("financial", owner.ownerId);
    const reportOutbox = database("select count(*) from outbox where event_type like 'report.%'");
    for (const product of [...products, {id: "combo", sku: "ZIWEI-COMBO-P0", price: 1300, targetYear: 2026}]) {
      expect((await page.request.post("/api/commerce/wallet/purchase-intents", {headers: {origin: canonical}, data: purchaseScope(chart, product)})).status()).toBe(400);
    }
    expect(fixture("financial", owner.ownerId)).toEqual(before);
    expect(database("select count(*) from outbox where event_type like 'report.%'")).toBe(reportOutbox);
    writeFileSync(path.join(evidence, "reserved-layer.json"), JSON.stringify({passed: true, products: 6, noPurchaseMutations: true}), {mode: 0o600});
    writeFileSync(path.join(evidence, "catalog-approved.json"), JSON.stringify({runId: identity.runId, reservedLayerPassed: true}), {mode: 0o600});
    await context.close();
  }
  const receipts = [];
  for (const targetYear of [2027, 2028]) {
    setClock("2027-02-06T12:00:00.000Z");
    // Reset only the owned isolated API limiter after a deliberately reversed fixture clock.
    const api = JSON.parse(execFileSync("docker", ["inspect", "lsv5863-qa-api"], {encoding: "utf8"}))[0];
    expect(api.Config.Labels["lasoviet.qa.run"]).toBe(identity.runId);
    expect(Object.keys(api.NetworkSettings.Networks)).toEqual(["lsv5863-qa"]);
    execFileSync("docker", ["restart", "lsv5863-qa-api"], {encoding: "utf8"});
    await expect.poll(() => execFileSync("docker", ["exec", "lsv5863-qa-api", "node", "-e", "fetch('http://127.0.0.1:3001/health/live').then(r=>process.stdout.write(String(r.status))).catch(()=>process.stdout.write('unready'))"], {encoding: "utf8"}), {timeout: 30_000}).toBe("200");
    const context = await browser.newContext(), page = await context.newPage();
    await page.clock.setFixedTime(new Date("2027-02-06T12:00:00.000Z"));
    const owner = await account(context), chart = await createChart(page); fixture("fund", owner.ownerId); fixture("fund", owner.ownerId);
    const original = fixture("financial", owner.ownerId);
    const query = new URLSearchParams({...chart, locale: "vi", targetYear: String(targetYear)});
    const quoted = await page.request.get(`/api/commerce/wallet/quotes?${query}`); expect(quoted.ok()).toBe(true);
    const quote = (await quoted.json()).quotes.find((row: {sku: string}) => row.sku === "ZIWEI-COMBO-P0");
    expect(quote).toMatchObject({state: "available", priceLa: 1300});
    const product = {id: `combo${targetYear}`, sku: "ZIWEI-COMBO-P0", price: quote.priceLa, targetYear};
    const scope = purchaseScope(chart, product);
    const wrong = await page.request.post("/api/commerce/wallet/purchase-intents", {headers: {origin: canonical}, data: {...scope, targetYear: 2029}});
    expect(wrong.ok()).toBe(false);
    const {result, intent} = await unlock(page, scope); expect(intent.amountLa).toBe(1300);
    const spent = fixture("financial", owner.ownerId);
    expect(spent.transactions.filter((row: {kind: string}) => row.kind === "spend")).toHaveLength(1);
    expect(spent.entitlements).toHaveLength(2);
    expect(new Set(spent.entitlements.map((row: {ledgerSpendId: string}) => row.ledgerSpendId)).size).toBe(1);
    const children = JSON.parse(database(`select json_agg(json_build_object('sku',e.sku,'period',e.period_key,'reportId',r.report_id,'targetYear',r.target_year) order by e.sku) from commerce_entitlements e join report_reservations r on r.entitlement_id=e.id where e.owner_id='${owner.ownerId}'`));
    const natal = children.find((row: {sku: string}) => row.sku === "ZIWEI-IDENTITY-P0");
    const annual = children.find((row: {sku: string}) => row.sku === "ZIWEI-YEAR-P0");
    expect(natal.period).toBe("lifetime"); expect(annual).toMatchObject({period: String(targetYear), targetYear});
    expect(result.reportId).toBe(natal.reportId);
    const generated = fixture("pump", owner.ownerId); expect(generated.processed).toBe(2);
    expect(generated.requests.some((row: {schema: string}) => row.schema.startsWith("ziwei_comprehensive_report_section_"))).toBe(true);
    expect(generated.requests.some((row: {schema: string}) => row.schema.startsWith("ziwei_period"))).toBe(true);
    const foreignContext = await browser.newContext(); await account(foreignContext);
    for (const child of [natal,annual]) expect((await foreignContext.request.get(`/bao-cao/${child.reportId}`)).status()).toBe(404);
    await foreignContext.close();
    const annualRead = await readerAndPdf(page, owner.ownerId, annual.reportId, `Vận hạn năm ${targetYear}`, product.id + "-annual");
    const natalRead = await readerAndPdf(page, owner.ownerId, natal.reportId, "Báo Cáo Luận Giải Toàn Diện Tử Vi", product.id + "-natal", true);
    expect(annualRead.content.targetYear).toBe(targetYear);
    const immutable = database(`select json_agg(row_to_json(s) order by s.id) from report_source_snapshots s where s.report_id in ('${natal.reportId}','${annual.reportId}')`);
    const sourceRows = JSON.parse(immutable); expect(sourceRows).toHaveLength(2);
    expect(sourceRows.find((row: {report_id: string}) => row.report_id === annual.reportId).target_year).toBe(targetYear);
    expect(sourceRows.find((row: {report_id: string}) => row.report_id === natal.reportId).target_year).toBe(2027);
    const versions = database(`select json_agg(row_to_json(v) order by v.id) from report_versions v where v.report_id in ('${natal.reportId}','${annual.reportId}')`);
    const publicBefore = [fixture("read", owner.ownerId, {reportId: natal.reportId}),fixture("read", owner.ownerId, {reportId: annual.reportId})];
    setClock("2028-02-01T12:00:00.000Z");
    const signIn = await context.request.post(`${canonical}/api/auth/sign-in/email`, {headers: {origin: canonical}, data: {email: owner.email, password: owner.password}}); expect(signIn.ok()).toBe(true);
    expect(fixture("read", owner.ownerId, {reportId: natal.reportId})).toEqual(publicBefore[0]);
    expect(fixture("read", owner.ownerId, {reportId: annual.reportId})).toEqual(publicBefore[1]);
    expect(database(`select json_agg(row_to_json(s) order by s.id) from report_source_snapshots s where s.report_id in ('${natal.reportId}','${annual.reportId}')`)).toBe(immutable);
    expect(database(`select json_agg(row_to_json(v) order by v.id) from report_versions v where v.report_id in ('${natal.reportId}','${annual.reportId}')`)).toBe(versions);
    // Restore the original isolated test clock for the separate within-window guarantee case.
    setClock("2027-02-06T12:02:00.000Z");
    // Reauthenticate after reversing the isolated clock; a future-issued token is not valid here.
    const ownedApi = JSON.parse(execFileSync("docker", ["inspect", "lsv5863-qa-api"], {encoding: "utf8"}))[0];
    expect(ownedApi.Config.Labels["lasoviet.qa.run"]).toBe(identity.runId);
    expect(Object.keys(ownedApi.NetworkSettings.Networks)).toEqual(["lsv5863-qa"]);
    execFileSync("docker", ["restart", "lsv5863-qa-api"], {encoding: "utf8"});
    await expect.poll(() => execFileSync("docker", ["exec", "lsv5863-qa-api", "node", "-e", "fetch('http://127.0.0.1:3001/health/live').then(r=>process.stdout.write(String(r.status))).catch(()=>process.stdout.write('unready'))"], {encoding: "utf8"}), {timeout: 30_000}).toBe("200");
    const renewed = await context.request.post(`${canonical}/api/auth/sign-in/email`, {headers: {origin: canonical}, data: {email: owner.email, password: owner.password}});
    expect(renewed.ok()).toBe(true);
    const claim = await page.request.post("/api/commerce/wallet/guarantee-claim", {headers: {origin: canonical}, data: {
      chartId: chart.chartId, partId: annual.sku, reportId: annual.reportId, rating: "inaccurate", idempotencyKey: randomUUID()}});
    expect(claim.ok()).toBe(false); expect((await claim.json()).code).toBe("GUARANTEE_PRICE_EXCEEDS_LIMIT");
    expect(fixture("financial", owner.ownerId)).toEqual(spent);
    const restored = fixture("restore_combo", owner.ownerId, {reportId: annual.reportId}); expect(restored.replaySameBalance).toBe(true);
    const after = fixture("financial", owner.ownerId);
    expect(after.transactions.filter((row: {kind: string}) => row.kind === "restoration")).toHaveLength(1);
    expect(after.wallet.purchasedBalance).toBe(original.wallet.purchasedBalance); expect(after.wallet.promotionalBalance).toBe(original.wallet.promotionalBalance);
    expect(after.entitlements.every((row: {revokedAt: string | null}) => row.revokedAt)).toBe(true);
    for (const child of [natal,annual]) {
      expect(fixture("read", owner.ownerId, {reportId: child.reportId}).body).toMatchObject({ok: false, error: {code: "REPORT_NOT_FOUND"}});
      expect((await page.request.get(`/bao-cao/${child.reportId}`)).status()).toBe(404);
      fixture("requeue_revoked", owner.ownerId, {reportId: child.reportId});
    }
    const delayed = fixture("pump", owner.ownerId); expect(delayed.requests).toHaveLength(0);
    expect(database(`select json_agg(row_to_json(v) order by v.id) from report_versions v where v.report_id in ('${natal.reportId}','${annual.reportId}')`)).toBe(versions);
    expect(natalRead.libraryV2ReadLinkReady && annualRead.libraryV2ReadLinkReady).toBe(true);
    receipts.push({targetYear, priceLa: 1300, oneSpendTwoChildren: true, sourceAndYearFrozenAcrossLaterTet: true,
      actualWorkersAndValidators: true, mobileDesktopRealPdf: true, guaranteePolicyDenialZeroCredit: true, trustedRestorationOneCreditBothRelocked: true,
      libraryV2LinksReady: natalRead.libraryV2ReadLinkReady && annualRead.libraryV2ReadLinkReady, frontendLibraryLinksVisible: natalRead.libraryLinkVisible && annualRead.libraryLinkVisible,
      syntheticMechanicsOnly: true, nativeProviderCalls: 0, productionMutations: 0});
    writeFileSync(path.join(evidence,"combo-scenarios.json"),JSON.stringify({status:"SCOPED_BACKEND_MECHANICS_PASS",scenarios:receipts,fullProductAcceptance:"HOLD_FE_AND_NATIVE",nativeProviderCalls:0,productionMutations:0},null,2),{mode:0o600});
    await context.close();
  }
});
