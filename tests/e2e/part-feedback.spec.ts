import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { build } = createRequire(require.resolve("vite"))("esbuild");
const stylesRoot = resolve(root, "apps/web/src/styles");
const stylesheet = readFileSync(resolve(stylesRoot, "global.css"), "utf8").replace(/@import "\.\/([^"]+)";/g, (_, name: string) => readFileSync(resolve(stylesRoot, name), "utf8"));
let bundle = "";
test.beforeAll(async () => {
  const result = await build({
    stdin: { resolveDir: resolve(root, "apps/web"), loader: "tsx", contents: `
      import {createRoot} from "react-dom/client";
      import {NextIntlClientProvider} from "next-intl";
      import {PartFeedback} from "./src/features/reports/part-feedback";
      import vi from "./messages/vi/reports.json";
      import en from "./messages/en/reports.json";
      const locale = new URL(location.href).searchParams.get("locale") || "vi";
      createRoot(document.getElementById("fixture")).render(<NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{reports: locale === "vi" ? vi : en}}><PartFeedback chartId="chart-fixture" partId="overview" reportId="report-fixture" sku="ZIWEI-NATAL-EXCERPT-P0" paid locale={locale}/></NextIntlClientProvider>);
    ` },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    alias: { "@lasoviet/contracts": resolve(root, "packages/contracts/src/guarantee-feedback-v1.ts") },
    plugins: [{ name: "canonical-palaces", setup(builder: any) {
      builder.onResolve({ filter: /ziwei-tabs-state$/ }, () => ({ path: "palaces", namespace: "palace-fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "palace-fixture" }, () => ({ contents: 'export const CANONICAL_TAB_PALACE_IDS = ["life","siblings","spouse","children","wealth","health","travel","friends","career","property","fortune","parents"];', loader: "js" }));
    } }, { name: "isolated-router", setup(builder: any) {
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "router", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const useRouter = () => ({refresh: () => {window.fixtureRefresh = true}});", loader: "js" }));
    } }],
  });
  bundle = result.outputFiles[0].text;
});

for (const [locale, width] of [["vi", 390], ["en", 1440]] as const) {
  test(`feedback and explicit guarantee at ${locale} ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const claims: Record<string, unknown>[] = [];
    const analyticsEvents: Record<string, unknown>[] = [];
    const related = { palaceId: "ziwei.palace.travel", palaceName: "Cung Thiên Di", relationType: "opposite", reason: "Related palace" };
    // All network calls are local synthetic fixtures; no account or money is touched.
    await page.route("**/*", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/analytics/events") {
        analyticsEvents.push(route.request().postDataJSON());
        await route.fulfill({ json: { ok: true } });
      } else if (path.endsWith("/feedback/parts")) {
        const input = route.request().postDataJSON();
        await route.fulfill({ json: { feedback: { ...input, id: "feedback", comment: null, createdAt: "2026-09-30T10:00:00Z" }, relatedPalaceSuggestion: related } });
      } else if (path.endsWith("/guarantee-claim")) {
        claims.push(route.request().postDataJSON());
        const balance = { version: 1, stateVersion: 4, totalLa: 240, purchasedLa: 0, promotionalLa: 240, updatedAt: "2026-09-30T10:00:00Z" };
        await route.fulfill({ json: { claimId: "claim", claimNumber: "GC-TEST", status: "approved", amountLaRestored: 240, partId: "overview", sku: "ZIWEI-NATAL-EXCERPT-P0", balance, receipt: { version: 1, commandId: "claim-command", transactionId: "transaction", status: "completed", balance, completedAt: "2026-09-30T10:00:00Z" }, relatedPalaceSuggestion: related, createdAt: "2026-09-30T10:00:00Z" } });
      } else if (path === "/") {
        await route.fulfill({ contentType: "text/html", body: '<html data-theme="light"><meta name="viewport" content="width=device-width, initial-scale=1"><body><main id="fixture" style="padding:16px"></main></body></html>' });
      } else await route.abort();
    });
    await page.goto(`https://feedback.test/?locale=${locale}`);
    await page.addStyleTag({ content: stylesheet });
    await page.addScriptTag({ content: bundle });
    const inaccurate = page.getByRole("button", { name: locale === "vi" ? "Không đúng" : "Not accurate", exact: true });
    await inaccurate.click();
    await expect(page.getByRole("status")).toContainText(locale === "vi" ? "Cảm ơn" : "Thank you");
    await expect.poll(() => analyticsEvents.length).toBe(1);
    expect(analyticsEvents[0]).toMatchObject({
      event: {
        name: "part_feedback",
        properties: { section_id: "overview", feedback: "inaccurate", sku: "ZIWEI-NATAL-EXCERPT-P0", is_free: false },
      },
    });
    expect(claims).toHaveLength(0);
    await expect(page.locator(".part-feedback")).not.toHaveJSProperty("scrollWidth", 0);
    expect(await page.locator(".part-feedback").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByRole("button", { name: locale === "vi" ? "Yêu cầu hoàn Lá và khóa lại phần này" : "Request a Lá refund and lock this part" }).click();
    await expect(page.getByRole("status")).toContainText("240");
    await expect.poll(() => analyticsEvents.length).toBe(2);
    expect(analyticsEvents[1]).toMatchObject({
      idempotencyKey: claims[0]?.idempotencyKey,
      event: {
        name: "guarantee_claimed",
        properties: {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          amount_restored: 240,
          reason: "inaccurate",
          section_id: "overview",
        },
      },
    });
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ chartId: "chart-fixture", partId: "overview", rating: "inaccurate" });
    expect(typeof claims[0]?.idempotencyKey).toBe("string");
    await expect(inaccurate).toBeDisabled();
    await expect(page.locator(".part-feedback a")).toHaveAttribute("href", `${locale === "en" ? "/en" : ""}/la-so/chart-fixture?tab=palaces&open=travel`);
    expect(await page.evaluate(() => (window as any).fixtureRefresh)).toBe(true);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".part-feedback")).not.toBeVisible();
  });
}


for (const [testCase, status, responseBody, expectedMessage] of [
  ["401 unauthorized", 401, { code: "UNAUTHORIZED" }, "Vui lòng đăng nhập tài khoản đã xác minh để yêu cầu hoàn Lá."],
  ["422 unprocessable", 422, { code: "VALIDATION_FAILED" }, "Chưa thể xử lý. Bạn vui lòng thử lại."],
  ["malformed 200 payload", 200, { unexpected: "corrupted_payload" }, "Chưa thể xử lý. Bạn vui lòng thử lại."],
] as const) {
  test(`guarantee failure handling: ${testCase}`, async ({ page }) => {
    const claims: Record<string, unknown>[] = [];
    const analyticsEvents: Record<string, unknown>[] = [];
    await page.route("**/*", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/analytics/events") {
        analyticsEvents.push(route.request().postDataJSON());
        await route.fulfill({ json: { ok: true } });
      } else if (path.endsWith("/feedback/parts")) {
        const input = route.request().postDataJSON();
        await route.fulfill({ json: { feedback: { ...input, id: "feedback", comment: null, createdAt: "2026-09-30T10:00:00Z" } } });
      } else if (path.endsWith("/guarantee-claim")) {
        claims.push(route.request().postDataJSON());
        await route.fulfill({ status, json: responseBody });
      } else if (path === "/") {
        await route.fulfill({ contentType: "text/html", body: "<html data-theme=\"light\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><body><main id=\"fixture\" style=\"padding:16px\"></main></body></html>" });
      } else await route.abort();
    });
    await page.goto("https://feedback.test/?locale=vi");
    await page.addStyleTag({ content: stylesheet });
    await page.addScriptTag({ content: bundle });
    await page.getByRole("button", { name: "Không đúng", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Cảm ơn");
    await expect.poll(() => analyticsEvents.length).toBe(1);
    expect(analyticsEvents[0]).toMatchObject({
      event: { name: "part_feedback" },
    });

    const claimButton = page.getByRole("button", { name: "Yêu cầu hoàn Lá và khóa lại phần này" });

    // Initial claim attempt fails
    await claimButton.click();
    // Await expected localized status text
    await expect(page.getByRole("status")).toContainText(expectedMessage);
    // Button must be re-enabled after failure settles
    await expect(claimButton).toBeEnabled();

    // Replay retry attempt
    await claimButton.click();
    await expect(page.getByRole("status")).toContainText(expectedMessage);
    await expect(claimButton).toBeEnabled();

    // Verify replay retry key stability: claims same idempotencyKey
    expect(claims).toHaveLength(2);
    expect(claims[0]).toMatchObject({ chartId: "chart-fixture", partId: "overview", rating: "inaccurate" });
    expect(typeof claims[0]?.idempotencyKey).toBe("string");
    expect(claims[1]?.idempotencyKey).toBe(claims[0]?.idempotencyKey);

    // Verify no guarantee_claimed telemetry event and no refresh
    expect(analyticsEvents.some((entry) => (entry.event as any)?.name === "guarantee_claimed")).toBe(false);
    expect(await page.evaluate(() => (window as any).fixtureRefresh)).toBeUndefined();
  });
}
