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
      createRoot(document.getElementById("fixture")).render(<NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{reports: locale === "vi" ? vi : en}}><PartFeedback chartId="chart-fixture" partId="overview" reportId="report-fixture" paid locale={locale}/></NextIntlClientProvider>);
    ` },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    alias: { "@lasoviet/contracts": resolve(root, "packages/contracts/src/guarantee-feedback-v1.ts") },
    plugins: [{ name: "isolated-router", setup(builder: any) {
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
    const related = { palaceId: "ziwei.palace.travel", palaceName: "Cung Thiên Di", relationType: "opposite", reason: "Related palace" };
    // All network calls are local synthetic fixtures; no account or money is touched.
    await page.route("**/*", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/feedback/parts")) {
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
    expect(claims).toHaveLength(0);
    await expect(page.locator(".part-feedback")).not.toHaveJSProperty("scrollWidth", 0);
    expect(await page.locator(".part-feedback").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByRole("button", { name: locale === "vi" ? "Yêu cầu hoàn Lá và khóa lại phần này" : "Request a Lá refund and lock this part" }).click();
    await expect(page.getByRole("status")).toContainText("240");
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ chartId: "chart-fixture", partId: "overview", rating: "inaccurate" });
    expect(typeof claims[0]?.idempotencyKey).toBe("string");
    await expect(inaccurate).toBeDisabled();
    await expect(page.locator(".part-feedback a")).toHaveAttribute("href", new RegExp(locale === "en" ? "^/en/la-so/" : "^/la-so/"));
    expect(await page.evaluate(() => (window as any).fixtureRefresh)).toBe(true);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".part-feedback")).not.toBeVisible();
  });
}
