import { HomepageV3Value } from "../homepage-v3/homepage-v3-static-sections";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamValue({ locale }: { locale: "en" | "vi" }) {
  const icons = ["I02.la-so-mien-phi", "I02.luu-la-so", "I02.mo-bang-la"];
  // Step 3 ("Mở khóa bằng Lá") gets two drifting gold leaves via ::before/::after
  // on its <li> — see troi-nam.css — since that <li> belongs to the shared,
  // unmodified HomepageV3Value and can't take real injected children.
  const leafFront = troiNamAsset("E01.la-vang-mat-truoc-1");
  const leafBack = troiNamAsset("E01.la-vang-mat-sau-2");
  const sunlitValley = troiNamAsset("L13");

  return (
    <div className="hv3 tn-value">
      {icons.map((id, index) => (
        <style key={id}>
          {`
            .tn .tn-value .hv3-step-visual[data-step="${index + 1}"] {
              background-image: url("${troiNamAsset(id).src}");
            }
          `}
        </style>
      ))}
      <style>
        {`
          .tn .tn-value .hv3-steps li[data-step="3"] {
            background-image: linear-gradient(rgb(16 14 12 / 0.8), rgb(16 14 12 / 0.92)), url("${sunlitValley.src}");
            background-size: cover;
            background-position: center;
          }
          .tn .tn-value .hv3-steps li[data-step="3"]::before {
            background-image: url("${leafFront.src}");
          }
          .tn .tn-value .hv3-steps li[data-step="3"]::after {
            background-image: url("${leafBack.src}");
          }
        `}
      </style>
      <HomepageV3Value locale={locale} showPacks={false} />
    </div>
  );
}
