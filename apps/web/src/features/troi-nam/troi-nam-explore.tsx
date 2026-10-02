import { CANONICAL_BRANCH_IDS } from "../birth-profile/homepage-birth-prefill";
import { palaceOnBranch, type PalaceId } from "../homepage-v3/homepage-v3-data";
import { HomepageV3Explore } from "../homepage-v3/homepage-v3-explore";
import { troiNamAsset } from "./troi-nam-assets";

const PALACE_ICONS: Record<PalaceId, string> = {
  menh: "I01.menh", huynh: "I01.huynh-de", phuthe: "I01.phu-the",
  tutuc: "I01.tu-tuc", taibach: "I01.tai-bach", tatach: "I01.tat-ach",
  thiendi: "I01.thien-di", nobo: "I01.no-boc", quanloc: "I01.quan-loc",
  dientrach: "I01.dien-trach", phucduc: "I01.phuc-duc", phumau: "I01.phu-mau",
};

// Shared Explore renders its twelve buttons in canonical branch order. Artwork
// follows palace identity, never translated labels or the current selection.
const palaceArt = CANONICAL_BRANCH_IDS.map((_, index) => `
  .tn .tn-explore .hv3-cell:nth-child(${index + 1})::before {
    background-image: url("${troiNamAsset(PALACE_ICONS[palaceOnBranch(index).id]).src}");
  }
`).join("\n");

export function TroiNamExplore({ locale }: { locale: "en" | "vi" }) {
  const texture = troiNamAsset("T01");

  return (
    <div className="hv3 tn-explore" id="la-so-mau">
      <style>{palaceArt}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="tn-explore-texture"
        src={texture.src}
        width={texture.width}
        height={texture.height}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
      <HomepageV3Explore locale={locale} />
    </div>
  );
}
