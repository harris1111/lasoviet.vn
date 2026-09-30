import { HomepageV3Explore } from "../homepage-v3/homepage-v3-explore";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamExplore({ locale }: { locale: "en" | "vi" }) {
  const texture = troiNamAsset("T01");

  return (
    <div className="hv3 tn-explore" id="la-so-mau">
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
