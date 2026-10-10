import { z } from "zod";
import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";
import type { ZiweiPalaceId } from "./normalized-ziwei-chart-v1.js";

export const ROLLOVER_WINDOW_DAYS = 7;
export const ROLLOVER_WINDOW_MS = ROLLOVER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const LIFETIME_BASE_PRICE_LA = 1200;

export const SINGLE_PALACE_BASE_PRICE_LA = 120;
export const NATAL_EXCERPT_PRICE_LA = 240;
export const TOPIC_DEEP_DIVE_PRICE_LA = 480;
export const TODAY_READING_PRICE_LA = 60;
export const MONTHLY_READING_PRICE_LA = 300;
export const ANNUAL_2026_PRICE_LA = 480;
export const COMBO_2026_PRICE_LA = 1300;
export const MEMBERSHIP_MONTHLY_PRICE_LA = 1500;
export const MEMBERSHIP_YEARLY_PRICE_LA = 8000;

export const CANONICAL_PALACE_SKU_MAP: Record<ZiweiPalaceId, string> = {
  "ziwei.palace.life": "ZIWEI-PALACE-LIFE-P0",
  "ziwei.palace.siblings": "ZIWEI-PALACE-SIBLINGS-P0",
  "ziwei.palace.spouse": "ZIWEI-PALACE-SPOUSE-P0",
  "ziwei.palace.children": "ZIWEI-PALACE-CHILDREN-P0",
  "ziwei.palace.wealth": "ZIWEI-PALACE-WEALTH-P0",
  "ziwei.palace.health": "ZIWEI-PALACE-HEALTH-P0",
  "ziwei.palace.travel": "ZIWEI-PALACE-TRAVEL-P0",
  "ziwei.palace.friends": "ZIWEI-PALACE-FRIENDS-P0",
  "ziwei.palace.career": "ZIWEI-PALACE-CAREER-P0",
  "ziwei.palace.property": "ZIWEI-PALACE-PROPERTY-P0",
  "ziwei.palace.fortune": "ZIWEI-PALACE-FORTUNE-P0",
  "ziwei.palace.parents": "ZIWEI-PALACE-PARENTS-P0",
};

export const REVERSE_PALACE_SKU_MAP: Record<string, ZiweiPalaceId> = Object.fromEntries(
  Object.entries(CANONICAL_PALACE_SKU_MAP).map(([palaceId, sku]) => [sku, palaceId as ZiweiPalaceId]),
);

export const SINGLE_PALACE_SKUS = Object.values(CANONICAL_PALACE_SKU_MAP) as readonly string[];

export type LaProductCategory =
  | "natal"
  | "palace"
  | "topic"
  | "forecast"
  | "combo"
  | "membership";

export type LaCatalogItem = {
  sku: string;
  priceLa: number;
  name: { vi: string; en: string };
  locales: readonly ("vi" | "en")[];
  category: LaProductCategory;
  qualifiesForRollover: boolean;
  availability: "active" | "reserved";
  palaceId?: ZiweiPalaceId;
};

export const LA_PRODUCT_CATALOG: readonly LaCatalogItem[] = [
  {
    sku: "ZIWEI-IDENTITY-P0",
    priceLa: LIFETIME_BASE_PRICE_LA,
    name: { vi: "Tử Vi trọn đời", en: "Lifetime Zi Wei reading" },
    locales: ["vi", "en"],
    category: "natal",
    qualifiesForRollover: false,
    availability: "active",
  },
  {
    sku: "ZIWEI-NATAL-EXCERPT-P0",
    priceLa: NATAL_EXCERPT_PRICE_LA,
    name: { vi: "Bản mệnh và tiềm năng", en: "Core identity and potential" },
    locales: ["vi"],
    category: "natal",
    qualifiesForRollover: true,
    availability: "active",
  },
  {
    sku: "ZIWEI-RELATIONSHIP-P0",
    priceLa: TOPIC_DEEP_DIVE_PRICE_LA,
    name: { vi: "Tình duyên và hôn nhân", en: "Love and marriage" },
    locales: ["vi", "en"],
    category: "topic",
    qualifiesForRollover: false,
    availability: "reserved",
  },
  {
    sku: "ZIWEI-BUSINESS-P0", priceLa: TOPIC_DEEP_DIVE_PRICE_LA,
    name: { vi: "Kinh doanh và làm ăn", en: "Business and enterprise" },
    locales: ["vi"], category: "topic", qualifiesForRollover: false,
    availability: "reserved",
  },
  {
    sku: "ZIWEI-CAREER-TRANSITION-P0", priceLa: TOPIC_DEEP_DIVE_PRICE_LA,
    name: {vi: "Đổi việc và bước ngoặt sự nghiệp", en: "Career transition"},
    locales: ["vi"], category: "topic", qualifiesForRollover: false, availability: "reserved",
  },
  {
    sku: "ZIWEI-FAMILY-CHILDREN-P0", priceLa: TOPIC_DEEP_DIVE_PRICE_LA,
    name: {vi: "Gia đạo và con cái", en: "Family and children"},
    locales: ["vi"], category: "topic", qualifiesForRollover: false, availability: "reserved",
  },
  {
    sku: "ZIWEI-CAREER-P0",
    priceLa: TOPIC_DEEP_DIVE_PRICE_LA,
    name: { vi: "Công việc và tài lộc", en: "Career and wealth" },
    locales: ["vi", "en"],
    category: "topic",
    qualifiesForRollover: false,
    availability: "reserved",
  },
  {
    sku: "ZIWEI-PALACE-LIFE-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Mệnh", en: "Life Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.life",
  },
  {
    sku: "ZIWEI-PALACE-SIBLINGS-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Huynh Đệ", en: "Siblings Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.siblings",
  },
  {
    sku: "ZIWEI-PALACE-SPOUSE-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Phu Thê", en: "Spouse Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.spouse",
  },
  {
    sku: "ZIWEI-PALACE-CHILDREN-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Tử Tức", en: "Children Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.children",
  },
  {
    sku: "ZIWEI-PALACE-WEALTH-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Tài Bạch", en: "Wealth Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.wealth",
  },
  {
    sku: "ZIWEI-PALACE-HEALTH-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Tật Ách", en: "Health Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.health",
  },
  {
    sku: "ZIWEI-PALACE-TRAVEL-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Thiên Di", en: "Travel Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.travel",
  },
  {
    sku: "ZIWEI-PALACE-FRIENDS-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Nô Bộc", en: "Friends Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.friends",
  },
  {
    sku: "ZIWEI-PALACE-CAREER-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Quan Lộc", en: "Career Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.career",
  },
  {
    sku: "ZIWEI-PALACE-PROPERTY-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Điền Trạch", en: "Property Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.property",
  },
  {
    sku: "ZIWEI-PALACE-FORTUNE-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Phúc Đức", en: "Fortune Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.fortune",
  },
  {
    sku: "ZIWEI-PALACE-PARENTS-P0",
    priceLa: SINGLE_PALACE_BASE_PRICE_LA,
    name: { vi: "Cung Phụ Mẫu", en: "Parents Palace" },
    locales: ["vi", "en"],
    category: "palace",
    qualifiesForRollover: true,
    availability: "active",
    palaceId: "ziwei.palace.parents",
  },
  {
    sku: "ZIWEI-TODAY-P0",
    priceLa: TODAY_READING_PRICE_LA,
    name: { vi: "Hôm nay của bạn", en: "Today's reading" },
    locales: ["vi"],
    category: "forecast",
    qualifiesForRollover: false,
    availability: "active",
  },
  {
    sku: "ZIWEI-MONTHLY-P0",
    priceLa: MONTHLY_READING_PRICE_LA,
    name: { vi: "Tháng này của bạn", en: "Monthly reading" },
    locales: ["vi", "en"],
    category: "forecast",
    qualifiesForRollover: false,
    availability: "reserved",
  },
  {
    sku: "ZIWEI-YEAR-P0", priceLa: ANNUAL_2026_PRICE_LA,
    name: { vi: "Vận hạn năm", en: "Annual forecast" }, locales: ["vi", "en"],
    category: "forecast", qualifiesForRollover: false, availability: "reserved",
  },
  {
    sku: "ZIWEI-COMBO-P0", priceLa: COMBO_2026_PRICE_LA,
    name: { vi: "Combo Tử Vi trọn đời + Vận hạn năm", en: "Lifetime Zi Wei + Annual Combo" }, locales: ["vi", "en"],
    category: "combo", qualifiesForRollover: false, availability: "reserved",
  },
  {
    sku: "ZIWEI-YEAR-2026-P0",
    priceLa: ANNUAL_2026_PRICE_LA,
    name: { vi: "Vận hạn năm 2026", en: "Year 2026 forecast" },
    locales: ["vi", "en"],
    category: "forecast",
    qualifiesForRollover: false,
    availability: "reserved",
  },
  {
    sku: "ZIWEI-COMBO-2026-P0",
    priceLa: COMBO_2026_PRICE_LA,
    name: { vi: "Combo Tử Vi trọn đời + Vận hạn năm 2026", en: "Lifetime Zi Wei + 2026 Year Combo" },
    locales: ["vi", "en"],
    category: "combo",
    qualifiesForRollover: false,
    availability: "reserved",
  },
  {
    sku: "MEMBERSHIP-MONTHLY-P0",
    priceLa: MEMBERSHIP_MONTHLY_PRICE_LA,
    name: { vi: "Hội viên tháng", en: "Monthly membership" },
    locales: ["vi", "en"],
    category: "membership",
    qualifiesForRollover: false,
    availability: "reserved",
  },
  {
    sku: "MEMBERSHIP-YEARLY-P0",
    priceLa: MEMBERSHIP_YEARLY_PRICE_LA,
    name: { vi: "Hội viên năm", en: "Yearly membership" },
    locales: ["vi", "en"],
    category: "membership",
    qualifiesForRollover: false,
    availability: "reserved",
  },
  {
    sku: "MEMBERSHIP-MONTHLY-1500",
    priceLa: MEMBERSHIP_MONTHLY_PRICE_LA,
    name: { vi: "Hội viên tháng", en: "Monthly membership" },
    locales: ["vi", "en"],
    category: "membership",
    qualifiesForRollover: false,
    availability: "reserved",
  },
  {
    sku: "MEMBERSHIP-YEARLY-8000",
    priceLa: MEMBERSHIP_YEARLY_PRICE_LA,
    name: { vi: "Hội viên năm", en: "Yearly membership" },
    locales: ["vi", "en"],
    category: "membership",
    qualifiesForRollover: false,
    availability: "reserved",
  },
] as const;

const catalogBySku = new Map<string, LaCatalogItem>(
  LA_PRODUCT_CATALOG.map((item) => [item.sku, item]),
);

export function findLaProduct(sku: string): LaCatalogItem | undefined {
  return catalogBySku.get(sku);
}

export function getLaPrice(sku: string): number | undefined {
  return catalogBySku.get(sku)?.priceLa;
}

export function isQualifyingRolloverSku(sku: string): boolean {
  return catalogBySku.get(sku)?.qualifiesForRollover === true;
}

export function isSinglePalaceSku(sku: string): boolean {
  return sku in REVERSE_PALACE_SKU_MAP;
}

export function getPalaceIdFromSku(sku: string): ZiweiPalaceId | undefined {
  return REVERSE_PALACE_SKU_MAP[sku] ?? catalogBySku.get(sku)?.palaceId;
}

export function getSkuForPalaceId(palaceId: ZiweiPalaceId): string {
  const sku = CANONICAL_PALACE_SKU_MAP[palaceId];
  if (!sku) throw new Error(`Unknown palaceId: ${palaceId}`);
  return sku;
}

export const LaSkuSchema = z.enum([
  "ZIWEI-IDENTITY-P0",
  "ZIWEI-NATAL-EXCERPT-P0",
  "ZIWEI-RELATIONSHIP-P0",
  "ZIWEI-CAREER-P0",
  "ZIWEI-BUSINESS-P0",
  "ZIWEI-CAREER-TRANSITION-P0",
  "ZIWEI-FAMILY-CHILDREN-P0",
  "ZIWEI-PALACE-LIFE-P0",
  "ZIWEI-PALACE-SIBLINGS-P0",
  "ZIWEI-PALACE-SPOUSE-P0",
  "ZIWEI-PALACE-CHILDREN-P0",
  "ZIWEI-PALACE-WEALTH-P0",
  "ZIWEI-PALACE-HEALTH-P0",
  "ZIWEI-PALACE-TRAVEL-P0",
  "ZIWEI-PALACE-FRIENDS-P0",
  "ZIWEI-PALACE-CAREER-P0",
  "ZIWEI-PALACE-PROPERTY-P0",
  "ZIWEI-PALACE-FORTUNE-P0",
  "ZIWEI-PALACE-PARENTS-P0",
  "ZIWEI-TODAY-P0",
  "ZIWEI-MONTHLY-P0",
  "ZIWEI-YEAR-P0",
  "ZIWEI-COMBO-P0",
  "ZIWEI-YEAR-2026-P0",
  "ZIWEI-COMBO-2026-P0",
  "MEMBERSHIP-MONTHLY-P0",
  "MEMBERSHIP-YEARLY-P0",
  "MEMBERSHIP-MONTHLY-1500",
  "MEMBERSHIP-YEARLY-8000",
]);
export type LaSku = z.infer<typeof LaSkuSchema>;

export type QualifyingSpend = {
  amountLa: number;
  spentAt: Date;
};

export type RolloverResult = {
  basePriceLa: number;
  effectivePriceLa: number;
  qualifyingLaSpent: number;
  windowOpenedAt: Date | null;
  windowExpiresAt: Date | null;
  isWindowActive: boolean;
};

export function calculateRolloverCredit(params: {
  basePriceLa?: number;
  spends: readonly QualifyingSpend[];
  now: Date;
}): RolloverResult {
  const basePriceLa = params.basePriceLa ?? LIFETIME_BASE_PRICE_LA;
  if (!params.spends || params.spends.length === 0) {
    return {
      basePriceLa,
      effectivePriceLa: basePriceLa,
      qualifyingLaSpent: 0,
      windowOpenedAt: null,
      windowExpiresAt: null,
      isWindowActive: false,
    };
  }

  // Sort spends ascending by spentAt to identify the very first qualifying spend
  const sortedSpends = [...params.spends].sort(
    (a, b) => a.spentAt.getTime() - b.spentAt.getTime(),
  );

  const windowOpenedAt = sortedSpends[0]!.spentAt;
  const windowExpiresAt = new Date(windowOpenedAt.getTime() + ROLLOVER_WINDOW_MS);
  const nowMs = params.now.getTime();

  // The 7-day window starts at the first qualifying spend
  const isWindowActive = nowMs < windowExpiresAt.getTime();
  if (!isWindowActive) {
    return {
      basePriceLa,
      effectivePriceLa: basePriceLa,
      qualifyingLaSpent: 0,
      windowOpenedAt,
      windowExpiresAt,
      isWindowActive: false,
    };
  }

  // Sum all qualifying spends that occurred within the 7-day window
  const spendsInWindow = sortedSpends.filter(
    (s) => s.spentAt.getTime() >= windowOpenedAt.getTime() && s.spentAt.getTime() < windowExpiresAt.getTime(),
  );
  const qualifyingLaSpent = spendsInWindow.reduce((acc, s) => acc + s.amountLa, 0);
  const effectivePriceLa = Math.max(0, basePriceLa - qualifyingLaSpent);

  return {
    basePriceLa,
    effectivePriceLa,
    qualifyingLaSpent,
    windowOpenedAt,
    windowExpiresAt,
    isWindowActive: true,
  };
}
