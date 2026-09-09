import "server-only";

import type { AccountLibraryV1, PaidTopicSelectionViewV1 } from "@lasoviet/contracts";

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
};

const OFFER_CONTENT: Record<
  PublicOfferKey,
  {
    title: { vi: string; en: string };
    summary: { vi: string; en: string };
    deliverables: { vi: string[]; en: string[] };
  }
> = {
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

export type BuildSafeOfferPresentationsParams = {
  offers: PaidTopicSelectionViewV1["offers"];
  ownershipByOfferKey?: Partial<Record<PublicOfferKey, OfferOwnershipState>>;
};

export function buildSafeOfferPresentations(
  params: BuildSafeOfferPresentationsParams,
): SafeOfferPresentation[] {
  const presentations: SafeOfferPresentation[] = [];
  const seenKeys = new Set<PublicOfferKey>();

  for (const offer of params.offers) {
    const offerKey = resolvePublicOfferKeyFromSku(offer.sku);
    if (offerKey === null || seenKeys.has(offerKey)) {
      continue;
    }

    seenKeys.add(offerKey);
    const content = OFFER_CONTENT[offerKey];
    const ownership = params.ownershipByOfferKey?.[offerKey] ?? { kind: "unowned" };

    presentations.push({
      offerKey,
      anchorId: offerKey,
      title: content.title,
      summary: content.summary,
      deliverables: content.deliverables,
      price: offer.price,
      currency: offer.currency,
      ownership,
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

  if (activeItem.readUrl !== null) {
    return {
      kind: "readable",
      reportId: activeItem.reportId ?? "",
      readUrl: activeItem.readUrl,
    };
  }

  const prefix = params.locale === "en" ? "/en" : "";

  if (activeItem.reportId !== null) {
    return {
      kind: "processing_or_terminal",
      reportId: activeItem.reportId,
      progressUrl: `${prefix}/bao-cao/${encodeURIComponent(activeItem.reportId)}`,
    };
  }

  return {
    kind: "owned_unknown",
    libraryUrl: `${prefix}/tai-khoan/bao-cao`,
  };
}
