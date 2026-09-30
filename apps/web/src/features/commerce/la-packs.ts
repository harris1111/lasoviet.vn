import { getLaPrice, WalletTopUpCatalogV1 } from "@lasoviet/contracts";

export type LaPackPresentation = {
  id: "LA-ENTRY-300" | "LA-START-1100" | "LA-DISCOVER-3000" | "LA-LIBRARY-8000";
  name: { vi: string; en: string };
  vndAmount: number;
  vndFormatted: { vi: string; en: string };
  totalLa: number;
  baseLa: number;
  bonusLa: number;
  badge?: { vi: string; en: string };
  isFeatured?: boolean;
};

export const LA_TOP_UP_PACKS: readonly LaPackPresentation[] = [
  {
    id: "LA-ENTRY-300",
    name: { vi: "Nhập Môn", en: "Entry" },
    vndAmount: 29000,
    vndFormatted: { vi: "29.000đ", en: "29,000 VND" },
    totalLa: 300,
    baseLa: 300,
    bonusLa: 0,
  },
  {
    id: "LA-START-1100",
    name: { vi: "Khởi Đọc", en: "Starter" },
    vndAmount: 99000,
    vndFormatted: { vi: "99.000đ", en: "99,000 VND" },
    totalLa: 1100,
    baseLa: 1000,
    bonusLa: 100,
  },
  {
    id: "LA-DISCOVER-3000",
    name: { vi: "Khám Phá", en: "Discovery" },
    vndAmount: 249000,
    vndFormatted: { vi: "249.000đ", en: "249,000 VND" },
    totalLa: 3000,
    baseLa: 2500,
    bonusLa: 500,
    badge: { vi: "Gợi ý", en: "Recommended" },
    isFeatured: true,
  },
  {
    id: "LA-LIBRARY-8000",
    name: { vi: "Tàng Thư", en: "Library" },
    vndAmount: 599000,
    vndFormatted: { vi: "599.000đ", en: "599,000 VND" },
    totalLa: 8000,
    baseLa: 6000,
    bonusLa: 2000,
    badge: { vi: "Nhiều Lá tặng nhất", en: "Best value" },
  },
] as const;

export function findSmallestCoveringPack(gap: number): LaPackPresentation {
  return (
    LA_TOP_UP_PACKS.find((pack) => pack.totalLa >= gap) ??
    LA_TOP_UP_PACKS[LA_TOP_UP_PACKS.length - 1]!
  );
}

export type MembershipTierPresentation = {
  id: "membership-monthly" | "membership-yearly";
  name: { vi: string; en: string };
  priceLa: number;
  durationDays: number;
  priceFormatted: { vi: string; en: string };
  description?: { vi: string; en: string };
  badge?: { vi: string; en: string };
  isFeatured?: boolean;
  comingSoon: boolean;
  deliverables: {
    vi: Array<{ text: string; excluded?: boolean }>;
    en: Array<{ text: string; excluded?: boolean }>;
  };
};

function membershipPresentationPrice(sku: "MEMBERSHIP-MONTHLY-P0" | "MEMBERSHIP-YEARLY-P0", days: number) {
  const priceLa = getLaPrice(sku);
  if (priceLa === undefined) throw new Error("MEMBERSHIP_CATALOG_PRICE_MISSING");
  return { priceLa, priceFormatted: {
    vi: `${new Intl.NumberFormat("vi-VN").format(priceLa)} Lá · ${days} ngày`,
    en: `${new Intl.NumberFormat("en-US").format(priceLa)} Lá · ${days} days`,
  } };
}

export const MEMBERSHIP_TIERS: readonly MembershipTierPresentation[] = [
  {
    id: "membership-monthly",
    name: { vi: "Hội viên tháng", en: "Monthly Membership" },
    ...membershipPresentationPrice("MEMBERSHIP-MONTHLY-P0", 30),
    durationDays: 30,
    comingSoon: true,
    badge: { vi: "Sắp có", en: "Coming soon" },
    deliverables: {
      vi: [
        { text: "Hôm nay của bạn, mỗi sáng" },
        { text: "Nguyệt vận từng tháng — sắp có" },
        { text: "Bản theo lá số của mọi công cụ — sắp có" },
        { text: "Giảm 20% khi mở luận giải" },
        { text: "Bản Toàn diện mua riêng", excluded: true },
      ],
      en: [
        { text: "Personalized daily reading each morning" },
        { text: "Monthly decadal and transit insights — coming soon" },
        { text: "Chart-personalized readings for all tools — coming soon" },
        { text: "20% discount on report unlocks" },
        { text: "Comprehensive report purchased separately", excluded: true },
      ],
    },
  },
  {
    id: "membership-yearly",
    name: { vi: "Hội viên năm", en: "Annual Membership" },
    ...membershipPresentationPrice("MEMBERSHIP-YEARLY-P0", 365),
    durationDays: 365,
    description: {
      vi: "Tiết kiệm hơn 56% so với 12 lần gói tháng.",
      en: "Save over 56% compared to 12 monthly packages.",
    },
    badge: { vi: "Gợi ý", en: "Recommended" },
    isFeatured: true,
    comingSoon: true,
    deliverables: {
      vi: [
        { text: "Mọi quyền lợi gói tháng, trọn năm" },
        { text: "Nguyệt vận đủ 12 tháng — sắp có" },
        { text: "Giảm 20% khi mở luận giải" },
      ],
      en: [
        { text: "All monthly benefits, full year" },
        { text: "Complete 12-month annual guidance — coming soon" },
        { text: "20% discount on report unlocks" },
      ],
    },
  },
] as const;
