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
  fit?: {
    vi: string;
    en: string;
  };
  badge?: {
    vi: string;
    en: string;
  };
  ctaLabel: {
    vi: string;
    en: string;
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
    fit: { vi: string; en: string };
    badge?: { vi: string; en: string };
    ctaLabel: { vi: string; en: string };
  }
> = {
  "ziwei-natal-excerpt": {
    title: {
      vi: "Bản mệnh và tiềm năng",
      en: "Core Identity and Potential",
    },
    summary: {
      vi: "Một phần đọc cô đọng để hiểu trục cốt lõi của mình trước khi đi xa hơn.",
      en: "A concise reading to understand your core axis before going further.",
    },
    deliverables: {
      vi: [
        "Toàn cảnh bản mệnh.",
        "Trục Mệnh – Thân và những điểm nhấn chính.",
        "Điểm mạnh, điểm căng và hướng phát triển thực tế.",
      ],
      en: [
        "Comprehensive overview of your core destiny.",
        "Destiny – Body axis and key focal configurations.",
        "Strengths, tensions, and practical developmental direction.",
      ],
    },
    fit: {
      vi: "Bạn muốn một điểm bắt đầu rõ ràng, đủ sâu để soi chiếu nhưng chưa cần đọc toàn bộ lá số.",
      en: "You want a clear starting point that is deep enough for reflection without reading the entire chart.",
    },
    ctaLabel: {
      vi: "Chọn Bản mệnh và tiềm năng — 19.000 ₫",
      en: "Select Core Identity and Potential — 19,000 VND",
    },
  },
  "ziwei-comprehensive": {
    badge: {
      vi: "Đầy đủ nhất",
      en: "Most complete",
    },
    title: {
      vi: "Luận giải Tử Vi toàn diện",
      en: "Comprehensive Zi Wei reading",
    },
    summary: {
      vi: "Đọc trọn cấu trúc lá số — từ nền tảng bản mệnh đến 12 cung và những mối liên hệ nổi bật.",
      en: "Read the entire chart structure — from core destiny baseline to all 12 palaces and prominent interactions.",
    },
    deliverables: {
      vi: [
        "Toàn bộ nội dung của Bản mệnh và tiềm năng.",
        "Luận giải đầy đủ 12 cung.",
        "Những cấu trúc nổi bật trong lá số.",
        "Bốn nhóm tổng hợp để nối các mảnh ghép thành một hướng nhìn liền mạch.",
        "Bản luận giải dài dự kiến khoảng 2.200–3.200 từ.",
      ],
      en: [
        "All content included in Core Identity and Potential.",
        "Full interpretation of all 12 palaces.",
        "Key configurations and patterns in the chart.",
        "Four thematic syntheses connecting chart facets into a cohesive view.",
        "Estimated report length of approximately 2,200–3,200 words.",
      ],
    },
    fit: {
      vi: "Bạn muốn có một bản tham chiếu đầy đủ để đọc lại theo từng câu hỏi và từng giai đoạn suy ngẫm.",
      en: "You want a comprehensive reference reading to revisit across specific questions and reflective phases.",
    },
    ctaLabel: {
      vi: "Chọn Luận giải Tử Vi toàn diện — 79.000 ₫",
      en: "Select Comprehensive Zi Wei Reading — 79,000 VND",
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
        vi: "Nếu sau đó bạn muốn đọc bản toàn diện, 19.000 ₫ này sẽ được trừ thẳng vào phí nâng cấp trong vòng 7 ngày kể từ thời điểm thanh toán.",
        en: "If you later wish to read the comprehensive report, this 19,000 VND will be credited directly toward the upgrade fee within 7 days from payment.",
      };
    }

    let effectiveCtaLabel = content.ctaLabel;
    if (offerKey === "ziwei-comprehensive" && upgradeCredit !== null) {
      effectiveCtaLabel = {
        vi: `Nâng cấp — chỉ còn ${upgradeCredit.netPrice.toLocaleString("vi-VN")} ₫`,
        en: `Upgrade — only ${upgradeCredit.netPrice.toLocaleString("en-US")} VND`,
      };
    }

    presentations.push({
      offerKey,
      anchorId: offerKey,
      title: content.title,
      summary: content.summary,
      deliverables: content.deliverables,
      fit: content.fit,
      badge: content.badge,
      ctaLabel: effectiveCtaLabel,
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
