import { describe, expect, it } from "vitest";
import {
  ANNUAL_2026_PRICE_LA,
  CANONICAL_PALACE_SKU_MAP,
  COMBO_2026_PRICE_LA,
  LA_PRODUCT_CATALOG,
  LIFETIME_BASE_PRICE_LA,
  LaSkuSchema,
  MEMBERSHIP_MONTHLY_PRICE_LA,
  MEMBERSHIP_YEARLY_PRICE_LA,
  MONTHLY_READING_PRICE_LA,
  NATAL_EXCERPT_PRICE_LA,
  PRODUCT_DISPLAY_NAMES,
  REVERSE_PALACE_SKU_MAP,
  ROLLOVER_WINDOW_DAYS,
  ROLLOVER_WINDOW_MS,
  SINGLE_PALACE_BASE_PRICE_LA,
  SINGLE_PALACE_SKUS,
  TODAY_READING_PRICE_LA,
  TOPIC_DEEP_DIVE_PRICE_LA,
  calculateRolloverCredit,
  findLaProduct,
  getLaPrice,
  getPalaceIdFromSku,
  getSkuForPalaceId,
  isQualifyingRolloverSku,
  isSinglePalaceSku,
  resolveProductTitle,
} from "./index.js";
import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";

describe("Lá product catalog contracts", () => {
  it("offers daily reading at 60 La in Vietnamese only without rollover credit", () => {
    expect(findLaProduct("ZIWEI-TODAY-P0")).toMatchObject({availability: "active", priceLa: 60, locales: ["vi"], qualifiesForRollover: false});
  });
  it("enforces canonical prices for all items in the catalog", () => {
    expect(SINGLE_PALACE_BASE_PRICE_LA).toBe(120);
    expect(NATAL_EXCERPT_PRICE_LA).toBe(240);
    expect(TODAY_READING_PRICE_LA).toBe(60);
    expect(MONTHLY_READING_PRICE_LA).toBe(300);
    expect(ANNUAL_2026_PRICE_LA).toBe(480);
    expect(COMBO_2026_PRICE_LA).toBe(1300);
    expect(MEMBERSHIP_MONTHLY_PRICE_LA).toBe(1500);
    expect(MEMBERSHIP_YEARLY_PRICE_LA).toBe(8000);
    expect(TOPIC_DEEP_DIVE_PRICE_LA).toBe(480);
    expect(LIFETIME_BASE_PRICE_LA).toBe(960);

    expect(getLaPrice("ZIWEI-PALACE-LIFE-P0")).toBe(120);
    expect(getLaPrice("ZIWEI-PALACE-CAREER-P0")).toBe(120);
    expect(getLaPrice("ZIWEI-NATAL-EXCERPT-P0")).toBe(240);
    expect(getLaPrice("ZIWEI-TODAY-P0")).toBe(60);
    expect(getLaPrice("ZIWEI-MONTHLY-P0")).toBe(300);
    expect(getLaPrice("ZIWEI-YEAR-2026-P0")).toBe(480);
    expect(getLaPrice("ZIWEI-COMBO-2026-P0")).toBe(1300);
    expect(getLaPrice("MEMBERSHIP-MONTHLY-P0")).toBe(1500);
    expect(getLaPrice("MEMBERSHIP-MONTHLY-1500")).toBe(1500);
    expect(getLaPrice("MEMBERSHIP-YEARLY-P0")).toBe(8000);
    expect(getLaPrice("MEMBERSHIP-YEARLY-8000")).toBe(8000);
    expect(getLaPrice("ZIWEI-RELATIONSHIP-P0")).toBe(480);
    expect(getLaPrice("ZIWEI-CAREER-P0")).toBe(480);
    expect(getLaPrice("ZIWEI-IDENTITY-P0")).toBe(960);
  });

  it("activates relationship and career topic SKUs at 480 Lá with reserved availability", () => {
    const relationship = findLaProduct("ZIWEI-RELATIONSHIP-P0");
    expect(relationship).toBeDefined();
    expect(relationship?.priceLa).toBe(480);
    expect(relationship?.availability).toBe("reserved");
    expect(relationship?.qualifiesForRollover).toBe(false);

    const career = findLaProduct("ZIWEI-CAREER-P0");
    expect(career).toBeDefined();
    expect(career?.priceLa).toBe(480);
    expect(career?.availability).toBe("reserved");
    expect(career?.qualifiesForRollover).toBe(false);
  });

  it("maps all 12 palaces bi-directionally to canonical palace SKUs", () => {
    expect(ZIWEI_PALACE_IDS).toHaveLength(12);
    expect(SINGLE_PALACE_SKUS).toHaveLength(12);

    for (const palaceId of ZIWEI_PALACE_IDS) {
      const sku = getSkuForPalaceId(palaceId);
      expect(sku).toBeDefined();
      expect(getPalaceIdFromSku(sku)).toBe(palaceId);
      expect(isSinglePalaceSku(sku)).toBe(true);
      expect(isQualifyingRolloverSku(sku)).toBe(true);
      expect(getLaPrice(sku)).toBe(120);
    }

    expect(isSinglePalaceSku("ZIWEI-PALACE-P0")).toBe(false);
    expect(isQualifyingRolloverSku("ZIWEI-PALACE-P0")).toBe(false);
  });

  it("marks only single palaces and natal excerpt as qualifying for rollover", () => {
    expect(isQualifyingRolloverSku("ZIWEI-NATAL-EXCERPT-P0")).toBe(true);
    expect(isQualifyingRolloverSku("ZIWEI-PALACE-LIFE-P0")).toBe(true);

    expect(isQualifyingRolloverSku("ZIWEI-IDENTITY-P0")).toBe(false);
    expect(isQualifyingRolloverSku("ZIWEI-RELATIONSHIP-P0")).toBe(false);
    expect(isQualifyingRolloverSku("ZIWEI-CAREER-P0")).toBe(false);
    expect(isQualifyingRolloverSku("ZIWEI-TODAY-P0")).toBe(false);
    expect(isQualifyingRolloverSku("ZIWEI-MONTHLY-P0")).toBe(false);
    expect(isQualifyingRolloverSku("ZIWEI-YEAR-2026-P0")).toBe(false);
    expect(isQualifyingRolloverSku("ZIWEI-COMBO-2026-P0")).toBe(false);
    expect(isQualifyingRolloverSku("MEMBERSHIP-MONTHLY-P0")).toBe(false);
    expect(isQualifyingRolloverSku("MEMBERSHIP-YEARLY-P0")).toBe(false);
  });

  it("ensures no customer strings contain raw SKU identifiers", () => {
    const skuPattern = /^(ZIWEI-|MEMBERSHIP-|LA-)/;

    for (const item of LA_PRODUCT_CATALOG) {
      expect(item.name.vi).not.toMatch(skuPattern);
      expect(item.name.en).not.toMatch(skuPattern);
      expect(item.name.vi).not.toContain(item.sku);
      expect(item.name.en).not.toContain(item.sku);
    }

    for (const [sku, names] of Object.entries(PRODUCT_DISPLAY_NAMES)) {
      expect(names.vi).not.toMatch(skuPattern);
      expect(names.en).not.toMatch(skuPattern);
      expect(names.vi).not.toContain(sku);
      expect(names.en).not.toContain(sku);
    }
  });

  it("renames ZIWEI-IDENTITY-P0 display title without modifying SKU identifier", () => {
    const identityProduct = findLaProduct("ZIWEI-IDENTITY-P0");
    expect(identityProduct).toBeDefined();
    expect(identityProduct?.sku).toBe("ZIWEI-IDENTITY-P0");
    expect(identityProduct?.name.vi).toBe("Tử Vi trọn đời");
    expect(identityProduct?.name.en).toBe("Lifetime Zi Wei reading");

    expect(resolveProductTitle("ZIWEI-IDENTITY-P0", "vi")).toBe("Tử Vi trọn đời");
    expect(resolveProductTitle("ZIWEI-IDENTITY-P0", "en")).toBe("Lifetime Zi Wei reading");
  });

  it("validates all catalog items against LaSkuSchema", () => {
    for (const item of LA_PRODUCT_CATALOG) {
      expect(LaSkuSchema.safeParse(item.sku).success).toBe(true);
    }
  });
});

describe("7-day rollover discount logic with frozen clock", () => {
  const T0 = new Date("2026-10-01T10:00:00.000Z");

  it("returns base price 960 when there are no qualifying spends", () => {
    const result = calculateRolloverCredit({
      spends: [],
      now: new Date("2026-10-01T12:00:00.000Z"),
    });

    expect(result.basePriceLa).toBe(960);
    expect(result.effectivePriceLa).toBe(960);
    expect(result.qualifyingLaSpent).toBe(0);
    expect(result.isWindowActive).toBe(false);
    expect(result.windowOpenedAt).toBeNull();
    expect(result.windowExpiresAt).toBeNull();
  });

  it("deducts single palace spend (120 Lá) within 7 days: 960 - 120 = 840 Lá", () => {
    const result = calculateRolloverCredit({
      spends: [{ amountLa: 120, spentAt: T0 }],
      now: new Date("2026-10-02T10:00:00.000Z"), // +1 day
    });

    expect(result.effectivePriceLa).toBe(840);
    expect(result.qualifyingLaSpent).toBe(120);
    expect(result.isWindowActive).toBe(true);
    expect(result.windowOpenedAt).toEqual(T0);
    expect(result.windowExpiresAt).toEqual(new Date("2026-10-08T10:00:00.000Z"));
  });

  it("deducts Bản mệnh spend (240 Lá) within 7 days: 960 - 240 = 720 Lá", () => {
    const result = calculateRolloverCredit({
      spends: [{ amountLa: 240, spentAt: T0 }],
      now: new Date("2026-10-03T10:00:00.000Z"), // +2 days
    });

    expect(result.effectivePriceLa).toBe(720);
    expect(result.qualifyingLaSpent).toBe(240);
    expect(result.isWindowActive).toBe(true);
  });

  it("deducts 2 single palace spends (240 Lá) within 7 days: 960 - 240 = 720 Lá", () => {
    const result = calculateRolloverCredit({
      spends: [
        { amountLa: 120, spentAt: T0 },
        { amountLa: 120, spentAt: new Date("2026-10-02T10:00:00.000Z") },
      ],
      now: new Date("2026-10-03T10:00:00.000Z"),
    });

    expect(result.effectivePriceLa).toBe(720);
    expect(result.qualifyingLaSpent).toBe(240);
    expect(result.isWindowActive).toBe(true);
  });

  it("deducts combined Bản mệnh (240 Lá) + 1 palace (120 Lá): 960 - 360 = 600 Lá", () => {
    const result = calculateRolloverCredit({
      spends: [
        { amountLa: 240, spentAt: T0 },
        { amountLa: 120, spentAt: new Date("2026-10-02T15:00:00.000Z") },
      ],
      now: new Date("2026-10-04T10:00:00.000Z"),
    });

    expect(result.effectivePriceLa).toBe(600);
    expect(result.qualifyingLaSpent).toBe(360);
    expect(result.isWindowActive).toBe(true);
  });

  it("deducts 8 single palaces (960 Lá) resulting in 0 Lá", () => {
    const spends = Array.from({ length: 8 }, (_, i) => ({
      amountLa: 120,
      spentAt: new Date(T0.getTime() + i * 3600 * 1000),
    }));

    const result = calculateRolloverCredit({
      spends,
      now: new Date("2026-10-05T10:00:00.000Z"),
    });

    expect(result.effectivePriceLa).toBe(0);
    expect(result.qualifyingLaSpent).toBe(960);
    expect(result.isWindowActive).toBe(true);
  });

  it("caps discount at base price (floor 0) when spent Lá exceeds 960", () => {
    const spends = [
      { amountLa: 240, spentAt: T0 }, // Bản mệnh
      ...Array.from({ length: 7 }, (_, i) => ({
        amountLa: 120,
        spentAt: new Date(T0.getTime() + (i + 1) * 3600 * 1000), // 7 palaces = 840
      })),
    ]; // total = 1080 Lá

    const result = calculateRolloverCredit({
      spends,
      now: new Date("2026-10-03T10:00:00.000Z"),
    });

    expect(result.qualifyingLaSpent).toBe(1080);
    expect(result.effectivePriceLa).toBe(0);
  });

  it("window starts at FIRST qualifying spend and expires at T0 + 7 days exactly", () => {
    const spends = [
      { amountLa: 240, spentAt: T0 },
      { amountLa: 120, spentAt: new Date("2026-10-05T10:00:00.000Z") }, // day 4
    ];

    // 1 millisecond before 7 days expire: active
    const justBeforeExpiry = new Date(T0.getTime() + ROLLOVER_WINDOW_MS - 1);
    const activeResult = calculateRolloverCredit({ spends, now: justBeforeExpiry });
    expect(activeResult.isWindowActive).toBe(true);
    expect(activeResult.effectivePriceLa).toBe(600);

    // Exactly at 7 days: expired
    const atExpiry = new Date(T0.getTime() + ROLLOVER_WINDOW_MS);
    const expiredResult = calculateRolloverCredit({ spends, now: atExpiry });
    expect(expiredResult.isWindowActive).toBe(false);
    expect(expiredResult.effectivePriceLa).toBe(960);

    // After 7 days: expired
    const afterExpiry = new Date("2026-10-10T10:00:00.000Z");
    const longAfterResult = calculateRolloverCredit({ spends, now: afterExpiry });
    expect(longAfterResult.isWindowActive).toBe(false);
    expect(longAfterResult.effectivePriceLa).toBe(960);
  });
});
