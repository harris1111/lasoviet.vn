import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

let mockLocale = "vi";
vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../../../../messages/vi/reports.json")).default;
  const enMessages = (await import("../../../../../../messages/en/reports.json")).default;
  return {
    useTranslations: (namespace?: string) => {
      return (key: string, values?: Record<string, unknown>) => {
        const messages = mockLocale === "en" ? enMessages : viMessages;
        let val: unknown = messages;
        for (const segment of key.split(".")) {
          val = (val as Record<string, unknown>)?.[segment];
        }
        if (typeof val === "string") {
          if (values) {
            return Object.entries(values).reduce(
              (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
              val,
            );
          }
          return val;
        }
        return key;
      };
    },
  };
});

vi.mock("../../../../../auth/resolve-current-actor", () => {
  class VerifiedAccountResolutionError extends Error {
    constructor(code: string) {
      super(code);
      this.name = "VerifiedAccountResolutionError";
    }
  }
  return {
    VerifiedAccountResolutionError,
    resolveVerifiedAccountActor: vi.fn(),
  };
});

vi.mock("../../../../../features/account/account-data-loader", () => ({
  accountDataLoader: {
    loadLibrary: vi.fn(),
    loadOrders: vi.fn().mockResolvedValue({
      ok: true,
      value: { version: 1, orders: [], items: [], totalCount: 0 },
    }),
    loadWalletBalance: vi.fn().mockResolvedValue({
      ok: true,
      value: { version: 1, stateVersion: 1, totalLa: 0, purchasedLa: 0, promotionalLa: 0, updatedAt: "2026-09-27T10:00:00.000+07:00" },
    }),
  },
}));

vi.mock("../../../../../features/reports/load-free-identity-preview", () => ({
  freeIdentityPreviewLoader: {
    loadTopics: vi.fn(),
  },
}));

vi.mock("../../../../../features/ziwei/load-ziwei-chart", () => ({
  loadZiweiChart: {
    loadChart: vi.fn(),
  },
}));

import {
  resolveVerifiedAccountActor,
  VerifiedAccountResolutionError,
} from "../../../../../auth/resolve-current-actor";
import { accountDataLoader } from "../../../../../features/account/account-data-loader";
import { freeIdentityPreviewLoader } from "../../../../../features/reports/load-free-identity-preview";
import { loadZiweiChart } from "../../../../../features/ziwei/load-ziwei-chart";
import PaidTopicSelectionPage from "./page";
import { loadWalletQuotes } from "../../../../../features/commerce/load-wallet-quotes";
import { LA_PRODUCT_CATALOG, ZIWEI_PALACE_IDS } from "@lasoviet/contracts";
import { CANONICAL_BRANCH_SEQUENCE } from "../../../../../features/ziwei/ziwei-chart-relations";
vi.mock("../../../../../features/commerce/load-wallet-quotes", () => ({ loadWalletQuotes: vi.fn() }));


const chartId = "chart-1";
const chartVersionId = "ver-1";
const actor = { kind: "account" as const, userId: "user-1", sessionId: "session-1", requestId: "req-1" };
const chart = { transformations: [], soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", palaces: ZIWEI_PALACE_IDS.map((id, index) => ({ id, earthlyBranchId: CANONICAL_BRANCH_SEQUENCE[index], stars: [] })) };
const available = () => ({ version: 1 as const, chartId, chartVersionId, locale: "vi" as const, quotedAt: "2026-10-04T00:00:00Z", quotes: LA_PRODUCT_CATALOG.map(product => ({ sku: product.sku, state: product.availability === "active" ? "available" : "coming_soon", basePriceLa: product.priceLa, priceLa: product.availability === "active" ? product.priceLa : null, creditLa: 0, discountLa: 0, creditExpiresAt: null, creditSourceSkus: [], reportId: null, reportState: null })) });
async function render(query?: { offer?: string; palace?: string }) {
  return renderToStaticMarkup(await PaidTopicSelectionPage({ params: Promise.resolve({ chartId, locale: mockLocale }), searchParams: query ? Promise.resolve(query) : undefined }));
}
describe("authorized offer ladder page", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mockLocale = "vi";
    vi.mocked(freeIdentityPreviewLoader.loadTopics).mockResolvedValue({ ok: true, value: { version: 1, chartId, chartVersionId, offers: [] } as never });
    vi.mocked(loadZiweiChart.loadChart).mockResolvedValue({ ok: true, value: { chartId, chartVersionId, chart, birthSummary: { displayName: "Minh An" } } as never });
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor);
    vi.mocked(accountDataLoader.loadLibrary).mockResolvedValue({ ok: true, value: { version: 1, items: [], groups: [], totalCount: 0 } as never });
    vi.mocked(loadWalletQuotes).mockResolvedValue(available() as never);
  });
  it("renders only sellable ladder cards in time tiers, twelve scored palaces and the lifetime default", async () => {
    const html = await render();
    expect(html).toContain("Luận giải cho lá số của Minh An");
    for (const sku of ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-NATAL-EXCERPT-P0", "ZIWEI-IDENTITY-P0", "ZIWEI-TODAY-P0"]) expect(html).toContain(`data-sku="${sku}"`);
    // Products the catalog still holds back never appear, and nothing says "coming soon".
    for (const sku of ["ZIWEI-RELATIONSHIP-P0", "ZIWEI-CAREER-P0", "ZIWEI-YEAR-2026-P0", "ZIWEI-COMBO-2026-P0", "ZIWEI-MONTHLY-P0"]) expect(html).not.toContain(`data-sku="${sku}"`);
    expect(html).not.toContain("Sắp mở");
    expect(html).toContain("Bạn sẽ biết"); expect(html).toContain("Đáng nhất"); expect(html).toContain('class="offer-ladder-rail"'); expect(html).toContain("offer-card-tier"); expect(html).toContain("#offer-tier-first-"); expect(html).toContain("Độ mạnh cấu trúc:");
    expect(html).toContain('id="offer-tier-today"'); expect(html).toContain('id="offer-tier-life"');
    const ladder = html.slice(html.indexOf('data-testid="offer-ladder"'), html.indexOf('id="hoi-vien"'));
    expect(ladder).not.toMatch(/VND|VNĐ|₫/);
  });
  it("flags the card that matches the visitor's question only when they arrived with one", async () => {
    expect(await render()).not.toContain("Hợp với câu bạn vừa hỏi");
  });
  it("shows API rollover rather than a fixed upgrade price", async () => {
    const value = available();
    const lifetime = value.quotes.find(item => item.sku === "ZIWEI-IDENTITY-P0")!;
    Object.assign(lifetime, { basePriceLa: 960, priceLa: 840, creditLa: 120, creditExpiresAt: "2026-10-10T00:00:00Z", creditSourceSkus: ["ZIWEI-PALACE-LIFE-P0"] });
    vi.mocked(loadWalletQuotes).mockResolvedValue(value as never);
    const html = await render(); expect(html).toContain("chỉ thêm 840 Lá"); expect(html).toContain("Mở – 840 Lá");
  });
  it("preserves authoritative pending, failed and readable ownership without purchase", async () => {
    for (const reportState of ["ready", "processing", "unavailable"] as const) {
      const value = available();
      for (const quote of value.quotes.filter(item => item.state === "available")) Object.assign(quote, { state: "owned", priceLa: null, reportId: "report-owned", reportState });
      vi.mocked(loadWalletQuotes).mockResolvedValue(value as never);
      const html = await render();
      expect(html).toContain(reportState === "ready" ? "Đọc lại" : "Xem tiến trình");
      expect(html).not.toContain("Mở – 960 Lá"); expect(html).toContain("/bao-cao/report-owned");
    }
  });
  it("allows guest sign-in entry but fails closed when authenticated quote loading fails", async () => {
    vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));
    expect(await render()).toContain("Mở – 1200 Lá"); expect(loadWalletQuotes).not.toHaveBeenCalled();
    vi.mocked(resolveVerifiedAccountActor).mockResolvedValue(actor); vi.mocked(loadWalletQuotes).mockResolvedValue(null);
    const html = await render(); expect(html).toContain("Chưa thể kiểm tra giá hiện tại"); expect(html).not.toContain('data-state="openable"'); expect(html).toContain('data-state="locked"');
  });
  it("accepts closed palace deep links and keeps English unsupported palace sales disabled", async () => {
    expect(await render({ offer: "ziwei-palace", palace: "ziwei.palace.spouse" })).toContain('data-sku="ZIWEI-PALACE-SPOUSE-P0"');
    mockLocale = "en"; vi.mocked(resolveVerifiedAccountActor).mockRejectedValue(new VerifiedAccountResolutionError("ADMIN_AUTH_REQUIRED"));
    const html = await render({ offer: "ziwei-palace", palace: "ziwei.palace.spouse" });
    // English cannot sell a single palace, so that card is not shown at all and nothing offers to open it.
    expect(html).not.toContain('data-sku="ZIWEI-PALACE-SPOUSE-P0"'); expect(html).not.toContain("Mở – 120 Lá");
  });
});
