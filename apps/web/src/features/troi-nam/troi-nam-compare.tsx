import { TroiNamCompareBoard } from "./troi-nam-compare-board";

// Shorter than the live homepage's lead: the table itself now makes the three-way
// comparison, so the intro no longer needs to restate it before the reader sees it.
const LEAD = {
  vi: "Lá Số Việt trao bạn một bản đồ vận mệnh có căn cứ cổ thư và đồng hành trọn đời.",
  en: "La So Viet gives you a chart-backed reading that stays with you for life.",
} as const;

export function TroiNamCompare({ locale }: { locale: "en" | "vi" }) {
  return (
    <div className="hv3 tn-compare">
      <TroiNamCompareBoard lead={LEAD[locale]} />
    </div>
  );
}
