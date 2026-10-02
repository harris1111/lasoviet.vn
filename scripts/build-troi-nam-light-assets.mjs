#!/usr/bin/env node
// Rebuild committed light derivatives from the approved V2 handoff package.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/build-troi-nam-light-assets.mjs <V2-package>');
const publicRoot = resolve('apps/web/public');
const root = join(publicRoot, 'images/troi-nam/light');
mkdirSync(root, { recursive: true });
const dark = JSON.parse(readFileSync(join(publicRoot, 'images/troi-nam/manifest.json'), 'utf8'));
const manifest = {};
const staticFiles = {
  L01: 'trang-an-binh-minh-giay-do-sang-hero-desktop',
  L02: 'trang-an-binh-minh-giay-do-sang-hero-mobile',
  L06: 'hoi-an-song-hoai-chieu-vang-sang-cta-desktop',
  L07: 'hoi-an-song-hoai-chieu-vang-sang-cta-mobile',
  L13: 'thung-lung-nui-da-voi-nang-sang-gia-tri',
};
for (const [id, name] of Object.entries(staticFiles)) {
  const input = join(source, 'assets/generated', name + '.png');
  const meta = await sharp(input).metadata();
  const widths = id === 'L02' || id === 'L07' ? [420, 640, 828, 1024] : [640, 960, 1280, 1536];
  const candidates = [];
  let last;
  for (const width of [...new Set(widths.map(w => Math.min(w, meta.width)))]) {
    const filename = `${name}-${width}w.webp`;
    const out = await sharp(input).resize({ width }).webp({ quality: 85 }).toFile(join(root, filename));
    last = { src: '/images/troi-nam/light/' + filename, width: out.width, height: out.height };
    candidates.push(`${last.src} ${out.width}w`);
  }
  manifest[id] = { ...last, srcSet: candidates.join(', ') };
}
manifest.T01 = dark.T08;

const sizes = {
  W01: [640, 1280], W02: [640, 1280], W03: [640, 1280],
  W04: [640, 768], W05: [768, 960], W06: [960, 1280],
  W07: [960, 1280], W08: [960, 1280],
  'W09.thuy-dinh-co': [256, 384], 'W09.thuyen-nan-tren-nuoc': [256, 384],
  T03: [384, 512], T07: [384, 512], T11: [512, 768],
  P05: [384, 512], W10: [256, 384], W11: [128, 256],
};
for (const color of ['kem', 'hong', 'do', 'vang']) sizes[`E02.hoa-dang-${color}`] = [256, 256];
for (const [id, [low, high]] of Object.entries(sizes)) {
  const generated = ['W01', 'W02', 'W03', 'W07', 'W10', 'W11'].includes(id);
  const input = generated ? join(source, 'assets/world-light', id + '.webp') : join(publicRoot, dark[id].src);
  const name = generated ? `${id.toLowerCase()}-giay-do-sang` : basename(input, '.webp') + '-shared';
  const tiers = [];
  for (const width of [...new Set([low, high])]) {
    const filename = `${name}-${width}w.webp`;
    // Lossless derivatives preserve authored alpha, with no opaque matte.
    const out = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ lossless: true }).toFile(join(root, filename));
    tiers.push({ src: '/images/troi-nam/light/' + filename, width: out.width, height: out.height });
  }
  const asset = { ...tiers.at(-1), lowSrc: tiers[0].src, lowWidth: tiers[0].width, lowHeight: tiers[0].height };
  if (id === 'W11') for (let i = 1; i <= 6; i++) manifest[`W11.hat-sao-${i}`] = asset;
  else manifest[id] = asset;
}
writeFileSync(join(publicRoot, 'images/troi-nam/manifest-light.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Exported ${Object.keys(manifest).length} light asset entries`);
