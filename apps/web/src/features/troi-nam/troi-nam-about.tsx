import { HomepageV3About } from "../homepage-v3/homepage-v3-static-sections";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamAbout({ locale }: { locale: "en" | "vi" }) {
  const lacquer = troiNamAsset("T04");
  const lanterns = troiNamAsset("L06");
  const mobileLanterns = troiNamAsset("L07");

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
        `}
      </style>
      <HomepageV3About locale={locale} />
    </div>
  );
}
