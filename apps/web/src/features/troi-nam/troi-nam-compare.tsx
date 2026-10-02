import { HomepageV3Compare } from "../homepage-v3/homepage-v3-compare";
import { troiNamAsset } from "./troi-nam-assets";

// Shorter than the live homepage's lead: the table itself now makes the three-way
// comparison, so the intro no longer needs to restate it before the reader sees it.
export function TroiNamCompare(_props: { locale: "en" | "vi" }) {
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
      <HomepageV3Compare alwaysVisible />
    </div>
  );
}
