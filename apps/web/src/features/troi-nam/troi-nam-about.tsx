import { HomepageV3About } from "../homepage-v3/homepage-v3-static-sections";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamAbout({ locale }: { locale: "en" | "vi" }) {
  const lacquer = troiNamAsset("T10");
  const lanterns = troiNamAsset("L06");
  const mobileLanterns = troiNamAsset("L07");
  // Two floating hoa đăng drift in the closing CTA, on .hv3-final-cta itself —
  // ::before/::after on .hv3-final-cta-bg are already spoken for (disabled
  // v3 light-theme side plates, see troi-nam.css) and it's the last-painted
  // background layer anyway; .hv3-final-cta is still free.
  const lanternGold = troiNamAsset("E02.hoa-dang-vang");
  const lanternPink = troiNamAsset("E02.hoa-dang-hong");

  return (
    <div className="hv3 tn-about">
      {/* Asset-only rules preserve the original copy, links and wizard CTA. */}
      <style>
        {`
          .tn .tn-about .hv3-about-panel::before {
            background-image: url("${lacquer.src}");
          }
          .tn .tn-about .hv3-final-cta-bg {
            background-image: url("${mobileLanterns.src}");
          }
          @media (min-width: 880px) {
            .tn .tn-about .hv3-final-cta-bg {
              background-image: url("${lanterns.src}");
            }
          }
          .tn .tn-about .hv3-final-cta::before {
            background-image: url("${lanternGold.src}");
          }
          .tn .tn-about .hv3-final-cta::after {
            background-image: url("${lanternPink.src}");
          }
        `}
      </style>
      <HomepageV3About locale={locale} />
    </div>
  );
}
