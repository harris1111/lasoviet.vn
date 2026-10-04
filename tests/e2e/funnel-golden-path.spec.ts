import {expect, test, type BrowserContext, type Page} from "@playwright/test";
import {execFileSync} from "node:child_process";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import path from "node:path";
import {createAnonymousChart} from "./helpers/create-anonymous-chart";

const canonical = "https://lasoviet.net";
const evidence = process.env.LSV_FUNNEL_EVIDENCE_DIRECTORY!;
const identity = JSON.parse(readFileSync(path.join(evidence, "identity.json"), "utf8"));
if (identity.network !== "lsv80-qa" || !identity.builtCandidateNotPublishedArtifact || !identity.noWorkerRunning) throw Error("OWNED_ISOLATED_QA_REQUIRED");
const database = (statement: string) => execFileSync("docker", ["exec", "lsv80-qa-db", "psql", "-U", "qa", "-d", "lsv80_qa", "-Atc", statement], {encoding: "utf8"}).trim();
function fixture(action: string, ownerId: string, chart?: {chartId: string; chartVersionId: string}) {
  return JSON.parse(execFileSync("docker", ["run", "--rm", "-i", "--network", "lsv80-qa", "--env-file", path.join(evidence, "app.env"), "-v", `${identity.sourceRoot}:/app:ro`, "-v", `${evidence}/qa-cert.pem:/qa-cert.pem:ro`, "-w", "/app", "node:24.16.0-bookworm-slim", "node", "tests/e2e/helpers/funnel-qa-fixtures.mjs"], {
    input: JSON.stringify({action, ownerId, ...chart}), encoding: "utf8",
  }));
}
async function account(context: BrowserContext, signIn = true) {
  const email = `qa-golden-${randomUUID()}@example.test`, password = randomUUID() + randomUUID();
  const signup = await context.request.post(`${canonical}/api/auth/sign-up/email`, {headers: {origin: canonical}, data: {name: "Isolated golden path", email, password}});
  expect(signup.ok(), `SUPPORTED_SIGNUP_STATUS_${signup.status()}`).toBe(true);
  let verification = "";
  await expect.poll(() => {
    verification = database(`select request_payload->>'actionUrl' from notification_deliveries where kind='email_verification' and status='sent' and request_payload->>'recipient'='${email}' order by created_at desc limit 1`);
    return Boolean(verification);
  }).toBe(true);
  expect(new URL(verification).origin).toBe(canonical);
  expect((await context.request.get(verification)).ok()).toBe(true);
  if (signIn) expect((await context.request.post(`${canonical}/api/auth/sign-in/email`, {headers: {origin: canonical}, data: {email, password}})).ok()).toBe(true);
  const ownerId = database(`select id from auth_users where email='${email}' and email_verified and not is_anonymous`);
  expect(ownerId).toMatch(/^[A-Za-z0-9_-]{1,200}$/);
  return {email, password, ownerId};
}
async function createChart(page: Page) {
  await page.goto("/");
  const notice = page.locator(".welcome-grant-notice");
  await expect(notice).toBeVisible(); await notice.locator("button").click();
  const chartUrl = await createAnonymousChart(page, "vi");
  const chartId = new URL(chartUrl).pathname.split("/").pop()!;
  expect(chartId).toMatch(/^[a-f0-9-]{36}$/);
  const chartVersionId = database(`select id from ziwei_chart_versions where chart_id='${chartId}' order by created_at desc limit 1`);
  expect(chartVersionId).toMatch(/^[a-f0-9-]{36}$/);
  await expect(page.getByTestId("fd109-free-result")).toBeVisible({timeout: 30_000});
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

for (const viewport of [{name: "mobile", width: 390, height: 844}, {name: "desktop", width: 1440, height: 900}]) {
  test.describe(`real-network funnel ${viewport.name}`, () => {
    test.use({viewport: {width: viewport.width, height: viewport.height}});
    test.beforeEach(async ({page}) => {
      await page.clock.install({time: new Date("2026-10-04T12:00:00.000Z")});
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
      await readyReader(page, owner.ownerId, chart);
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
      await readyReader(page, owner.ownerId, chart);
    });
    test("paid excerpt → reader → real quoted lifetime difference → upgrade", async ({page}) => {
      const owner = await account(page.context()); fixture("fund", owner.ownerId); const chart = await createChart(page);
      await page.goto(`/la-so/${chart.chartId}/chon-luan-giai?offer=ziwei-natal-excerpt`);
      await page.locator('.offer-ladder-summary .button-primary').click();
      const dialog = page.locator("dialog.unlock-sheet"); await expect(dialog).toContainText("240 Lá");
      await dialog.getByRole("button", {name: "Xác nhận mở", exact: true}).click();
      await expect(page.locator(".offer-ladder-summary [role=status]")).toBeVisible();
      await readyReader(page, owner.ownerId, chart);
      await page.locator("#section-strengths-tensions").scrollIntoViewIfNeeded();
      const upgrade = page.locator(".reader-upgrade"); await expect(upgrade).toContainText("720 Lá");
      await upgrade.getByRole("button", {name: "Xem giá và xác nhận nâng cấp", exact: true}).click();
      await expect(page.locator("dialog.unlock-sheet")).toContainText("720 Lá");
      await page.locator("dialog.unlock-sheet").getByRole("button", {name: "Xác nhận mở", exact: true}).click();
      await expect.poll(() => database(`select count(*) from wallet_purchase_intents where owner_id='${owner.ownerId}' and sku='ZIWEI-IDENTITY-P0' and status='completed' and price_la=720`)).toBe("1");
      await expect(page.locator("main")).toContainText("Cung kiểm thử");
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
    test.afterAll(() => {expect(database("select count(*) from ai_call_attempts")).toBe("0");});
  });
}
