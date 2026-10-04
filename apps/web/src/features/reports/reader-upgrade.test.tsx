import {beforeEach, describe, expect, it, vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import type {ReportUpgradePreviewV1} from "@lasoviet/contracts";
let uiLocale: "vi" | "en" = "vi";
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn(), refresh: vi.fn()})}));
vi.mock("../commerce/contextual-unlock", () => ({useUnlockLabels: () => ({})}));
vi.mock("../commerce/unlock-sheet", () => ({UnlockSheet: () => null}));
vi.mock("../commerce/use-wallet-quotes", () => ({useWalletQuotes: () => ({status: "ready", retry: vi.fn(),
  quotes: [{sku: "ZIWEI-IDENTITY-P0", state: "available", priceLa: 720, creditLa: 240,
    discountLa: 0, creditExpiresAt: "2026-10-11T12:00:00.000Z", creditSourceSkus: ["ZIWEI-NATAL-EXCERPT-P0"]}],
})}));
vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../messages/vi/reports.json")).default;
  const enMessages = (await import("../../../messages/en/reports.json")).default;
  return {useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
    let value: unknown = uiLocale === "vi" ? viMessages : enMessages;
    for (const part of key.split(".")) value = (value as Record<string, unknown>)?.[part];
    if (typeof value !== "string") return key;
    return Object.entries(values).reduce((result, [name, replacement]) => result.replaceAll("{" + name + "}", String(replacement)), value);
  }};
});
import {ReaderUpgrade} from "./reader-upgrade";

const preview: ReportUpgradePreviewV1 = {
  version: 1, reportVersionId: "report-version-1", chartVersionId: "chart-version-1", locale: "vi",
  coverage: {openedSections: 4, lockedSections: 5, openedPalaces: 2, lockedPalaces: 10},
  lockedPart: {palaceId: "ziwei.palace.wealth", title: "Nguồn cung Tài Bạch đã lưu",
    clippedSentences: ["Đoạn mở đầu thực tế được cắt từ đúng phiên bản báo cáo đang đọc…"], lengthHint: 3},
};
const props = {locale: "vi" as const, chartId: "chart-1", chartVersionId: "chart-version-1",
  reportVersionId: "report-version-1", reportLocale: "vi" as const, upgradePreview: preview};

beforeEach(() => {uiLocale = "vi";});
describe("authorized reader preview presentation", () => {
  it("renders only the clipped projection, true distinct coverage and actual API terms", () => {
    const html = renderToStaticMarkup(<ReaderUpgrade {...props} />);
    expect(html).toContain(preview.lockedPart!.title);
    expect(html).toContain(preview.lockedPart!.clippedSentences[0]);
    expect(html).toContain("4 đã mở · 5 còn khóa");
    expect(html).toContain("2 đã mở · 10 còn khóa");
    expect(html).toContain("720 Lá");
    expect(html).toContain("240 Lá");
    expect(html).toContain('class="locked-preview-blur-bars"');
    expect(html).toContain('aria-hidden="true"');
  });
  it.each(["reportVersionId", "chartVersionId", "locale"] as const)("omits stale or mismatched source %s while retaining current quote", field => {
    const stale = {...preview, [field]: field === "locale" ? "en" as const : "foreign-version"};
    const html = renderToStaticMarkup(<ReaderUpgrade {...props} upgradePreview={stale} />);
    expect(html).not.toContain(preview.lockedPart!.title);
    expect(html).not.toContain(preview.lockedPart!.clippedSentences[0]);
    expect(html).not.toContain("reader-upgrade-section-coverage");
    expect(html).toContain("720 Lá");
  });
  it("localizes EN interface counts without translating the exact VI source", () => {
    uiLocale = "en";
    const html = renderToStaticMarkup(<ReaderUpgrade {...props} locale="en" />);
    expect(html).toContain("Other report sections: 4 open · 5 locked");
    expect(html).toContain("Palaces: 2 open · 10 locked");
    expect(html).toContain(preview.lockedPart!.clippedSentences[0]);
    expect(html).toContain('href="/en/nap-la"');
  });
  it("shows coverage without fabricating clipped prose when no qualifying source exists", () => {
    const html = renderToStaticMarkup(<ReaderUpgrade {...props} upgradePreview={{...preview, lockedPart: undefined}} />);
    expect(html).toContain("reader-upgrade-section-coverage");
    expect(html).not.toContain("reader-upgrade-preview\"");
    expect(html).not.toContain("secure-locked-preview-card");
  });
});
