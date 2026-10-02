import { troiNamAsset, type TroiNamAsset } from '../troi-nam-assets';
import type { Theme } from '../../theme/site-theme';
import type { WorldQuality } from './troi-nam-world-types';

export type PaintedPalette = readonly [string, string];
// Approved painted ramps are shader data in linear sRGB, not CSS UI colors.
export const LIGHT_PALETTES: Readonly<Record<string, PaintedPalette>> = {
  W04: ['#c6baa6', '#e8decb'], W05: ['#9a8e76', '#dccba9'], W06: ['#6d6758', '#c4b28b'], W08: ['#77705f', '#c7baa4'],
  'W09.thuy-dinh-co': ['#756046', '#cfb894'], 'W09.thuyen-nan-tren-nuoc': ['#756046', '#cfb894'],
  T07: ['#9a8260', '#d9c8a5'], T03: ['#755718', '#bd934e'], T11: ['#bbb09d', '#e7dcc6'], P05: ['#755718', '#ad8644'],
};
export type WorldThemeConfig = Readonly<{
  theme: Theme; clearColor: number; phaseTone: number; rays: boolean; lanternHalo: boolean;
  sunSize: number; sunOpacity: number; palette(id: string): PaintedPalette | undefined;
  asset(id: string): TroiNamAsset;
}>;
export function worldThemeConfig(theme: Theme, quality: WorldQuality): WorldThemeConfig {
  const light = theme === 'light';
  return {
    theme, clearColor: light ? 0xf7f1e5 : 0x080706, phaseTone: light ? 0xeee5d6 : 0x060812,
    rays: !light, lanternHalo: !light, sunSize: light ? 2.4 : 6, sunOpacity: light ? .35 : .8,
    palette: id => light ? LIGHT_PALETTES[id] : undefined,
    asset(id) {
      const asset = troiNamAsset(id, theme);
      return light && quality === 'low' && asset.lowSrc ? { ...asset, src: asset.lowSrc, width: asset.lowWidth, height: asset.lowHeight } : asset;
    },
  };
}
