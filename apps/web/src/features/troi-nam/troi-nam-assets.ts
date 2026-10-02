import manifest from "../../../public/images/troi-nam/manifest.json";

export type TroiNamAsset = {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
};

export const TROI_NAM_ASSETS = manifest as Record<string, TroiNamAsset>;

export function troiNamAsset(id: string): TroiNamAsset {
  const asset = TROI_NAM_ASSETS[id];
  if (!asset) {
    throw new Error(
      `Không có ảnh "${id}" trong manifest Trời Nam. Chạy lại: pnpm run assets:troi-nam <thư-mục>`,
    );
  }
  return asset;
}
