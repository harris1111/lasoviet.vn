import { TroiNamCompareBoard } from "./troi-nam-compare-board";

// Reading order down the section: the question, what you get, three ways it is done (the cards),
// then the table under its own sub-heading. Each line leads into the next one.
const COPY = {
  vi: {
    title: "Câu trả lời nhanh, hay một bản đồ ở lại cùng bạn?",
    lead: "Mỗi lá số được đọc ngay trên 12 cung của chính bạn, có căn cứ và lưu lại trọn đời.",
    sub: "So với ba cách bạn hay thử",
  },
  en: {
    title: "A quick answer, or a map that stays with you?",
    lead: "Every reading is made on your own 12 palaces, with its basis shown, and kept for life.",
    sub: "Against the three ways you usually try",
  },
} as const;

export function TroiNamCompare({ locale }: { locale: "en" | "vi" }) {
  return (
    <div className="hv3 tn-compare">
      <TroiNamCompareBoard {...COPY[locale]} />
    </div>
  );
}
