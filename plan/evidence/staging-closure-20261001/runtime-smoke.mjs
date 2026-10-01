// Owner-authorized staging smoke. Never logs credentials or report/profile prose.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHmac, createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const require = createRequire(`${root}/package.json`);
const databaseRequire = createRequire(`${root}/packages/database/package.json`);
const { chromium, expect } = require("@playwright/test");
const env = Object.fromEntries(readFileSync(
  process.env.STAGING_ENV_FILE ?? "/home/debian/projects/.lasoviet-mvp.env", "utf8",
).split("\n").flatMap((line) => {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
  return match ? [[match[1], match[2].replace(/^["']|["']$/g, "")]] : [];
}));
const email = process.env.STAGING_TEST_EMAIL;
assert.ok(email, "STAGING_TEST_EMAIL is required");
const origin = process.env.STAGING_ORIGIN ?? "https://lasoviet.net";
assert.equal(origin, "https://lasoviet.net", "Only the approved canonical origin may receive the session cookie");
const expected = process.env.EXPECTED_RELEASE_SHA;
assert.match(expected ?? "", /^[a-f0-9]{40}$/, "EXPECTED_RELEASE_SHA is required");
const services = ["web", "api", "worker"].map((service) => {
  const name = `lasoviet-mvp-${service}-1`;
  const data = JSON.parse(execFileSync("docker", ["inspect", name], { encoding: "utf8" }))[0];
  assert.equal(data.Config.Image.split(":sha-")[1], expected);
  assert.equal(data.State.Health.Status, "healthy");
  return { service, revision: expected, health: "healthy" };
});
const ip = execFileSync("docker", ["inspect", "lasoviet-mvp-postgres-1", "--format",
  "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"], { encoding: "utf8" }).trim();
const url = new URL(env.DATABASE_URL);
url.hostname = ip;
url.port = "5432";
const sql = databaseRequire("postgres")(url.toString(), {
  connection: { default_transaction_read_only: "on" },
});
const evidence = {
  recordedAt: new Date().toISOString(), origin, services, checks: [], blockers: [], overall: "RUNNING",
  boundary: "Real deployed services; existing verified staging account. Normal welcome-grant and analytics side effects permitted. No orders/unlocks/refunds requested. SQL read-only; AI/job counters checked.",
};
let browser;
let countersBefore;
const counters = async () => {
  const [row] = await sql`select
    (select count(*)::int from ai_call_attempts) as aiCalls,
    (select count(*)::int from report_queue_jobs) as queueJobs,
    (select count(*)::int from report_reservations) as reservations`;
  return row;
};
async function check(name, run) {
  try {
    await run();
    evidence.checks.push({ name, status: "PASS" });
    console.log(`${name}: PASS`);
  } catch (error) {
    // Do not persist exception messages that may include private URLs/response data.
    evidence.checks.push({ name, status: "FAIL", errorType: error.name });
    console.log(`${name}: FAIL (${error.name})`);
  }
}
try {
  assert.equal((await sql`show default_transaction_read_only`)[0].default_transaction_read_only, "on");
  const publicResponse = await fetch(`${origin}/`, { headers: { "cache-control": "no-cache" } });
  const loopbackResponse = await fetch("http://127.0.0.1:63423/", { headers: { "cache-control": "no-cache" } });
  assert.equal(publicResponse.status, 200);
  assert.equal(loopbackResponse.status, 200);
  const assets = (html) => [...new Set([...html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)]
    .map(match => new URL(match[1], origin).pathname))].sort();
  const publicAssets = assets(await publicResponse.text());
  const loopbackAssets = assets(await loopbackResponse.text());
  assert.ok(publicAssets.length > 3, "Build assets must be present");
  assert.deepEqual(publicAssets, loopbackAssets, "Canonical origin must expose the deployed loopback build");
  evidence.routing = {
    publishedLoopback: execFileSync("docker", ["port", "lasoviet-mvp-web-1"], { encoding: "utf8" }).trim(),
    matchingBuildAssetCount: publicAssets.length,
    assetSetHash: createHash("sha256").update(publicAssets.join("\n")).digest("hex"),
  };
  assert.match(evidence.routing.publishedLoopback, /127\.0\.0\.1:63423/);
  countersBefore = await counters();
  const [session] = await sql`
    select s.token, u.id as owner_id from auth_sessions s
    join auth_users u on u.id=s.user_id
    where u.email=${email} and u.email_verified=true and u.is_anonymous=false
      and s.expires_at>now() order by s.expires_at desc limit 1`;
  assert.ok(session, "Existing verified session is required");
  const [chart] = await sql`
    select c.id from ziwei_charts c join birth_profiles p on p.id=c.profile_id
    where p.user_id=${session.owner_id} and p.deleted_at is null order by c.created_at desc limit 1`;
  const [report] = await sql`
    select rv.report_id,e.chart_id,rv.locale,rv.prompt_version,e.scope from report_versions rv
    join commerce_entitlements e on e.id=rv.entitlement_id
    where e.owner_id=${session.owner_id} and e.revoked_at is null
      and (e.expires_at is null or e.expires_at>now())
      and e.sku='ZIWEI-IDENTITY-P0' and rv.locale='vi'
      and rv.prompt_version='ziwei.comprehensive.prompt.v4.1.2-sensitivity'
      and e.scope->'sections' @> '["palaceReadings","currentDecadal","annualSnapshot"]'::jsonb
      and rv.template_version='ziwei-comprehensive-html.v2'
    order by rv.created_at desc limit 1`;
  assert.ok(chart);
  browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: origin, viewport: { width: 390, height: 844 } });
  const signature = createHmac("sha256", env.BETTER_AUTH_SECRET).update(session.token).digest("base64");
  await context.addCookies([{
    name: origin.startsWith("https:") ? "__Secure-better-auth.session_token" : "better-auth.session_token",
    value: `${session.token}.${signature}`, url: origin,
  }]);
  const page = await context.newPage();
  for (const locale of ["vi", "en"]) {
    await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: origin }]);
    const prefix = locale === "en" ? "/en" : "";
    await check(`FD109 verified ${locale}`, async () => {
      const response = await page.goto(`${prefix}/la-so/${chart.id}`);
      assert.equal(response.status(), 200);
      await expect(page.getByTestId("fd109-free-result")).toBeVisible();
      assert.equal(await page.locator('[data-free-result-block="insights"] article').count(), 2);
      await expect(page.getByTestId("fd109-sticky")).toBeHidden();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    });
    await check(`welcome notice ${locale}`, async () => {
      // Fresh browser-local state prevents an in-flight initial notice request
      // from racing a removeItem/reload in an already mounted layout.
      const fresh = await browser.newContext({ baseURL: origin });
      try {
        await fresh.addCookies(await context.cookies());
        const freshPage = await fresh.newPage();
        await freshPage.goto(`${prefix}/la-so/${chart.id}`);
        const notice = freshPage.locator(".welcome-grant-notice");
        await expect(notice).toBeVisible();
        await expect(notice).toContainText("60");
        await notice.getByRole("button").click();
        await expect(notice).toHaveCount(0);
        await freshPage.reload();
        await expect(notice).toHaveCount(0);
      } finally { await fresh.close(); }
    });
    await check(`account/top-up page availability ${locale}`, async () => {
      assert.equal((await page.goto(`${prefix}/nap-la`)).status(), 200);
      for (const pack of ["LA-ENTRY-300", "LA-START-1100", "LA-DISCOVER-3000", "LA-LIBRARY-8000"]) {
        await expect(page.locator(`[data-pack-id="${pack}"]`)).toBeVisible();
      }
      assert.equal((await page.goto(`${prefix}/tai-khoan`)).status(), 200);
    });
  }
  await check("existing welcome grant durable replay", async () => {
    const first = await context.request.get("/api/commerce/wallet/balance");
    assert.equal(first.status(), 200);
    assert.match(first.headers()["cache-control"], /no-store/);
    const a = await first.json();
    const responses = await Promise.all(Array.from({ length: 4 }, () =>
      context.request.get("/api/commerce/wallet/balance")));
    for (const response of responses) {
      assert.equal(response.status(), 200);
      assert.deepEqual(await response.json(), a);
    }
    const rows = await sql`
      select t.id,l.bucket,l.amount_la from wallet_transactions t
      join wallet_accounts w on w.id=t.wallet_id
      join wallet_ledger_entries l on l.transaction_id=t.id
      where w.owner_id=${session.owner_id} and t.idempotency_key=${`wallet-welcome:${session.owner_id}`}`;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].bucket, "promotional");
    assert.equal(rows[0].amount_la, 60);
  });
  await check("anonymous wallet denied", async () => {
    const anonymous = await browser.newContext({ baseURL: origin });
    assert.equal((await anonymous.request.get("/api/commerce/wallet/balance")).status(), 401);
    await anonymous.close();
  });
  if (process.env.RUN_QUOTE_ANALYTICS_SMOKE === "1") {
    evidence.boundary += " Additional opt-in: two pending quote intents and bounded telemetry replay; still no orders/unlocks/refunds.";
    await check("catalog baseline quotes/replay/reserved guard", async () => {
      const [candidate] = await sql`
        select c.id,v.id as version_id from ziwei_charts c
        join birth_profiles p on p.id=c.profile_id
        join ziwei_chart_versions v on v.chart_id=c.id
        where p.user_id=${session.owner_id} and p.deleted_at is null
          and not exists (select 1 from commerce_entitlements e
            where e.owner_id=${session.owner_id} and e.chart_id=c.id
              and e.sku in ('ZIWEI-IDENTITY-P0','ZIWEI-PALACE-LIFE-P0') and e.revoked_at is null)
          and not exists (select 1 from wallet_purchase_intents i join wallet_transactions t on t.purchase_intent_id=i.id
            where i.chart_id=c.id and t.kind='spend')
        order by v.created_at desc limit 1`;
      assert.ok(candidate, "Existing eligible chart is required; never alter ownership to manufacture a pass");
      const balanceBefore = await (await context.request.get("/api/commerce/wallet/balance")).json();
      for (const [sku, amount] of [["ZIWEI-PALACE-LIFE-P0", 120], ["ZIWEI-IDENTITY-P0", 960]]) {
        const data = { chartId: candidate.id, chartVersionId: candidate.version_id, locale: "vi", sku };
        const response = await context.request.post("/api/commerce/wallet/purchase-intents", { data });
        assert.equal(response.status(), 200);
        const quote = await response.json();
        assert.equal(quote.sku, sku);
        assert.equal(quote.amountLa, amount);
        assert.equal(quote.status, "pending");
        const replay = await context.request.post("/api/commerce/wallet/purchase-intents", { data });
        assert.equal(replay.status(), 200);
        assert.equal((await replay.json()).id, quote.id);
        const [row] = await sql`select owner_id,chart_id,chart_version_id,sku,price_la,locale
          from wallet_purchase_intents where id=${quote.id}`;
        assert.equal(row.owner_id, session.owner_id);
        assert.equal(row.chart_id, candidate.id);
        assert.equal(row.chart_version_id, candidate.version_id);
        assert.equal(row.sku, sku);
        assert.equal(row.locale, "vi");
        assert.equal(row.price_la, amount);
      }
      const reserved = await context.request.post("/api/commerce/wallet/purchase-intents", {
        data: { chartId: candidate.id, chartVersionId: candidate.version_id, locale: "vi", sku: "ZIWEI-RELATIONSHIP-P0" },
      });
      assert.equal(reserved.status(), 400);
      assert.deepEqual(await (await context.request.get("/api/commerce/wallet/balance")).json(), balanceBefore);
    });
    await check("analytics real ingest/dedup/privacy", async () => {
      const idempotencyKey = `staging-closure:${randomUUID()}`;
      const data = {
        version: 1, idempotencyKey, occurredAt: new Date().toISOString(),
        event: { name: "topup_view", properties: { pack_id: "LA-ENTRY-300", placement: "staging_closure" } },
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await context.request.post("/api/analytics/events", { data });
        assert.ok(response.ok());
      }
      const rows = await sql`select name,properties,user_id from analytics_events where idempotency_key=${idempotencyKey}`;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].name, "topup_view");
      assert.equal(rows[0].user_id, session.owner_id);
      assert.deepEqual(rows[0].properties, data.event.properties);
      const badKey = `staging-closure-rejected:${randomUUID()}`;
      const rejected = await context.request.post("/api/analytics/events", {
        data: { ...data, idempotencyKey: badKey,
          event: { ...data.event, properties: { ...data.event.properties, chart_id: "forbidden-synthetic-marker" } } },
      });
      assert.equal(rejected.status(), 400);
      assert.equal((await sql`select id from analytics_events where idempotency_key=${badKey}`).length, 0);
    });
  }
  if (!report) evidence.blockers.push("No owned comprehensive report for reader smoke");
  else {
    await context.addCookies([{ name: "NEXT_LOCALE", value: "vi", url: origin }]);
    for (const width of [390, 1440]) {
      await check(`owned reader navigation/print ${width}`, async () => {
        await page.setViewportSize({ width, height: 900 });
        assert.equal((await page.goto(`/bao-cao/${report.report_id}`)).status(), 200);
        await expect(page.locator(".report-reader-root")).toBeVisible();
        await expect(page.locator(".report-palace-card")).toHaveCount(12);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (width < 1200) {
          const trigger = page.getByRole("button", { name: "Xem lá số", exact: true });
          await trigger.click();
          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();
          await expect(dialog.locator(".report-chart-lines polygon")).toBeVisible();
          await expect(dialog.locator(".report-chart-lines line")).toBeVisible();
          assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
          await page.keyboard.press("Escape");
          await expect(dialog).toHaveCount(0);
          await expect(trigger).toBeFocused();
          await trigger.click();
          await page.keyboard.press("Tab");
          const before = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
          await page.keyboard.press("ArrowRight");
          assert.notEqual(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), before);
          await page.keyboard.press("Enter");
          await expect(dialog).toHaveCount(0);
        } else {
          await expect(page.locator(".report-navigation-chart")).toBeVisible();
          await expect(page.locator(".report-navigation-chart .report-chart-lines polygon")).toBeVisible();
          await expect(page.locator(".report-navigation-chart .report-chart-lines line")).toBeVisible();
          await page.locator(".report-navigation-chart button.cell").nth(3).click();
        }
        await expect.poll(() => page.evaluate(
          () => document.activeElement?.matches(".report-palace-card > summary"),
        )).toBe(true);
        await page.screenshot({ path: `/tmp/lsv-closure-reader-${width}-dark.png`, fullPage: true });
        await page.evaluate(() => document.documentElement.dataset.theme = "light");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.screenshot({ path: `/tmp/lsv-closure-reader-${width}-light.png`, fullPage: true });
        const states = await page.locator(".report-palace-card").evaluateAll(cards => cards.map(card => card.open));
        await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
        await page.emulateMedia({ media: "print" });
        assert.equal(await page.locator(".report-palace-card").evaluateAll(cards => cards.every(card => card.open)), true);
        await expect(page.locator(".report-chart:visible")).toHaveCount(1);
        await expect(page.locator(".report-chart-mobile-bar")).toBeHidden();
        await page.emulateMedia({ media: "screen" });
        await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
        assert.deepEqual(await page.locator(".report-palace-card").evaluateAll(cards => cards.map(card => card.open)), states);
      });
    }
    await check("private report anonymous denied", async () => {
      const anonymous = await browser.newContext({ baseURL: origin });
      const response = await anonymous.request.get(`/bao-cao/${report.report_id}`);
      assert.ok([401, 403, 404].includes(response.status()) || response.url().includes("/dang-nhap"));
      await anonymous.close();
    });
  }
  evidence.aiJobCounters = { before: countersBefore, after: await counters() };
  await check("no new recorded AI calls/report jobs", async () => {
    assert.deepEqual(evidence.aiJobCounters.after, evidence.aiJobCounters.before);
  });
} catch (error) {
  evidence.blockers.push(`Setup/runtime exception (${error.name}); incomplete smoke is not acceptance`);
} finally {
  await browser?.close();
  await sql.end();
  evidence.overall = evidence.blockers.length ? "BLOCKED"
    : evidence.checks.some(check => check.status === "FAIL") ? "FAIL" : "PASS";
  writeFileSync(new URL("./runtime-smoke.json", import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
}
process.exitCode = evidence.overall === "PASS" ? 0 : 1;
