import { HomepageV3Value } from "../homepage-v3/homepage-v3-static-sections";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamValue({ locale }: { locale: "en" | "vi" }) {
  const icons = ["I02.la-so-mien-phi", "I02.luu-la-so", "I02.mo-bang-la"];

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
      <HomepageV3Value locale={locale} showPacks={false} />
    </div>
  );
}
