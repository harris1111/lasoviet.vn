import "server-only";

import type { AccountLibraryV1, OrderHistoryItemV1, PaidTopicSelectionViewV1 } from "@lasoviet/contracts";

import {
  resolveActiveSkuFromPublicOfferKey,
  resolvePublicOfferKeyFromSku,
  type PublicOfferKey,
} from "../commerce/checkout-offer";

export type OfferOwnershipState =
  | { kind: "unowned" }
  | { kind: "readable"; reportId: string; readUrl: string }
  | { kind: "processing_or_terminal"; reportId: string; progressUrl: string }
  | { kind: "owned_unknown"; libraryUrl: string }
  | { kind: "unavailable" };

export type UpgradeCreditPresentation = {
  creditApplied: number;
  listPrice: number;
  netPrice: number;
  creditExpiresAt: string;
};

export type SafeOfferPresentation = {
  offerKey: PublicOfferKey;
  anchorId: string;
  title: {
    vi: string;
    en: string;
  };
  summary: {
    vi: string;
    en: string;
  };
  deliverables: {
    vi: string[];
    en: string[];
  };
  price: number;
  currency: "VND";
  ownership: OfferOwnershipState;
  upgradeCredit?: UpgradeCreditPresentation | null;
  upgradeDisclosure?: {
    vi: string;
    en: string;
  };
};

const OFFER_CONTENT: Record<
  PublicOfferKey,
  {
    title: { vi: string; en: string };
    summary: { vi: string; en: string };
    deliverables: { vi: string[]; en: string[] };
  }
> = {
  "ziwei-natal-excerpt": {
    title: {
      vi: "Bản mệnh và tiềm năng",
      en: "Core identity and potential",
    },
    summary: {
      vi: "Báo cáo luận giải cô đọng bản mệnh, trục Mệnh - Thân, thế mạnh nội tại và định hướng hành động thiết thực từ lá số Tử Vi.",
      en: "A focused natal reading covering personal summary, core axis, strengths and tensions, and practical actionable direction.",
    },
    deliverables: {
      vi: [
        "Tổng quan bản mệnh và tính cách cốt lõi",
        "Trục Mệnh - Thân và động lực phát triển then chốt",
        "Nhận diện thế mạnh, điểm vướng và điều kiện phát huy",
        "Gợi ý định hướng và hành động thực tế",
        "Bản luận giải 4 phần trọng tâm cô đọng, dễ ứng dụng",
      ],
      en: [
        "Personal summary and core personality baseline",
        "Core life and body axis with key drivers",
        "Strengths, tensions, and growth conditions",
        "Practical actionable direction for daily focus",
        "Concise four-section natal reading",
      ],
    },
  },
  "ziwei-comprehensive": {
    title: {
      vi: "Luận giải Tử Vi toàn diện",
      en: "Comprehensive Zi Wei reading",
    },
    summary: {
      vi: "Báo cáo luận giải cấu trúc bản mệnh toàn diện đối chiếu từ dữ liệu lá số Tử Vi, mang tính chiêm nghiệm và định hướng thực tế.",
      en: "A comprehensive natal structural interpretation report synthesizing key configurations and palace interactions from verified chart data.",
    },
    deliverables: {
      vi: [
        "Luận giải chi tiết toàn bộ 12 cung vị và tương tác tinh đẩu",
        "Nhận diện cấu trúc lá số trọng điểm và tổng hợp đối chiếu liên cung, tam phương tứ chính",
        "Bốn cụm tổng hợp chủ đề: sự nghiệp - tài lộc, tình duyên - gia đạo, môi trường xã hội và nội lực tâm lý",
        "Gợi ý định hướng thực tế và điểm lưu tâm để tự rèn luyện bản thân",
        "Độ dài hoàn chỉnh 2.200–3.200 chữ tiếng Việt chuyên sâu",
      ],
      en: [
        "Detailed interpretation covering all 12 natal palaces and star interactions",
        "Key chart configurations and cross-palace synthesis across trines and oppositions",
        "Four thematic syntheses: career and wealth, relationship and family, social sphere, and inner wellbeing",
        "Actionable practical direction and personal development guidance",
        "Structured multi-section report synthesizing core natal chart structure",
      ],
    },
  },
};

export type DeriveEligibleUpgradeCreditParams = {
  chartId: string;
  orders?: OrderHistoryItemV1[];
  now?: Date;
};

export function deriveEligibleUpgradeCredit(
  params: DeriveEligibleUpgradeCreditParams,
): UpgradeCreditPresentation | null {
  if (!params.orders || params.orders.length === 0) return null;
  const currentNow = params.now ?? new Date();

  const eligibleOrder = params.orders.find((o) => {
    if (o.chartId !== params.chartId) return false;
    if (o.sku !== "ZIWEI-NATAL-EXCERPT-P0") return false;
    if (o.status !== "paid" || !o.paidAt) return false;
    if (o.orderStatus === "refunded") return false;
    if (!o.creditExpiresAt) return false;
    const expiresAt = new Date(o.creditExpiresAt);
    if (Number.isNaN(expiresAt.getTime())) return false;
    return currentNow.getTime() < expiresAt.getTime();
  });

  if (!eligibleOrder || !eligibleOrder.creditExpiresAt) return null;

  const expiresAt = eligibleOrder.creditExpiresAt;

  const listPrice = 79000;
  const creditApplied = Math.min(eligibleOrder.amount, listPrice);
  const netPrice = Math.max(listPrice - creditApplied, 0);

  return {
    creditApplied,
    listPrice,
    netPrice,
    creditExpiresAt: expiresAt,
  };
}

export type BuildSafeOfferPresentationsParams = {
  offers: PaidTopicSelectionViewV1["offers"];
  ownershipByOfferKey?: Partial<Record<PublicOfferKey, OfferOwnershipState>>;
  locale?: "vi" | "en";
  orders?: OrderHistoryItemV1[];
  chartId?: string;
  now?: Date;
};

export function buildSafeOfferPresentations(
  params: BuildSafeOfferPresentationsParams,
): SafeOfferPresentation[] {
  const presentations: SafeOfferPresentation[] = [];
  const seenKeys = new Set<PublicOfferKey>();

  const tier2Ownership = params.ownershipByOfferKey?.["ziwei-comprehensive"];
  const isTier2Owned =
    tier2Ownership !== undefined &&
    tier2Ownership.kind !== "unowned" &&
    tier2Ownership.kind !== "unavailable";

  for (const offer of params.offers) {
    const offerKey = resolvePublicOfferKeyFromSku(offer.sku);
    if (offerKey === null || seenKeys.has(offerKey)) {
      continue;
    }

    if (params.locale === "en" && offerKey === "ziwei-natal-excerpt") {
      continue;
    }

    if (isTier2Owned && offerKey === "ziwei-natal-excerpt") {
      continue;
    }

    seenKeys.add(offerKey);
    const content = OFFER_CONTENT[offerKey];
    const ownership = params.ownershipByOfferKey?.[offerKey] ?? { kind: "unowned" };

    let effectivePrice: number = offer.price;
    let upgradeCredit: UpgradeCreditPresentation | null = null;
    let upgradeDisclosure: { vi: string; en: string } | undefined = undefined;

    if (offerKey === "ziwei-comprehensive" && params.locale !== "en" && params.chartId) {
      upgradeCredit = deriveEligibleUpgradeCredit({
        chartId: params.chartId,
        orders: params.orders,
        now: params.now,
      });
      if (upgradeCredit !== null) {
        effectivePrice = upgradeCredit.netPrice;
      }
    } else if (offerKey === "ziwei-natal-excerpt") {
      upgradeDisclosure = {
        vi: "Số tiền 19.000 ₫ được khấu trừ trực tiếp khi nâng cấp lên Luận giải toàn diện trong vòng 7 ngày kể từ khi thanh toán.",
        en: "The 19,000 VND payment is credited toward the comprehensive report for 7 days from payment.",
      };
    }

    presentations.push({
      offerKey,
      anchorId: offerKey,
      title: content.title,
      summary: content.summary,
      deliverables: content.deliverables,
      price: effectivePrice,
      currency: offer.currency,
      ownership,
      upgradeCredit,
      upgradeDisclosure,
    });

    if (presentations.length >= 2) {
      break;
    }
  }

  return presentations;
}

export type DeriveOfferOwnershipParams = {
  chartId: string;
  offerKey: PublicOfferKey;
  library: AccountLibraryV1;
  locale: "vi" | "en";
};

export function deriveOfferOwnership(
  params: DeriveOfferOwnershipParams,
): OfferOwnershipState {
  if (params.locale === "en") {
    const hasViTier1 = params.library.items.some(
      (item) =>
        item.chartId === params.chartId &&
        item.locale === "vi" &&
        item.sku === "ZIWEI-NATAL-EXCERPT-P0" &&
        item.entitlementStatus === "active",
    );
    if (hasViTier1) {
      return { kind: "unavailable" };
    }
  }

  const sku = resolveActiveSkuFromPublicOfferKey(params.offerKey);
  if (sku === null) {
    return { kind: "unowned" };
  }

  const matchingItems = params.library.items.filter(
    (item) =>
      item.chartId === params.chartId &&
      item.sku === sku &&
      item.entitlementStatus === "active",
  );

  if (matchingItems.length === 0) {
    return { kind: "unowned" };
  }

  const activeItem = matchingItems.find((i) => i.readUrl !== null) ?? matchingItems[0]!;

  let effectiveReadUrl = activeItem.readUrl;
  let effectiveReportId = activeItem.reportId;

  if (effectiveReadUrl === null && params.offerKey === "ziwei-comprehensive") {
    const tier1Item = params.library.items.find(
      (item) =>
        item.chartId === params.chartId &&
        item.locale === params.locale &&
        item.sku === "ZIWEI-NATAL-EXCERPT-P0" &&
        item.entitlementStatus === "active" &&
        item.readUrl !== null,
    );
    if (tier1Item) {
      effectiveReadUrl = tier1Item.readUrl;
      effectiveReportId = tier1Item.reportId;
    }
  }

  if (effectiveReportId === null && params.offerKey === "ziwei-comprehensive") {
    const tier1Item = params.library.items.find(
      (item) =>
        item.chartId === params.chartId &&
        item.locale === params.locale &&
        item.sku === "ZIWEI-NATAL-EXCERPT-P0" &&
        item.entitlementStatus === "active" &&
        item.reportId !== null,
    );
    if (tier1Item) {
      effectiveReportId = tier1Item.reportId;
    }
  }

  if (effectiveReadUrl !== null) {
    return {
      kind: "readable",
      reportId: effectiveReportId ?? "",
      readUrl: effectiveReadUrl,
    };
  }

  const prefix = params.locale === "en" ? "/en" : "";

  if (effectiveReportId !== null) {
    return {
      kind: "processing_or_terminal",
      reportId: effectiveReportId,
      progressUrl: `${prefix}/bao-cao/${encodeURIComponent(effectiveReportId)}`,
    };
  }

  return {
    kind: "owned_unknown",
    libraryUrl: `${prefix}/tai-khoan/bao-cao`,
  };
}
