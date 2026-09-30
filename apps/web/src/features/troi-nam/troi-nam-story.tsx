import { HomepageV3Story } from "../homepage-v3/homepage-v3-static-sections";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamStory() {
  const plate = troiNamAsset("L03");

  return (
    <div className="hv3 tn-story">
      <picture className="tn-story-media" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plate.src}
          srcSet={plate.srcSet}
          sizes="(min-width: 880px) 1280px, 100vw"
          width={plate.width}
          height={plate.height}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </picture>
      <HomepageV3Story />
    </div>
  );
}
