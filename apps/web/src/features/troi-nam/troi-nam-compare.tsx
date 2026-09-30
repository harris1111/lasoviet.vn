import { HomepageV3Compare } from "../homepage-v3/homepage-v3-compare";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamCompare() {
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
      <HomepageV3Compare />
    </div>
  );
}
