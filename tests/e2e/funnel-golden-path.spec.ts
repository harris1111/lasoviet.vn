import {expect, test, type BrowserContext, type Page} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {randomUUID} from "node:crypto";
import {existsSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {GuaranteeClaimResultV1Schema, WalletBalanceV1Schema} from "../../packages/contracts/dist/index.js";
import {createAnonymousChart} from "./helpers/create-anonymous-chart";

const canonical = "https://lasoviet.net";
const evidence = process.env.LSV_FUNNEL_EVIDENCE_DIRECTORY!;
const identity = JSON.parse(readFileSync(path.join(evidence, "identity.json"), "utf8"));
if (identity.network !== "lsv80-qa" || !identity.builtCandidateNotPublishedArtifact || !identity.noWorkerRunning) throw Error("OWNED_ISOLATED_QA_REQUIRED");
const database = (statement: string) => execFileSync("docker", ["exec", "lsv80-qa-db", "psql", "-U", "qa", "-d", "lsv80_qa", "-Atc", statement], {encoding: "utf8"}).trim();
function fixture(action: string, ownerId: string, chart?: {chartId: string; chartVersionId: string; reportId?: string}) {
  return JSON.parse(execFileSync("docker", ["run", "--rm", "-i", "--network", "lsv80-qa", "--env-file", path.join(evidence, "app.env"), "-v", `${identity.sourceRoot}:/app:ro`, "-v", `${evidence}/qa-cert.pem:/qa-cert.pem:ro`, "-w", "/app", "node:24.16.0-bookworm-slim", "node", "tests/e2e/helpers/funnel-qa-fixtures.mjs"], {
    input: JSON.stringify({action, ownerId, ...chart}), encoding: "utf8",
  }));
}
const pacingFile = path.join(evidence, "auth-pacing.json");
async function account(context: BrowserContext, signIn = true) {
  // Better Auth 1.7.2 limits this shared test IP to three sign-ups in
  // a rolling 10-second window. Preserve the production limiter.
  const pacing = existsSync(pacingFile) ? JSON.parse(readFileSync(pacingFile, "utf8")) : {count: 0, completedAt: 0};
  if (pacing.count > 0 && pacing.count % 3 === 0) {
    const remaining = pacing.completedAt + 11_000 - Date.now();
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
  }
  const email = `qa-golden-${randomUUID()}@example.test`, password = randomUUID() + randomUUID();
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
async function preview(page: Page, chartId: string) {
  await page.goto(`/la-so/${chartId}?tab=palaces&open=wealth`, {waitUntil: "domcontentloaded"});
  const dialog = page.getByTestId("fd109-preview-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("contextual-palace-unlock")).toBeEnabled();
  return dialog;
}
async function readyReader(page: Page, ownerId: string, chart: {chartId: string; chartVersionId: string}) {
  const {reportId} = fixture("ready", ownerId, chart);
  const scope = await page.locator("dialog[open]").count() ? page.locator("dialog[open]") : page;
  const link = scope.locator(`a[href="/bao-cao/${reportId}"]`).first();
  await expect(link).toBeVisible(); await link.click();
  await page.waitForURL(`${canonical}/bao-cao/${reportId}`);
  await expect(page.locator("main")).toContainText("Nội dung mô phỏng dành riêng cho kiểm thử luồng đọc");
  return reportId as string;
}

async function authorizedPreviewPrivacy(page: Page, ownerId: string, chart: {chartId: string; chartVersionId: string}, reportId: string, openedSections: number, openedPalaces: number) {
  const view = fixture("read", ownerId, {...chart, reportId});
  const stored = JSON.parse(database(`select json_build_object('reportId',report_id,'reportVersionId',report_version_id,'chartVersionId',chart_version_id,'locale',locale) from report_versions where report_id='${reportId}'`));
  expect(view).toMatchObject({...stored, chartId: chart.chartId});
  expect(view.upgradePreview).toMatchObject({reportVersionId: view.reportVersionId, chartVersionId: chart.chartVersionId, locale: view.locale,
    coverage: {openedSections, lockedSections: 9 - openedSections, openedPalaces, lockedPalaces: 12 - openedPalaces}});
  const tail = "LSV61_PRIVATE_TAIL_ziwei_palace_life";
  const source = JSON.parse(database(`select structured_content->'palaceReadings' from report_versions where report_id='${reportId}'`)) as Array<{palaceId: string; title: string; narrative: string}>;
  const ownedPalaces = new Set((view.content.palaceReadings ?? []).map((item: {palaceId: string}) => item.palaceId));
  const hiddenTails = source.filter(item => !ownedPalaces.has(item.palaceId)).map(item => `LSV61_PRIVATE_TAIL_${item.palaceId.replaceAll(".", "_")}`);
  const assertHidden = (body: string) => {for (const marker of hiddenTails) expect(body).not.toContain(marker);};
  assertHidden(JSON.stringify(view));
  const upgrade = page.getByTestId("reader-upgrade");
  await expect(upgrade.getByTestId("reader-upgrade-section-coverage")).toContainText(`${openedSections} đã mở`);
  await expect(upgrade.getByTestId("reader-upgrade-palace-coverage")).toContainText(`${openedPalaces} đã mở`);
  const clipped = view.upgradePreview.lockedPart.clippedSentences[0];
  expect(clipped.length).toBeLessThanOrEqual(201);
  const original = source.find(item => item.palaceId === view.upgradePreview.lockedPart.palaceId)!;
  expect(ownedPalaces.has(original.palaceId)).toBe(false);
  expect(view.upgradePreview.lockedPart.title).toBe(original.title);
  expect(original.narrative.startsWith(clipped.slice(0, -1))).toBe(true);
  await expect(upgrade.getByTestId("reader-upgrade-preview")).toContainText(clipped);
  await expect(upgrade.locator(".locked-preview-blur-bars")).toHaveAttribute("aria-hidden", "true");
  expect(await upgrade.locator(".locked-preview-blur-bars").textContent()).toBe("");
  assertHidden(await page.content());
  assertHidden(await page.locator("main").ariaSnapshot());
  const html = await page.request.get(`/bao-cao/${reportId}`);
  expect(html.status()).toBe(200); assertHidden(await html.text());
  const rsc = await page.request.get(`/bao-cao/${reportId}?_rsc=lsv61`, {headers: {RSC: "1"}});
  expect(rsc.status()).toBe(200); expect(rsc.headers()["content-type"]).toContain("text/x-component");
  assertHidden(await rsc.text());
  await page.emulateMedia({media: "print"});
  try {assertHidden(await page.locator("body").innerText());
    await expect(upgrade.locator(".locked-preview-blur-bars")).toBeHidden();
  } finally {await page.emulateMedia({media: "screen"});}
  expect(fixture("asset_denial", ownerId, {...chart, reportId})).toEqual({partialScopeDeniedWithStoredMetadata: true, metadataRestored: true, noPdfBytesOrStoreCalls: true});
  const asset = database(`select pdf_asset_id from report_versions where report_id='${reportId}'`);
  // No PDF is generated: a partial owner must not receive any download projection.
  const denied = await page.request.get(`/api/downloads/${asset}`);
  expect(denied.status()).toBe(404); expect(await denied.text()).not.toContain("objectKey");
  return {tail, reportVersionId: view.reportVersionId};
}

for (const viewport of [{name: "mobile", width: 390, height: 844}, {name: "desktop", width: 1440, height: 900}]) {
  test.describe(`real-network funnel ${viewport.name}`, () => {
    test.use({viewport: {width: viewport.width, height: viewport.height}});
    test.beforeEach(async ({page}) => {
      await page.addInitScript(() => {
        const state = Object.assign(window, {__lsv61FirstSectionObserved: false});
        const NativeObserver = window.IntersectionObserver;
        window.IntersectionObserver = class extends NativeObserver {
          observe(target: Element) {
            super.observe(target);
            if (target.matches('[data-testid="reader-first-owned-section-end"]')) state.__lsv61FirstSectionObserved = true;
          }
        };
      });
      // Freeze near the server clock so the production one-hour ingress window remains valid.
      await page.clock.setFixedTime(new Date());
      await expect.poll(async () => {try {return (await page.request.get("/health/ready")).status();} catch {return 0;}}).toBe(200);
    });
    test("guest homepage → chart → preview → real email sign-in → same preview", async ({page, browser}) => {
      const signup = await browser.newContext({baseURL: canonical, proxy: {server: process.env.PLAYWRIGHT_QA_PROXY!}, ignoreHTTPSErrors: true});
      let credentials;
      try {credentials = await account(signup, false);} finally {await signup.close();}
      await page.goto("/");
      await page.selectOption("#hv3-day", "25"); await page.selectOption("#hv3-month", "07"); await page.selectOption("#hv3-year", "1993");
      await page.fill("#hv3-hour", "06"); await page.fill("#hv3-minute", "40"); await page.locator("#hv3-gender-female").click();
      await page.locator('.hv3-form button[type="submit"]').click();
      await page.getByLabel("Tôi đồng ý để Lá Số Việt xử lý thông tin sinh để lập lá số").check();
      await page.getByRole("button", {name: "Lập lá số", exact: true}).click();
      await page.waitForURL(/\/la-so\/[^/]+$/); const chartId = new URL(page.url()).pathname.split("/").pop()!;
      await expect(page.getByTestId("fd109-free-result")).toBeVisible();
      const dialog = await preview(page, chartId); await dialog.getByTestId("contextual-palace-unlock").click();
      await page.waitForURL(/\/dang-nhap\?/);
      const callback = new URL(page.url()).searchParams.get("callbackURL");
      expect(callback).toBe(`/la-so/${chartId}?tab=palaces&open=wealth`);
      await page.getByRole("tab", {name: "Đăng nhập", exact: true}).click();
      await page.locator('input[name="email"]').fill(credentials.email); await page.locator('input[name="password"]').fill(credentials.password);
      await page.locator('.auth-form button[type="submit"]').click();
      await page.waitForURL(canonical + callback);
      await expect(page.getByTestId("fd109-preview-dialog")).toBeVisible();
      expect(database(`select p.user_id from ziwei_charts c join birth_profiles p on p.id=c.profile_id where c.id='${chartId}'`)).toBe(credentials.ownerId);
    });
    test("funded account → palace confirmation → owned readable palace", async ({page}) => {
      const owner = await account(page.context()); fixture("fund", owner.ownerId); const chart = await createChart(page);
      const dialog = await preview(page, chart.chartId); await dialog.getByTestId("contextual-palace-unlock").click();
      await expect(dialog).toContainText("120 Lá"); await dialog.getByRole("button", {name: "Xác nhận mở", exact: true}).click();
      await expect(dialog.getByTestId("contextual-unlock-success")).toBeVisible();
      const reportId = await readyReader(page, owner.ownerId, chart);
      await expect.poll(() => page.evaluate(() => "__lsv61FirstSectionObserved" in window && window.__lsv61FirstSectionObserved)).toBe(true);
      expect(await page.getByTestId("reader-first-owned-section-end").evaluate(element => element.getBoundingClientRect().top > window.innerHeight)).toBe(true);
      expect(await page.locator("main.report-reader").evaluate(element => (window.scrollY - (element as HTMLElement).offsetTop) / (element.scrollHeight - window.innerHeight))).toBeLessThan(0.2);
      await expect(page.getByTestId("reader-upgrade")).toHaveCount(0);
      await page.locator('[id="ziwei.palace.wealth"]').scrollIntoViewIfNeeded();
      await page.locator('[id="ziwei.palace.wealth"]').evaluate(element => window.scrollTo(0, element.getBoundingClientRect().bottom + window.scrollY - 100));
      await expect(page.getByTestId("reader-upgrade")).toBeVisible();
      await authorizedPreviewPrivacy(page, owner.ownerId, chart, reportId, 0, 1);
      await page.goto(`/en/bao-cao/${reportId}`);
      await page.waitForURL(`${canonical}/bao-cao/${reportId}`);
      expect(database(`select count(*) from commerce_entitlements where owner_id='${owner.ownerId}' and sku='ZIWEI-PALACE-WEALTH-P0' and revoked_at is null`)).toBe("1");
    });
    test("short balance → selected pack → simulated paid → immutable automatic unlock", async ({page}) => {
      const owner = await account(page.context()); const chart = await createChart(page);
      const dialog = await preview(page, chart.chartId); await dialog.getByTestId("contextual-palace-unlock").click();
      const topup = dialog.locator('a[href*="/nap-la?pack="]'); await expect(topup).toBeVisible();
      const terms = new URL(await topup.getAttribute("href") as string, canonical).searchParams;
      expect(terms.get("price")).toBe("120"); expect(terms.get("open")).toBe("wealth");
      await topup.click(); await expect(page.locator('[data-pack-id="LA-ENTRY-300"]')).toHaveAttribute("aria-checked", "true");
      await page.locator('.paybar button[type="submit"]').click();
      await page.waitForURL(new RegExp(`/la-so/${chart.chartId}\\?tab=palaces&topupOrder=`));
      await expect(page.getByTestId("fd109-preview-dialog")).toBeVisible();
      expect(new URL(page.url()).searchParams.get("open")).toBe("wealth");
      expect(database(`select count(*) from wallet_topup_continuations where owner_id='${owner.ownerId}' and status='completed' and purchase_intent_id='${terms.get("intent")}'`)).toBe("1");
      fixture("dispatch_business", owner.ownerId); fixture("dispatch_business", owner.ownerId);
      for (const name of ["la_spent", "unlock_confirmed"]) {
        expect(database(`select count(*) from analytics_events where user_id='${owner.ownerId}' and name='${name}' and properties->>'amount'='120'`)).toBe("1");
      }
      await readyReader(page, owner.ownerId, chart);
    });
    test("paid excerpt → reader → real quoted lifetime difference → upgrade", async ({page}) => {
      const owner = await account(page.context()); fixture("fund", owner.ownerId); const chart = await createChart(page);
      await page.goto(`/la-so/${chart.chartId}/chon-luan-giai?offer=ziwei-natal-excerpt`);
      await page.locator('.offer-ladder-summary .button-primary').click();
      const dialog = page.locator("dialog.unlock-sheet"); await expect(dialog).toContainText("240 Lá");
      await dialog.getByRole("button", {name: "Xác nhận mở", exact: true}).click();
      await expect(page.locator(".offer-ladder-summary [role=status]")).toBeVisible();
      const reportId = await readyReader(page, owner.ownerId, chart);
      await page.locator("#section-strengths-tensions").scrollIntoViewIfNeeded();
      const {tail: lockedTail, reportVersionId: originalVersionId} = await authorizedPreviewPrivacy(page, owner.ownerId, chart, reportId, 4, 0);
      const upgrade = page.locator(".reader-upgrade"); await expect(upgrade).toContainText("720 Lá");
      await upgrade.getByRole("button", {name: "Xem giá và xác nhận nâng cấp", exact: true}).click();
      await expect(page.locator("dialog.unlock-sheet")).toContainText("720 Lá");
      await page.locator("dialog.unlock-sheet").getByRole("button", {name: "Xác nhận mở", exact: true}).click();
      await expect.poll(() => database(`select count(*) from wallet_purchase_intents where owner_id='${owner.ownerId}' and sku='ZIWEI-IDENTITY-P0' and status='completed' and price_la=720`)).toBe("1");
      await expect(page.locator("main")).toContainText(lockedTail);
      const upgraded = fixture("read", owner.ownerId, {...chart, reportId});
      expect(upgraded.upgradePreview.coverage).toEqual({openedSections: 9, lockedSections: 0, openedPalaces: 12, lockedPalaces: 0});
      expect(upgraded.reportVersionId).toBe(originalVersionId);
      const spent = database(`select count(*) from wallet_transactions t join wallet_accounts a on a.id=t.wallet_id where a.owner_id='${owner.ownerId}' and t.kind='spend'`);
      await page.reload(); await expect(page.locator("main")).toContainText(lockedTail);
      expect(database(`select count(*) from wallet_transactions t join wallet_accounts a on a.id=t.wallet_id where a.owner_id='${owner.ownerId}' and t.kind='spend'`)).toBe(spent);
    });
    test("offer and top-up controls remain live after soft navigation", async ({page}) => {
      const owner = await account(page.context()); const chart = await createChart(page);
      if (viewport.width >= 1024) await page.getByRole("tablist").getByRole("tab", {name: "Tổng quan", exact: true}).click();
      await page.getByTestId("fd109-completion").getByRole("link").click(); await page.waitForURL(/chon-luan-giai/);
      const ladder = page.getByTestId("offer-ladder"); await expect(ladder).toBeVisible();
      for (const sku of ["ZIWEI-NATAL-EXCERPT-P0", "ZIWEI-IDENTITY-P0"]) {
        const card = ladder.locator(`article[data-sku="${sku}"]`); await card.getByRole("button").click();
        await expect(page.locator(".offer-ladder-summary")).toContainText(sku.includes("WEALTH") ? "120" : sku.includes("EXCERPT") ? "240" : "960");
      }
      const picker = ladder.locator(".palace-picker");
      await expect(picker.getByRole("button")).toHaveCount(12);
      for (const button of await picker.getByRole("button").all()) {
        await button.click(); await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator(".offer-ladder-summary")).toContainText("120");
      }
      for (const sku of ["ZIWEI-RELATIONSHIP-P0", "ZIWEI-CAREER-P0", "ZIWEI-YEAR-2026-P0", "ZIWEI-COMBO-2026-P0"]) {
        await expect(ladder.locator(`article[data-sku="${sku}"]`).getByRole("button")).toHaveCount(0);
      }
      await page.locator('.offer-ladder-summary .button-primary').click();
      await page.locator('dialog.unlock-sheet a[href*="/nap-la"]').click();
      for (const name of ["Hội viên", "Luận giải", "Nạp Lá"]) await page.getByRole("tab", {name, exact: true}).click();
      for (const id of ["LA-ENTRY-300", "LA-START-1100", "LA-DISCOVER-3000", "LA-LIBRARY-8000"]) {
        await page.locator(`[data-pack-id="${id}"]`).click(); await expect(page.locator(`[data-pack-id="${id}"]`)).toHaveAttribute("aria-checked", "true");
      }
      expect(database(`select count(*) from commerce_orders where owner_id='${owner.ownerId}'`)).toBe("0");
      expect(chart.chartId).toBeTruthy();
    });
    test("owned missing evidence → readable error → restore → real retry", async ({page}) => {
      const owner = await account(page.context()); fixture("fund", owner.ownerId); const chart = await createChart(page);
      const dialog = await preview(page, chart.chartId); fixture("evidence_off", owner.ownerId, chart);
      try {
        await dialog.getByTestId("contextual-palace-unlock").click();
        await expect(dialog.getByRole("alert")).toContainText("WALLET_EVIDENCE_MISSING");
        await expect(dialog.getByRole("alert")).toContainText("đang");
      } finally {fixture("evidence_restore", owner.ownerId, chart);}
      await dialog.getByRole("button", {name: "Thử lại", exact: true}).click();
      await expect(dialog.getByRole("button", {name: "Xác nhận mở", exact: true})).toBeEnabled();
      expect(database(`select count(*) from wallet_transactions t join wallet_accounts a on a.id=t.wallet_id where a.owner_id='${owner.ownerId}' and t.kind='spend'`)).toBe("0");
    });
    test("palace feedback → atomic refund → persistent result → related locked palace", async ({page}) => {
      // Freeze near the real server clock so the one-hour analytics ingress gate remains real.
      await page.clock.setFixedTime(new Date());
      const owner = await account(page.context()); fixture("fund", owner.ownerId); const chart = await createChart(page);
      const balance = async () => WalletBalanceV1Schema.parse(await (await page.request.get("/api/commerce/wallet/balance")).json());
      const before = await balance();
      const dialog = await preview(page, chart.chartId); await dialog.getByTestId("contextual-palace-unlock").click();
      await dialog.getByRole("button", {name: "Xác nhận mở", exact: true}).click();
      await expect(dialog.getByTestId("contextual-unlock-success")).toBeVisible();
      const reportId = await readyReader(page, owner.ownerId, chart);
      const afterSpend = await balance(); expect(before.totalLa - afterSpend.totalLa).toBe(120);
      const feedback = page.locator('[id="ziwei.palace.wealth"] .part-feedback');
      await expect(feedback).toHaveCount(1);
      const feedbackResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/commerce/feedback/parts" && response.request().method() === "POST");
      await feedback.getByRole("button", {name: "Không đúng", exact: true}).click();
      expect((await feedbackResponse).status()).toBe(200);
      const claimResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/commerce/wallet/guarantee-claim" && response.request().method() === "POST");
      await feedback.getByRole("button", {name: "Yêu cầu hoàn Lá và khóa lại phần này", exact: true}).click();
      const response = await claimResponse; expect(response.status()).toBe(200);
      const request = response.request().postDataJSON();
      expect(request).toMatchObject({chartId: chart.chartId, reportId, partId: "ziwei.palace.wealth", rating: "inaccurate"});
      const restored = GuaranteeClaimResultV1Schema.parse(await response.json());
      expect(restored).toMatchObject({amountLaRestored: 120, sku: "ZIWEI-PALACE-WEALTH-P0"});
      const notice = page.getByTestId("guarantee-result-notice");
      await expect(notice).toBeVisible(); await expect(notice).toContainText("Đã hoàn 120 Lá");
      for (const name of ["part_feedback", "guarantee_claimed"]) {
        await expect.poll(() => database(`select count(*) from analytics_events where user_id='${owner.ownerId}' and name='${name}' and properties->>'section_id'='ziwei.palace.wealth'`)).toBe("1");
        const properties = JSON.parse(database(`select properties from analytics_events where user_id='${owner.ownerId}' and name='${name}' and properties->>'section_id'='ziwei.palace.wealth'`));
        expect(properties.sku).toBe("ZIWEI-PALACE-WEALTH-P0");
        expect(JSON.stringify(properties)).not.toContain(chart.chartId); expect(JSON.stringify(properties)).not.toContain(reportId);
        if (name === "guarantee_claimed") expect(properties.amount_restored).toBe(120);
      }
      // Await actual RSC authorization removing the revoked reader before using its result.
      await expect(page.locator('[id="ziwei.palace.wealth"]')).toHaveCount(0);
      await expect(notice).toBeVisible();
      const assertRestored = async () => expect(await balance()).toMatchObject({totalLa: before.totalLa, purchasedLa: before.purchasedLa, promotionalLa: before.promotionalLa});
      await assertRestored();
      const replay = await page.request.post("/api/commerce/wallet/guarantee-claim", {headers: {origin: canonical}, data: request});
      expect(replay.status()).toBe(200);
      const replayed = GuaranteeClaimResultV1Schema.parse(await replay.json());
      expect(replayed.claimId).toBe(restored.claimId); expect(replayed.receipt.transactionId).toBe(restored.receipt.transactionId);
      await assertRestored();
      const second = await page.request.post("/api/commerce/wallet/guarantee-claim", {headers: {origin: canonical}, data: {...request, idempotencyKey: randomUUID()}});
      expect(second.ok()).toBe(false); expect((await second.json()).code).toBe("GUARANTEE_ALREADY_CLAIMED"); await assertRestored();
      const related = restored.relatedPalaceSuggestion.palaceId.replace(/^ziwei\.palace\./, "");
      expect(related).toMatch(/^(life|siblings|spouse|children|wealth|health|travel|friends|career|property|fortune|parents)$/);
      const href = `/la-so/${chart.chartId}?tab=palaces&open=${related}`;
      await expect(notice.getByRole("link")).toHaveAttribute("href", href);
      await page.emulateMedia({media: "print"}); await expect(notice).toBeHidden(); await page.emulateMedia({media: "screen"});
      await notice.getByRole("link").click(); await page.waitForURL(canonical + href);
      await expect(page.getByTestId("fd109-preview-dialog")).toBeVisible();
      await expect(page.getByTestId("contextual-palace-unlock")).toBeEnabled();
      const relocked = await preview(page, chart.chartId);
      await expect(relocked.getByTestId("contextual-palace-unlock")).toBeEnabled();
      expect(await page.content()).not.toContain("LSV61_PRIVATE_TAIL_ziwei_palace_wealth");
      const denied = await page.request.get(`/bao-cao/${reportId}`);
      expect(denied.status()).toBe(404); expect(await denied.text()).not.toContain("LSV61_PRIVATE_TAIL_ziwei_palace_wealth");
      // Ordinary free feedback still navigates to a real related dialog in English.
      await page.goto(`/en/la-so/${chart.chartId}`);
      if (viewport.width >= 1024) await page.getByRole("tablist").getByRole("tab", {name: "Overview", exact: true}).click();
      const free = page.locator('[data-testid="fd109-free-result"] .part-feedback').first();
      await free.getByRole("button", {name: "Not accurate", exact: true}).click();
      const englishLink = free.getByRole("link"); await expect(englishLink).toHaveAttribute("href", new RegExp(`^/en/la-so/${chart.chartId}\\?tab=palaces&open=(life|siblings|spouse|children|wealth|health|travel|friends|career|property|fortune|parents)$`));
      const englishHref = await englishLink.getAttribute("href"); await englishLink.click(); await page.waitForURL(canonical + englishHref);
      await expect(page.getByTestId("fd109-preview-dialog")).toBeVisible();
    });
    test.afterAll(() => {expect(database("select count(*) from ai_call_attempts")).toBe("0");});
  });
}

// Required package 1.8 callers must survive actual HTTP ingress and durable dispatch.
test.afterAll(async () => {
  const ownerId = database("select id from auth_users where email like 'qa-golden-%@example.test' and email_verified and not is_anonymous order by id limit 1");
  expect(ownerId).toMatch(/^[A-Za-z0-9_-]{1,200}$/);
  fixture("dispatch_business", ownerId);
  const required = ["topup_view", "pack_selected", "la_spent", "upgrade_view", "upgrade_purchased", "return_visit", "unlock_confirm_view", "unlock_confirmed", "part_feedback", "guarantee_claimed", "welcome_grant"];
  const counts = JSON.parse(database("select coalesce(json_object_agg(name,n),'{}'::json) from (select e.name,count(*)::integer n from analytics_events e join auth_users u on u.id=e.user_id where u.email like 'qa-golden-%@example.test' group by e.name) q")) as Record<string, number>;
  for (const name of required) expect(counts[name], `ACTUAL_PACKAGE_1_8_EVENT_${name}`).toBeGreaterThan(0);
  expect(database(`select count(*) from analytics_events e join auth_users u on u.id=e.user_id where u.email like 'qa-golden-%@example.test' and e.properties::text ~ '"(chartId|chartVersionId|birthProfileId|email|displayName|cookie|ip|userAgent)"[ ]*:'`)).toBe("0");
  writeFileSync(path.join(evidence, "package-1-8-event-acceptance.json"), JSON.stringify({required, counts, actualHttpIngressAndDurableDispatch: true, syntheticFundingNotRevenue: true, noProviderCalls: true}), {mode: 0o600});
});
