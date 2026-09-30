# Trời Nam Homepage — Plan 1: Asset Pipeline & Hero Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 58 ChatGPT-generated source images into an optimised, SEO-named, typed asset library in the repo, and render the Trời Nam hero at a noindex preview route `/troi-nam`.

**Architecture:** A one-off Node script (`scripts/build-troi-nam-assets.mjs`) converts source PNGs into responsive WebP under `apps/web/public/images/troi-nam/`, repairs the repeating tiles so they are seamless, splits the sprite and icon grids into individual transparent PNGs, and emits a typed manifest consumed by React. A new feature folder `apps/web/src/features/troi-nam/` holds presentation only; the birth form is extracted from the v3 hero and shared. The preview route keeps the live homepage untouched until the Plan 5 switchover.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, vitest, sharp 0.35 (new root devDependency), CSS custom properties.

---

## Verification policy for this plan

The founder asked for minimum test and review ceremony. Two things get automated checks because a silent failure there is expensive and invisible:

1. **Manifest ↔ disk** — a missing asset renders a broken image on the live homepage later.
2. **The v3 hero refactor** — the existing homepage-v3 test suite is the regression net proving the live homepage still renders identically.

Everything else is verified once, by eye, at the single review gate in Task 6. No unit tests for path helpers, no per-task founder sign-off, no intermediate scoring rounds.

---

## Roadmap — where this plan sits

| Plan | Scope | Deliverable |
|---|---|---|
| **1 (this file)** | Asset pipeline + hero, static | `/troi-nam` shows a real hero with a working birth form |
| 2 | Remaining 11 sections, static, mobile-first | Full page reviewable end to end |
| 3 | Motion system (GSAP + Lenis), reduced-motion parity | Section reveals, scroll choreography |
| 4 | Three.js world: Tràng An scene, day→night, stars→chart | Hero becomes live 3D on capable devices |
| 5 | Performance, a11y, EN copy, switchover `/troi-nam` → `/`, PR | Ships |

---

## Source inventory

All 58 images are in `/Users/admin/Downloads/troi-nam-all/`. The script reads that folder; nothing there is committed.

Five textures are repeating tiles whose opposite edges do not line up as generated (`T01 T02 T05 T06 T08`). The script repairs them; no manual pre-processing is required.

---

## File structure

**Create:**

| Path | Responsibility |
|---|---|
| `scripts/build-troi-nam-assets.mjs` | One-off converter: seamless repair, responsive WebP, sprite splitting, manifest |
| `apps/web/src/features/troi-nam/troi-nam-assets.ts` | Typed accessor over the manifest; the only module that knows asset paths |
| `apps/web/src/features/troi-nam/troi-nam-assets.test.ts` | Asserts every manifest entry exists on disk |
| `apps/web/src/features/troi-nam/troi-nam-hero.tsx` | Hero section presentation |
| `apps/web/src/features/homepage-v3/homepage-v3-birth-form.tsx` | Birth form, shared by the v3 and Trời Nam heroes |
| `apps/web/src/app/[locale]/troi-nam/page.tsx` | Preview route, noindex |
| `apps/web/src/styles/troi-nam.css` | Trời Nam tokens + hero styles |
| `apps/web/messages/{vi,en}/troi-nam.json` | Copy |
| `apps/web/public/images/troi-nam/**` | Generated, committed |

**Modify:**

| Path | Change |
|---|---|
| `package.json` | Add `sharp` devDependency + `assets:troi-nam` script |
| `apps/web/src/features/homepage-v3/homepage-v3-hero.tsx` | Extract its birth form (Task 4) |
| `apps/web/src/i18n/request.ts` | Register the `troi-nam` namespace |
| `apps/web/src/styles/global.css` | Import `troi-nam.css` |

**Reuse unchanged:** `homepage-v3-birth-profile.ts`, `homepage-v3-hero-stage.ts`, `site-header.tsx`, `site-footer.tsx`.

---

## Naming map

Per `docs/22-art-direction.md` §0: lowercase, no Vietnamese diacritics, hyphen-separated, content plus page context.

| ID | Folder | Base name |
|---|---|---|
| L01 | canh | `trang-an-binh-minh-suong-vang-hero-trang-chu` |
| L02 | canh | `trang-an-binh-minh-suong-vang-hero-dien-thoai` |
| L03 | canh | `trang-an-hoang-hon-chuyen-dem-trang-chu` |
| L04 | canh | `ha-long-troi-sao-ngan-ha-trang-chu` |
| L05 | canh | `ha-long-troi-sao-ngan-ha-dien-thoai` |
| L06 | canh | `hoi-an-dem-hoa-dang-song-hoai-trang-chu` |
| L07 | canh | `hoi-an-dem-hoa-dang-song-hoai-dien-thoai` |
| L08 | canh | `mu-cang-chai-ruong-bac-thang-mua-nuoc-do-trang-chu` |
| L09 | canh | `trang-an-mua-xuan-hoa-gao-trang-chu` |
| L10 | canh | `trang-an-tet-hoa-dao-hoa-man-trang-chu` |
| L11 | canh | `trang-an-mua-ha-sen-trang-chu` |
| L12 | canh | `trang-an-mua-dong-suong-lanh-trang-chu` |
| L13 | canh | `thung-lung-tia-nang-nui-da-voi-trang-chu` |
| S01 | tranh | `guong-dong-soi-troi-sao-thau-hieu-chinh-minh` |
| S02 | tranh | `hai-thuyen-giay-ho-sen-hoang-hon-tinh-duyen` |
| S03 | tranh | `duong-da-len-nui-den-long-cong-viec-tien-bac` |
| S04 | tranh | `ruong-bac-thang-bong-trang-van-han-nam-nay` |
| S05 | tranh | `ca-chep-vang-la-ho-son-mai-tai-loc` |
| T01 | chat-lieu | `nen-son-mai-den-lien-mach-trang-chu` |
| T02 | chat-lieu | `vang-la-kieu-ky-lien-mach-trang-chu` |
| T03 | chat-lieu | `vun-vang-la-roi-trang-chu` |
| T04 | chat-lieu | `dai-tranh-son-mai-dat-vang-trang-chu` |
| T05 | chat-lieu | `mat-xa-cu-lien-mach-trang-chu` |
| T06 | chat-lieu | `son-mai-kham-xa-cu-thua-lien-mach-trang-chu` |
| T07 | chat-lieu | `may-kham-xa-cu-trang-chu` |
| T08 | chat-lieu | `giay-do-lien-mach-trang-chu` |
| T09 | chat-lieu | `giay-do-mep-xo-trang-chu` |
| T10 | chat-lieu | `tranh-son-mai-troi-nam-trang-chu` |
| T11 | chat-lieu | `suong-mo-bay-trang-chu` |
| P01 | hoa-tiet | `mat-trong-dong-dong-son-vong-vang-trang-chu` |
| P02 | hoa-tiet | `hoa-tiet-dong-son-chim-lac-huou-trang-chu` |
| P03 | hoa-tiet | `dai-vien-dong-son-lien-mach-trang-chu` |
| P04 | hoa-tiet | `may-lanh-net-vang-trang-chu` |
| P05 | hoa-tiet | `vong-12-phan-net-vang-trang-chu` |
| O01 | canh | `anh-chia-se-troi-sao-la-so-trang-chu` |
| C00 | chan-dung | `chan-dung-vu-duc-trong-doc-gia-hai-phong` |
| C01 | chan-dung | `chan-dung-hoang-tuan-anh-doc-gia-ha-noi` |
| C02 | chan-dung | `chan-dung-nguyen-mai-lan-doc-gia-tp-ho-chi-minh` |
| C03 | chan-dung | `chan-dung-tran-dinh-vinh-doc-gia-da-nang` |
| C04 | chan-dung | `chan-dung-le-thu-ha-doc-gia-can-tho` |
| C05 | chan-dung | `chan-dung-pham-thanh-thao-doc-gia-da-lat` |
| C06 | chan-dung | `chan-dung-dang-quang-huy-doc-gia-binh-duong` |
| C07 | chan-dung | `chan-dung-ngo-van-hung-doc-gia-nam-dinh` |
| C08 | chan-dung | `chan-dung-bui-phuong-linh-doc-gia-nha-trang` |
| C09 | chan-dung | `chan-dung-trinh-quoc-bao-doc-gia-ha-long` |
| C10 | chan-dung | `chan-dung-tran-minh-khoa-doc-gia-hue` |
| C11 | chan-dung | `chan-dung-do-my-hanh-doc-gia-vung-tau` |
| C12 | chan-dung | `chan-dung-le-thi-kim-oanh-doc-gia-thai-nguyen` |
| C13 | chan-dung | `chan-dung-phan-anh-dung-doc-gia-vinh` |
| C14 | chan-dung | `chan-dung-vo-thuy-trang-doc-gia-quy-nhon` |

---

## Task 1: Asset build script

**Files:**
- Modify: `package.json`
- Create: `scripts/build-troi-nam-assets.mjs`

- [ ] **Step 1: Install sharp**

`sharp@0.35.4` is already in the pnpm store (pulled in by Next.js), so this resolves without a download.

```bash
cd /Users/admin/_Projects/lasoviet.vn
corepack pnpm@11.25.0 add -Dw sharp@0.35.4
```

- [ ] **Step 2: Write the script**

Create `scripts/build-troi-nam-assets.mjs`:

```js
#!/usr/bin/env node
// One-off asset build for the Trời Nam homepage.
// Outputs are committed; contributors do not normally re-run this.
//
//   node scripts/build-troi-nam-assets.mjs ~/Downloads/troi-nam-all

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import sharp from "sharp";

const OUT_ROOT = resolve("apps/web/public/images/troi-nam");

/**
 * Photographic plates and portraits: responsive WebP.
 * `widths` are clamped to the source width; never upscale.
 */
const PHOTOS = [
  ["L01", "canh", "trang-an-binh-minh-suong-vang-hero-trang-chu", [640, 960, 1280, 1536]],
  ["L02", "canh", "trang-an-binh-minh-suong-vang-hero-dien-thoai", [420, 640, 828, 1024]],
  ["L03", "canh", "trang-an-hoang-hon-chuyen-dem-trang-chu", [640, 960, 1280, 1536]],
  ["L04", "canh", "ha-long-troi-sao-ngan-ha-trang-chu", [640, 960, 1280, 1536]],
  ["L05", "canh", "ha-long-troi-sao-ngan-ha-dien-thoai", [420, 640, 828, 1024]],
  ["L06", "canh", "hoi-an-dem-hoa-dang-song-hoai-trang-chu", [640, 960, 1280, 1536]],
  ["L07", "canh", "hoi-an-dem-hoa-dang-song-hoai-dien-thoai", [420, 640, 828, 1024]],
  ["L08", "canh", "mu-cang-chai-ruong-bac-thang-mua-nuoc-do-trang-chu", [640, 960, 1280, 1536]],
  ["L09", "canh", "trang-an-mua-xuan-hoa-gao-trang-chu", [640, 960, 1280, 1536]],
  ["L10", "canh", "trang-an-tet-hoa-dao-hoa-man-trang-chu", [640, 960, 1280, 1536]],
  ["L11", "canh", "trang-an-mua-ha-sen-trang-chu", [640, 960, 1280, 1536]],
  ["L12", "canh", "trang-an-mua-dong-suong-lanh-trang-chu", [640, 960, 1280, 1536]],
  ["L13", "canh", "thung-lung-tia-nang-nui-da-voi-trang-chu", [640, 960, 1280, 1536]],
  ["O01", "canh", "anh-chia-se-troi-sao-la-so-trang-chu", [1200, 1536]],
  ["S01", "tranh", "guong-dong-soi-troi-sao-thau-hieu-chinh-minh", [420, 640, 900, 1024]],
  ["S02", "tranh", "hai-thuyen-giay-ho-sen-hoang-hon-tinh-duyen", [420, 640, 900, 1024]],
  ["S03", "tranh", "duong-da-len-nui-den-long-cong-viec-tien-bac", [420, 640, 900, 1024]],
  ["S04", "tranh", "ruong-bac-thang-bong-trang-van-han-nam-nay", [420, 640, 900, 1024]],
  ["S05", "tranh", "ca-chep-vang-la-ho-son-mai-tai-loc", [420, 640, 900, 1024]],
  ["T04", "chat-lieu", "dai-tranh-son-mai-dat-vang-trang-chu", [960, 1536]],
  ["T10", "chat-lieu", "tranh-son-mai-troi-nam-trang-chu", [640, 1024]],
  ["C00", "chan-dung", "chan-dung-vu-duc-trong-doc-gia-hai-phong", [96, 192, 384]],
  ["C01", "chan-dung", "chan-dung-hoang-tuan-anh-doc-gia-ha-noi", [96, 192, 384]],
  ["C02", "chan-dung", "chan-dung-nguyen-mai-lan-doc-gia-tp-ho-chi-minh", [96, 192, 384]],
  ["C03", "chan-dung", "chan-dung-tran-dinh-vinh-doc-gia-da-nang", [96, 192, 384]],
  ["C04", "chan-dung", "chan-dung-le-thu-ha-doc-gia-can-tho", [96, 192, 384]],
  ["C05", "chan-dung", "chan-dung-pham-thanh-thao-doc-gia-da-lat", [96, 192, 384]],
  ["C06", "chan-dung", "chan-dung-dang-quang-huy-doc-gia-binh-duong", [96, 192, 384]],
  ["C07", "chan-dung", "chan-dung-ngo-van-hung-doc-gia-nam-dinh", [96, 192, 384]],
  ["C08", "chan-dung", "chan-dung-bui-phuong-linh-doc-gia-nha-trang", [96, 192, 384]],
  ["C09", "chan-dung", "chan-dung-trinh-quoc-bao-doc-gia-ha-long", [96, 192, 384]],
  ["C10", "chan-dung", "chan-dung-tran-minh-khoa-doc-gia-hue", [96, 192, 384]],
  ["C11", "chan-dung", "chan-dung-do-my-hanh-doc-gia-vung-tau", [96, 192, 384]],
  ["C12", "chan-dung", "chan-dung-le-thi-kim-oanh-doc-gia-thai-nguyen", [96, 192, 384]],
  ["C13", "chan-dung", "chan-dung-phan-anh-dung-doc-gia-vinh", [96, 192, 384]],
  ["C14", "chan-dung", "chan-dung-vo-thuy-trang-doc-gia-quy-nhon", [96, 192, 384]],
];

/** Repeating background tiles. Edges are repaired before export. */
const TILES = [
  ["T01", "chat-lieu", "nen-son-mai-den-lien-mach-trang-chu"],
  ["T02", "chat-lieu", "vang-la-kieu-ky-lien-mach-trang-chu"],
  ["T05", "chat-lieu", "mat-xa-cu-lien-mach-trang-chu"],
  ["T06", "chat-lieu", "son-mai-kham-xa-cu-thua-lien-mach-trang-chu"],
  ["T08", "chat-lieu", "giay-do-lien-mach-trang-chu"],
];

/** Transparent overlays exported as PNG to keep the alpha channel. */
const OVERLAYS = [
  ["T03", "chat-lieu", "vun-vang-la-roi-trang-chu"],
  ["T07", "chat-lieu", "may-kham-xa-cu-trang-chu"],
  ["T09", "chat-lieu", "giay-do-mep-xo-trang-chu"],
  ["T11", "chat-lieu", "suong-mo-bay-trang-chu"],
  ["P01", "hoa-tiet", "mat-trong-dong-dong-son-vong-vang-trang-chu"],
  ["P02", "hoa-tiet", "hoa-tiet-dong-son-chim-lac-huou-trang-chu"],
  ["P03", "hoa-tiet", "dai-vien-dong-son-lien-mach-trang-chu"],
  ["P04", "hoa-tiet", "may-lanh-net-vang-trang-chu"],
  ["P05", "hoa-tiet", "vong-12-phan-net-vang-trang-chu"],
];

/** Grids of separate objects, split by alpha bounding box. Names are in reading order. */
const GRIDS = [
  ["E01", "vat-the/la-vang", ["la-vang-mat-truoc-1", "la-vang-mat-truoc-2", "la-vang-mat-truoc-3",
    "la-vang-mat-sau-1", "la-vang-mat-sau-2", "la-vang-mat-sau-3"]],
  ["E02", "vat-the/hoa-dang", ["hoa-dang-kem", "hoa-dang-hong", "hoa-dang-do", "hoa-dang-vang"]],
  ["E04", "vat-the/sen", ["la-sen-1", "hoa-sen-no", "la-sen-2", "nu-sen",
    "canh-sen-1", "canh-sen-2", "canh-sen-3"]],
  ["E06", "vat-the/canh-gao", ["canh-hoa-gao-tien-canh"]],
  ["I01", "icon/cung", ["menh", "phu-mau", "phuc-duc", "dien-trach",
    "quan-loc", "no-boc", "thien-di", "tat-ach",
    "tai-bach", "tu-tuc", "phu-the", "huynh-de"]],
  ["I02", "icon/hanh-trinh", ["thau-hieu-chinh-minh", "tinh-duyen", "cong-viec-tien-bac", "nam-nay",
    "la-so-mien-phi", "luu-la-so", "mo-bang-la", "doc-ban-luan-giai",
    "lich-am", "gio-sinh", "rieng-tu", "cung-lien-quan"]],
];

/**
 * Wrap-blend a texture so opposite edges continue into each other.
 * Blending a strip of the far edge into the near edge and cropping it off leaves
 * two originally-adjacent pixel columns at the new seam, so the tile repeats cleanly.
 * The blend width is searched because a fixed offset can land on a real feature
 * (a gold-leaf sheet join, for example) and reintroduce a visible line.
 */
function seamlessify(data, width, height, channels) {
  const at = (buf, w, x, y, c) => buf[(y * w + x) * channels + c];
  const edgeCost = (buf, w, h) => {
    let seam = 0;
    let neighbour = 0;
    for (let y = 0; y < h; y++)
      for (let c = 0; c < 3; c++) {
        seam += Math.abs(at(buf, w, 0, y, c) - at(buf, w, w - 1, y, c));
        neighbour += Math.abs(at(buf, w, 1, y, c) - at(buf, w, 0, y, c));
      }
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 3; c++) {
        seam += Math.abs(at(buf, w, x, 0, c) - at(buf, w, x, h - 1, c));
        neighbour += Math.abs(at(buf, w, x, 1, c) - at(buf, w, x, 0, c));
      }
    return seam / Math.max(neighbour, 1);
  };

  const blend = (bw, bh) => {
    const w2 = width - bw;
    const h2 = height - bh;
    const out = Buffer.alloc(w2 * h2 * channels);
    for (let y = 0; y < h2; y++)
      for (let x = 0; x < w2; x++)
        for (let c = 0; c < channels; c++) {
          let v = at(data, width, x, y, c);
          if (x < bw) {
            const a = 1 - x / bw;
            v = v * (1 - a) + at(data, width, width - bw + x, y, c) * a;
          }
          if (y < bh) {
            const a = 1 - y / bh;
            let far = at(data, width, x, height - bh + y, c);
            if (x < bw) {
              const ax = 1 - x / bw;
              far = far * (1 - ax) + at(data, width, width - bw + x, height - bh + y, c) * ax;
            }
            v = v * (1 - a) + far * a;
          }
          out[(y * w2 + x) * channels + c] = Math.round(v);
        }
    return { buf: out, w: w2, h: h2 };
  };

  let best = null;
  for (let bw = Math.round(width * 0.18); bw <= Math.round(width * 0.32); bw += 12)
    for (let bh = Math.round(height * 0.18); bh <= Math.round(height * 0.32); bh += 12) {
      const cand = blend(bw, bh);
      const cost = edgeCost(cand.buf, cand.w, cand.h);
      if (!best || cost < best.cost) best = { ...cand, cost };
    }
  return best;
}

async function run() {
  const srcDir = process.argv[2];
  if (!srcDir) {
    console.error("Cách dùng: node scripts/build-troi-nam-assets.mjs <thư-mục-ảnh-nguồn>");
    process.exit(1);
  }
  const files = new Set(readdirSync(srcDir));
  const manifest = {};
  const missing = [];
  const src = (id) => (files.has(`${id}.png`) ? join(srcDir, `${id}.png`) : null);

  for (const [id, folder, base, widths] of PHOTOS) {
    const input = src(id);
    if (!input) { missing.push(id); continue; }
    const outDir = join(OUT_ROOT, folder);
    mkdirSync(outDir, { recursive: true });
    const meta = await sharp(input).metadata();
    const use = widths.filter((w) => w <= meta.width);
    for (const w of use) {
      await sharp(input)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 78, effort: 6 })
        .toFile(join(outDir, `${base}-${w}w.webp`));
    }
    manifest[id] = {
      src: `/images/troi-nam/${folder}/${base}-${use[use.length - 1]}w.webp`,
      srcSet: use.map((w) => `/images/troi-nam/${folder}/${base}-${w}w.webp ${w}w`).join(", "),
      width: meta.width,
      height: meta.height,
    };
    console.log(`  ${id} → ${base} (${use.join(", ")}w)`);
  }

  for (const [id, folder, base] of TILES) {
    const input = src(id);
    if (!input) { missing.push(id); continue; }
    const outDir = join(OUT_ROOT, folder);
    mkdirSync(outDir, { recursive: true });
    const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const fixed = seamlessify(data, info.width, info.height, info.channels);
    await sharp(fixed.buf, { raw: { width: fixed.w, height: fixed.h, channels: info.channels } })
      .webp({ quality: 82, effort: 6 })
      .toFile(join(outDir, `${base}.webp`));
    manifest[id] = {
      src: `/images/troi-nam/${folder}/${base}.webp`,
      width: fixed.w,
      height: fixed.h,
    };
    console.log(`  ${id} → ${base} (tile ${fixed.w}×${fixed.h}, lệch mép ${fixed.cost.toFixed(2)}×)`);
  }

  for (const [id, folder, base] of OVERLAYS) {
    const input = src(id);
    if (!input) { missing.push(id); continue; }
    const outDir = join(OUT_ROOT, folder);
    mkdirSync(outDir, { recursive: true });
    const out = join(outDir, `${base}.png`);
    await sharp(input).ensureAlpha().png({ compressionLevel: 9 }).toFile(out);
    const meta = await sharp(out).metadata();
    manifest[id] = { src: `/images/troi-nam/${folder}/${base}.png`, width: meta.width, height: meta.height };
    console.log(`  ${id} → ${base} (alpha)`);
  }

  for (const [id, folder, names] of GRIDS) {
    const input = src(id);
    if (!input) { missing.push(id); continue; }
    const image = sharp(input);
    const { width, height } = await image.metadata();
    const alpha = await image.clone().ensureAlpha().extractChannel(3).raw().toBuffer();
    const boxes = orderBoxes(findIslands(alpha, width, height));
    if (boxes.length !== names.length) {
      console.warn(`  ${id}: tách được ${boxes.length} vật thể nhưng bảng tên có ${names.length} — bỏ qua, sửa bảng GRIDS rồi chạy lại`);
      continue;
    }
    const outDir = join(OUT_ROOT, folder);
    mkdirSync(outDir, { recursive: true });
    const pad = 4;
    for (const [i, box] of boxes.entries()) {
      const left = Math.max(0, box.x - pad);
      const top = Math.max(0, box.y - pad);
      await sharp(input)
        .extract({
          left,
          top,
          width: Math.min(width - left, box.w + pad * 2),
          height: Math.min(height - top, box.h + pad * 2),
        })
        .png({ compressionLevel: 9 })
        .toFile(join(outDir, `${names[i]}.png`));
      manifest[`${id}.${names[i]}`] = { src: `/images/troi-nam/${folder}/${names[i]}.png` };
    }
    console.log(`  ${id} → tách ${boxes.length} vật thể vào ${folder}/`);
  }

  mkdirSync(OUT_ROOT, { recursive: true });
  writeFileSync(join(OUT_ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nXong. ${Object.keys(manifest).length} mục trong manifest.json`);
  if (missing.length) console.warn(`Thiếu file nguồn: ${missing.join(", ")}`);
}

/** Flood-fill opaque islands in an alpha mask and return their bounding boxes. */
function findIslands(alpha, width, height, threshold = 24, minArea = 900) {
  const seen = new Uint8Array(width * height);
  const boxes = [];
  const stack = [];
  for (let start = 0; start < alpha.length; start++) {
    if (seen[start] || alpha[start] < threshold) continue;
    let minX = width, minY = height, maxX = 0, maxY = 0, area = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      const x = i % width;
      const y = (i / width) | 0;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && !seen[i - 1] && alpha[i - 1] >= threshold) { seen[i - 1] = 1; stack.push(i - 1); }
      if (x < width - 1 && !seen[i + 1] && alpha[i + 1] >= threshold) { seen[i + 1] = 1; stack.push(i + 1); }
      if (y > 0 && !seen[i - width] && alpha[i - width] >= threshold) { seen[i - width] = 1; stack.push(i - width); }
      if (y < height - 1 && !seen[i + width] && alpha[i + width] >= threshold) { seen[i + width] = 1; stack.push(i + width); }
    }
    if (area >= minArea) boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
  }
  return boxes;
}

/** Reading order: rows top→bottom, then left→right within a row. */
function orderBoxes(boxes) {
  if (boxes.length === 0) return [];
  const sorted = [...boxes].sort((a, b) => a.y - b.y);
  const rows = [];
  let current = [sorted[0]];
  for (const box of sorted.slice(1)) {
    const prev = current[current.length - 1];
    if (box.y < prev.y + prev.h * 0.5) current.push(box);
    else { rows.push(current); current = [box]; }
  }
  rows.push(current);
  return rows.flatMap((row) => [...row].sort((a, b) => a.x - b.x));
}

await run();
```

- [ ] **Step 3: Add the npm script**

In `package.json`, inside `"scripts"`, after `"config:contact:check"`:

```json
    "assets:troi-nam": "node scripts/build-troi-nam-assets.mjs",
```

- [ ] **Step 4: Run the build**

```bash
corepack pnpm@11.25.0 run assets:troi-nam /Users/admin/Downloads/troi-nam-all
```

Expected: one line per asset, then `Xong. ~90 mục trong manifest.json` with no "Thiếu file nguồn" warning.

Two things to read in the output:
- Every tile line should print `lệch mép` **below 1.5×**. Above that, the tile will show a visible line when repeated; raise the search range in `seamlessify` and re-run.
- Any grid that warns about a count mismatch needs its `names` array corrected against the actual image before re-running. `E03` and `E05` are deliberately absent from `GRIDS` because their petals touch and do not separate cleanly; Plan 2 adds them by hand if it needs them.

- [ ] **Step 5: Check the committed size**

```bash
du -sh apps/web/public/images/troi-nam
find apps/web/public/images/troi-nam -size +400k
```

Expected: under 20 MB total and nothing over 400 KB. If a file is bigger, lower its `quality` and re-run.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/build-troi-nam-assets.mjs apps/web/public/images/troi-nam
git commit -m "feat(assets): build the Troi Nam image library

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Typed asset accessor

The manifest is generated JSON. React must not hold raw paths; one typed module owns them so a missing asset fails a test instead of shipping a broken image.

**Files:**
- Create: `apps/web/src/features/troi-nam/troi-nam-assets.ts`
- Create: `apps/web/src/features/troi-nam/troi-nam-assets.test.ts`

- [ ] **Step 1: Write the accessor**

Create `apps/web/src/features/troi-nam/troi-nam-assets.ts`:

```ts
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
    throw new Error(`Không có ảnh "${id}" trong manifest Trời Nam. Chạy lại: pnpm run assets:troi-nam <thư-mục>`);
  }
  return asset;
}
```

- [ ] **Step 2: Write the disk-existence test**

Create `apps/web/src/features/troi-nam/troi-nam-assets.test.ts`:

```ts
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { TROI_NAM_ASSETS, troiNamAsset } from "./troi-nam-assets";

const PUBLIC_DIR = resolve(__dirname, "../../../public");

describe("troiNamAsset", () => {
  it("points every manifest entry at a file that exists on disk", () => {
    const missing = Object.entries(TROI_NAM_ASSETS)
      .filter(([, asset]) => !existsSync(resolve(PUBLIC_DIR, `.${asset.src}`)))
      .map(([id]) => id);
    expect(missing).toEqual([]);
  });

  it("throws a named error for an unknown id", () => {
    expect(() => troiNamAsset("NOPE")).toThrow(/NOPE/);
  });
});
```

- [ ] **Step 3: Run it**

```bash
corepack pnpm@11.25.0 exec vitest run apps/web/src/features/troi-nam/troi-nam-assets.test.ts
```

Expected: PASS, 2 tests.

---

## Task 3: i18n namespace, tokens and styles

**Files:**
- Create: `apps/web/messages/vi/troi-nam.json`, `apps/web/messages/en/troi-nam.json`
- Create: `apps/web/src/styles/troi-nam.css`
- Modify: `apps/web/src/i18n/request.ts`, `apps/web/src/styles/global.css`

- [ ] **Step 1: Write the copy**

`apps/web/messages/vi/troi-nam.json`. Founder decision 2026-09-30: the Trời Nam headline replaces the `docs/13` §1 canonical line as the `<h1>`; the canonical line moves down to the subtitle so the product action still reads first under the poetry. The headline is split into two spans for display only — concatenated with a space it must equal the approved sentence word for word.

```json
{
  "hero": {
    "h1a": "Mỗi người được sinh ra",
    "h1b": "đều là một vì sao trên bầu trời.",
    "sub": "Lập lá số. Hiểu vận mệnh.",
    "plateAlt": "Bình minh trên sông nước Tràng An, núi đá vôi trong sương và một chiếc thuyền nhỏ"
  }
}
```

`apps/web/messages/en/troi-nam.json`, same key shape:

```json
{
  "hero": {
    "h1a": "Every person is born",
    "h1b": "as a star in the sky.",
    "sub": "Cast your chart. Read your life.",
    "plateAlt": "Dawn over the Trang An river, limestone karst in mist and a small wooden boat"
  }
}
```

- [ ] **Step 2: Register the namespace**

In `apps/web/src/i18n/request.ts`, add next to the existing homepage-v3 imports:

```ts
import enTroiNam from "../../messages/en/troi-nam.json";
import viTroiNam from "../../messages/vi/troi-nam.json";
```

Then add `"troi-nam": viTroiNam,` to the `vi` object and `"troi-nam": enTroiNam,` to the `en` object.

- [ ] **Step 3: Write the stylesheet**

Create `apps/web/src/styles/troi-nam.css`:

```css
/* Trời Nam — homepage visual system. Tokens first, then the hero. */

.tn {
  --tn-ink: var(--lacquer-950);
  --tn-gold: var(--gold-500);
  --tn-gold-light: var(--gold-400);
  --tn-text: var(--pearl-100);
  --tn-text-muted: var(--pearl-400);

  /* Display peaks at 120px on desktop and stays readable at 320px. */
  --tn-display: clamp(2.5rem, 1.6rem + 4.6vw, 7.5rem);
  --tn-h2: clamp(1.75rem, 1.2rem + 2.4vw, 3.25rem);
  --tn-body: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);

  --tn-gutter: clamp(1rem, 0.5rem + 2.5vw, 4rem);
  --tn-section-y: clamp(3.5rem, 2rem + 7vw, 8rem);
  --tn-max: 1280px;

  background: var(--tn-ink);
  color: var(--tn-text);
}

.tn-section {
  padding-block: var(--tn-section-y);
  padding-inline: var(--tn-gutter);
}

.tn-shell {
  max-width: var(--tn-max);
  margin-inline: auto;
}

/* ---- Hero ---- */

.tn-hero {
  position: relative;
  isolation: isolate;
  min-height: 100svh;
  display: grid;
  align-content: end;
  gap: clamp(1.5rem, 1rem + 2vw, 2.5rem);
  padding-block: clamp(5rem, 4rem + 6vw, 7rem) clamp(2rem, 1.5rem + 3vw, 4rem);
  padding-inline: var(--tn-gutter);
  overflow: clip;
}

.tn-hero-plate {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 62% 50%;
}

/* Keeps ivory text legible over the plate's brightest band. */
.tn-hero-scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    180deg,
    rgb(8 7 6 / 0.72) 0%,
    rgb(8 7 6 / 0.28) 42%,
    rgb(8 7 6 / 0.88) 100%
  );
}

.tn-hero-copy {
  max-width: 34ch;
}

.tn-hero-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--tn-display);
  font-weight: 600;
  line-height: 0.96;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.tn-hero-title span {
  display: block;
}

.tn-hero-title span + span {
  color: var(--tn-gold-light);
}

.tn-hero-sub {
  margin: clamp(0.75rem, 0.5rem + 1vw, 1.25rem) 0 0;
  max-width: 30ch;
  font-size: var(--tn-body);
  line-height: 1.55;
  color: var(--tn-text-muted);
}

.tn-hero-form {
  border: 1px solid var(--lacquer-line);
  border-radius: 16px;
  background: rgb(15 13 10 / 0.82);
  backdrop-filter: blur(10px);
  padding: clamp(1rem, 0.75rem + 1.5vw, 1.75rem);
}

@media (min-width: 880px) {
  .tn-hero {
    align-content: center;
    align-items: center;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 420px);
    gap: clamp(2rem, 1rem + 4vw, 5rem);
  }

  .tn-hero-plate {
    object-position: 70% 50%;
  }

  .tn-hero-scrim {
    background:
      linear-gradient(90deg, rgb(8 7 6 / 0.92) 0%, rgb(8 7 6 / 0.62) 46%, rgb(8 7 6 / 0.15) 78%),
      linear-gradient(180deg, rgb(8 7 6 / 0.45) 0%, rgb(8 7 6 / 0) 35%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tn * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 4: Import the stylesheet**

In `apps/web/src/styles/global.css`, add after the `homepage-v4-art.css` import:

```css
@import "./troi-nam.css";
```

---

## Task 4: Extract the birth form from the v3 hero

`homepage-v3-hero.tsx` is a headline plus a birth form in one 322-line file (`<h1>` at line 142, `<form>` at line 149). Trời Nam needs the form but owns its own headline, and a page must not have two `<h1>` elements. Split the file so the form is a component both heroes render.

**Files:**
- Create: `apps/web/src/features/homepage-v3/homepage-v3-birth-form.tsx`
- Modify: `apps/web/src/features/homepage-v3/homepage-v3-hero.tsx`

- [ ] **Step 1: Move the form into its own file**

Create `apps/web/src/features/homepage-v3/homepage-v3-birth-form.tsx`. Move the `"use client"` directive, every import, all hooks, state and handlers (lines 1–138) and the `<form>` element with everything inside it (from line 149) out of `homepage-v3-hero.tsx`:

```tsx
export function HomepageV3BirthForm({ locale }: { locale: Locale }) {
  // … hooks, state and handlers moved verbatim …
  return (
    <form noValidate onSubmit={onSubmit} aria-label={t("formLabel")} className="hv3-form">
      {/* … form JSX moved verbatim … */}
    </form>
  );
}
```

Rename nothing — not a class, not a handler, not a message key. The v3 markup must come out identical.

- [ ] **Step 2: Make the v3 hero render the extracted form**

`homepage-v3-hero.tsx` becomes a thin wrapper that keeps its existing surrounding JSX (the `hv3-hero-inner` div, the headline, and the chart) and swaps the inlined form for the component:

```tsx
"use client";

import { useTranslations } from "next-intl";

import type { Locale } from "../../i18n/routing";
import { HomepageV3BirthForm } from "./homepage-v3-birth-form";
import { HomepageV3HeroChart } from "./homepage-v3-hero-chart";

export function HomepageV3Hero({ locale }: { locale: Locale }) {
  const t = useTranslations("homepage-v3.hero");

  return (
    <div className="hv3-hero-inner">
      <div>
        <h1 className="hv3-h1">
          {t("h1a")}
          <br />
          <span className="hv3-accent">{t("h1b")}</span>
        </h1>
        <HomepageV3BirthForm locale={locale} />
      </div>
      <HomepageV3HeroChart locale={locale} />
    </div>
  );
}
```

Match the real file: keep whatever wrapper elements, props and sibling nodes lines 139–148 currently contain. The goal is identical output, not this exact skeleton.

- [ ] **Step 3: Prove the live homepage did not change**

```bash
corepack pnpm@11.25.0 exec vitest run apps/web/src/features/homepage-v3
```

Expected: the whole existing v3 suite passes unchanged. This is the regression net for the live homepage — if it passes, the refactor is safe.

---

## Task 5: Hero component and preview route

**Files:**
- Create: `apps/web/src/features/troi-nam/troi-nam-hero.tsx`
- Create: `apps/web/src/app/[locale]/troi-nam/page.tsx`

- [ ] **Step 1: Write the hero**

Create `apps/web/src/features/troi-nam/troi-nam-hero.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";

import { HomepageV3BirthForm } from "../homepage-v3/homepage-v3-birth-form";
import { troiNamAsset } from "./troi-nam-assets";

const MOBILE = "(max-width: 879px)";

export function TroiNamHero({ locale }: { locale: "en" | "vi" }) {
  const t = useTranslations("troi-nam");
  const desktop = troiNamAsset("L01");
  const mobile = troiNamAsset("L02");

  return (
    <section className="tn-hero" data-troi-nam-block="hero" id="lap-la-so">
      <picture>
        <source media={MOBILE} srcSet={mobile.srcSet} sizes="100vw" />
        <img
          className="tn-hero-plate"
          src={desktop.src}
          srcSet={desktop.srcSet}
          sizes="100vw"
          width={desktop.width}
          height={desktop.height}
          alt={t("hero.plateAlt")}
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <div className="tn-hero-scrim" aria-hidden="true" />

      <div className="tn-hero-copy">
        <h1 className="tn-hero-title">
          <span>{t("hero.h1a")}</span>
          <span>{t("hero.h1b")}</span>
        </h1>
        <p className="tn-hero-sub">{t("hero.sub")}</p>
      </div>

      <div className="tn-hero-form">
        <HomepageV3BirthForm locale={locale} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Write the route**

Create `apps/web/src/app/[locale]/troi-nam/page.tsx`:

```tsx
import type { Metadata } from "next";

import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { TroiNamHero } from "../../../features/troi-nam/troi-nam-hero";

type PageProps = { params: Promise<{ locale: "en" | "vi" }> };

// Preview only. The live homepage stays at `/` until the Plan 5 switchover.
export const metadata: Metadata = {
  title: "Trời Nam — bản xem trước",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="tn">
      <SiteHeader locale={locale} />
      <main>
        <TroiNamHero locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
```

---

## Task 6: Single review gate

Everything is verified once, here.

- [ ] **Step 1: Run the checks**

```bash
corepack pnpm@11.25.0 run i18n:check \
  && corepack pnpm@11.25.0 run lint \
  && corepack pnpm@11.25.0 run typecheck \
  && corepack pnpm@11.25.0 run test:unit
```

Expected: 0 errors. Pre-existing warnings are fine; new ones are not.

- [ ] **Step 2: Capture the four breakpoints**

With `corepack pnpm@11.25.0 --filter @lasoviet/web dev` running:

```bash
node - <<'EOF'
const { chromium } = require("./node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  for (const [name, w, h] of [["320", 320, 720], ["390", 390, 844], ["768", 768, 1024], ["1440", 1440, 900]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    await p.goto("http://localhost:3000/vi/troi-nam", { waitUntil: "load" });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `/tmp/troi-nam-${name}.png`, fullPage: true });
    console.log(name, "tràn ngang:", await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
    await p.close();
  }
  await b.close();
})();
EOF
```

Expected: `tràn ngang: false` at all four widths.

- [ ] **Step 3: Check the live homepage is untouched**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/vi
```

Expected: `200`, and the page still looks exactly as before. The v3 suite in Step 1 already proves the markup.

- [ ] **Step 4: Founder review**

Send the four screenshots. This is the only sign-off in Plan 1. Ask ChatGPT for an independent score out of 10 from the same screenshots; it has no access to the code, so the read is clean.

Proceed to Plan 2 when the founder approves.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/troi-nam apps/web/src/features/homepage-v3/homepage-v3-birth-form.tsx \
  apps/web/src/features/homepage-v3/homepage-v3-hero.tsx apps/web/src/app/\[locale\]/troi-nam \
  apps/web/src/styles/troi-nam.css apps/web/src/styles/global.css \
  apps/web/messages/vi/troi-nam.json apps/web/messages/en/troi-nam.json apps/web/src/i18n/request.ts
git commit -m "feat(troi-nam): add the hero and its noindex preview route

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Work for ChatGPT in parallel

| When | Task |
|---|---|
| During Task 1 | If a grid warns about a count mismatch, regenerate that grid with the objects clearly separated |
| At Task 6 Step 4 | Score the four screenshots out of 10 against the Apple-level bar, without code access |
| Any time | Draft Vietnamese variants for the hero subtitle |

---

## Definition of done

- [ ] `i18n:check`, `lint`, `typecheck`, `test:unit` all pass
- [ ] `/vi/troi-nam` and `/en/troi-nam` return 200 and are noindex
- [ ] No horizontal scroll at 320, 390, 768, 1440
- [ ] Every manifest entry exists on disk (enforced by test)
- [ ] The live homepage at `/` renders exactly as before (enforced by the v3 suite)
- [ ] Founder approves the four screenshots
