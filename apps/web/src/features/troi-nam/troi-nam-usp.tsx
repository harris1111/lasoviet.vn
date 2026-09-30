import type { CSSProperties } from "react";

import { HomepageV3Usp } from "../homepage-v3/homepage-v3-static-sections";
import { troiNamAsset } from "./troi-nam-assets";

export function TroiNamUsp() {
  const motifs = troiNamAsset("P02");

  return (
    <div
      className="hv3 tn-usp"
      style={{ "--tn-usp-motifs": `url("${motifs.src}")` } as CSSProperties}
    >
      <HomepageV3Usp />
    </div>
  );
}
