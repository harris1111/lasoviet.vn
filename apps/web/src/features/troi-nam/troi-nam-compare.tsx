import { HomepageV3Compare } from "../homepage-v3/homepage-v3-compare";
import { troiNamAsset } from "./troi-nam-assets";

// Shorter than the live homepage's lead: the table itself now makes the three-way
// comparison, so the intro no longer needs to restate it before the reader sees it.
const LEAD = {
  vi: "Lá Số Việt trao bạn một bản đồ vận mệnh có căn cứ cổ thư và đồng hành trọn đời.",
  en: "La So Viet gives you a chart-backed reading that stays with you for life.",
} as const;

export function TroiNamCompare({ locale }: { locale: "en" | "vi" }) {
  const texture = troiNamAsset("T08");

  return (
    <div className="hv3 tn-compare">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="tn-compare-texture"
        src={texture.src}
        width={texture.width}
        height={texture.height}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
      <HomepageV3Compare lead={LEAD[locale]} defaultOpen />
    </div>
  );
}
