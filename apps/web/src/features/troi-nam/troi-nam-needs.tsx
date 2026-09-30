import { HomepageV3Needs } from "../homepage-v3/homepage-v3-needs";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamNeeds({ locale }: { locale: "en" | "vi" }) {
  // Match the inspected NEEDS order: self, work, love, decision.
  // Asset-only rules leave the original component's state and DOM untouched.
  const assets = [
    { id: "self", plate: troiNamAsset("S01"), icon: troiNamAsset("I02.thau-hieu-chinh-minh") },
    { id: "work", plate: troiNamAsset("S03"), icon: troiNamAsset("I02.cong-viec-tien-bac") },
    { id: "love", plate: troiNamAsset("S02"), icon: troiNamAsset("I02.tinh-duyen") },
    // Keep the original decision icon; the year icon would mislabel this CTA.
    { id: "decision", plate: troiNamAsset("S04"), icon: null },
  ];

  return (
    <div className="hv3 tn-needs" id="nhu-cau">
      {assets.map((asset, index) => (
        <style key={asset.id}>
          {`
            .tn .tn-needs .hv3-need:nth-child(${index + 1})::before {
              background-image: url("${asset.plate.src}");
            }
            .tn .tn-needs:has(.hv3-need:nth-child(${index + 1})[aria-pressed="true"]) .hv3-need-art {
              background-image: url("${asset.plate.src}");
            }
            ${asset.icon ? `
              .tn .tn-needs .hv3-need:nth-child(${index + 1}) .hv3-need-icon {
                background-image: url("${asset.icon.src}");
              }
              .tn .tn-needs .hv3-need:nth-child(${index + 1}) .hv3-need-icon img {
                display: none;
              }
            ` : ""}
          `}
        </style>
      ))}
      <HomepageV3Needs locale={locale} />
    </div>
  );
}
