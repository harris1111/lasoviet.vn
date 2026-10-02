import manifest from "../../../public/images/troi-nam/manifest.json";

import lightManifest from "../../../public/images/troi-nam/manifest-light.json";
import type { Theme } from "../theme/site-theme";

export type TroiNamAsset = {
  src: string;
  srcSet?: string;
  lowSrc?: string;
  lowWidth?: number;
  lowHeight?: number;
  width?: number;
  height?: number;
};

export const TROI_NAM_ASSETS = manifest as Record<string, TroiNamAsset>;

const LIGHT_ASSETS = lightManifest as Record<string, TroiNamAsset>;
const SHARED_LIGHT = /^(?:S0[1-4]|C(?:0[1-9]|1[0-4])|T(?:08|10)|I0[12]\.|E01\.)/;
export function troiNamAsset(id: string, theme: Theme = "dark"): TroiNamAsset {
  const asset = theme === "dark" ? TROI_NAM_ASSETS[id] : LIGHT_ASSETS[id] ?? (SHARED_LIGHT.test(id) ? TROI_NAM_ASSETS[id] : undefined);
  if (!asset) {
    throw new Error(
      `Không có ảnh "${id}" trong manifest Trời Nam. Chạy lại: pnpm run assets:troi-nam <thư-mục>`,
    );
  }
  return asset;
}
