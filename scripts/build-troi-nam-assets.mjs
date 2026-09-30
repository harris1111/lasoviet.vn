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
 * Widths are clamped to the source width; never upscale.
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

/**
 * Transparent overlays, exported as WebP with alpha — a PNG of the same image runs
 * 2–3 MB. Photographic overlays take lossy compression; gold line art takes lossless
 * so thin strokes do not pick up ringing.
 */
const OVERLAYS = [
  ["T03", "chat-lieu", "vun-vang-la-roi-trang-chu", "photo"],
  ["T07", "chat-lieu", "may-kham-xa-cu-trang-chu", "photo"],
  ["T09", "chat-lieu", "giay-do-mep-xo-trang-chu", "photo"],
  ["T11", "chat-lieu", "suong-mo-bay-trang-chu", "photo"],
  ["P01", "hoa-tiet", "mat-trong-dong-dong-son-vong-vang-trang-chu", "line"],
  ["P02", "hoa-tiet", "hoa-tiet-dong-son-chim-lac-huou-trang-chu", "line"],
  ["P03", "hoa-tiet", "dai-vien-dong-son-lien-mach-trang-chu", "line"],
  ["P04", "hoa-tiet", "may-lanh-net-vang-trang-chu", "line"],
  ["P05", "hoa-tiet", "vong-12-phan-net-vang-trang-chu", "line"],
];

/**
 * WebP settings by content type. Alpha is preserved in both.
 * Line-art ornaments are capped at 640px: they render around 400–500px as decoration,
 * and a full-size lossless copy of the Đông Sơn drum costs 1.4 MB on its own.
 */
const WEBP = {
  photo: { quality: 80, alphaQuality: 90, effort: 6 },
  line: { quality: 84, alphaQuality: 100, effort: 6 },
};
const LINE_MAX_WIDTH = 640;

/**
 * Icon sheets. These were generated as gold line art on solid near-black, not on
 * transparency, and a single icon is often several disconnected strokes (the ring of
 * dots around Mệnh, for example). So they are cut on their known grid rather than by
 * island detection, and the black is knocked out by using luminance as the alpha
 * channel, which preserves the antialiased stroke edges.
 */
const ICON_SHEETS = [
  ["I01", "icon/cung", 4, 3, ["menh", "phu-mau", "phuc-duc", "dien-trach",
    "quan-loc", "no-boc", "thien-di", "tat-ach",
    "tai-bach", "tu-tuc", "phu-the", "huynh-de"]],
  ["I02", "icon/hanh-trinh", 4, 3, ["thau-hieu-chinh-minh", "tinh-duyen", "cong-viec-tien-bac", "nam-nay",
    "la-so-mien-phi", "luu-la-so", "mo-bang-la", "doc-ban-luan-giai",
    "lich-am", "gio-sinh", "rieng-tu", "cung-lien-quan"]],
];

/** Grids of separate objects, split by alpha bounding box. Names are in reading order. */
const GRIDS = [
  ["E01", "vat-the/la-vang", ["la-vang-mat-truoc-1", "la-vang-mat-truoc-2", "la-vang-mat-truoc-3",
    "la-vang-mat-sau-1", "la-vang-mat-sau-2", "la-vang-mat-sau-3"]],
  ["E02", "vat-the/hoa-dang", ["hoa-dang-kem", "hoa-dang-hong", "hoa-dang-do", "hoa-dang-vang"]],
  ["E04", "vat-the/sen", ["la-sen-1", "hoa-sen-no", "la-sen-2", "nu-sen",
    "canh-sen-1", "canh-sen-2", "canh-sen-3"]],
  ["E06", "vat-the/canh-gao", ["canh-hoa-gao-tien-canh"]],
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
    for (let y = 0; y < h; y++) {
      for (let c = 0; c < 3; c++) {
        seam += Math.abs(at(buf, w, 0, y, c) - at(buf, w, w - 1, y, c));
        neighbour += Math.abs(at(buf, w, 1, y, c) - at(buf, w, 0, y, c));
      }
    }
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        seam += Math.abs(at(buf, w, x, 0, c) - at(buf, w, x, h - 1, c));
        neighbour += Math.abs(at(buf, w, x, 1, c) - at(buf, w, x, 0, c));
      }
    }
    return seam / Math.max(neighbour, 1);
  };

  const blend = (bw, bh) => {
    const w2 = width - bw;
    const h2 = height - bh;
    const out = Buffer.alloc(w2 * h2 * channels);
    for (let y = 0; y < h2; y++) {
      for (let x = 0; x < w2; x++) {
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
      }
    }
    return { buf: out, w: w2, h: h2 };
  };

  let best = null;
  for (let bw = Math.round(width * 0.18); bw <= Math.round(width * 0.32); bw += 12) {
    for (let bh = Math.round(height * 0.18); bh <= Math.round(height * 0.32); bh += 12) {
      const cand = blend(bw, bh);
      const cost = edgeCost(cand.buf, cand.w, cand.h);
      if (!best || cost < best.cost) best = { ...cand, cost };
    }
  }
  return best;
}

/** Flood-fill opaque islands in an alpha mask and return their bounding boxes. */
function findIslands(alpha, width, height, threshold = 24, minArea = 900) {
  const seen = new Uint8Array(width * height);
  const boxes = [];
  const stack = [];
  for (let start = 0; start < alpha.length; start++) {
    if (seen[start] || alpha[start] < threshold) continue;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let area = 0;
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

/**
 * Cut one icon out of a sheet cell: trim to the lit pixels, then rebuild it as RGBA
 * with luminance as alpha so the near-black background disappears and the gold
 * stroke keeps its soft edges.
 */
async function cutIcon(input, cell, outPath) {
  const { data, info } = await sharp(input)
    .extract(cell)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const luma = new Uint8Array(width * height);
  let peak = 1;
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const v = Math.round(0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]);
    luma[i] = v;
    if (v > peak) peak = v;
  }

  // The source sheets are not spaced perfectly evenly, so the tip of an icon in the
  // next row can intrude a few pixels into this cell's edge. Ignore an edge band so
  // those slivers are neither measured nor exported.
  const inset = Math.round(Math.min(width, height) * 0.07);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < inset || x >= width - inset || y < inset || y >= height - inset) luma[y * width + x] = 0;
    }
  }

  const threshold = 40;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (luma[y * width + x] < threshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (minX > maxX) return false;

  const pad = 6;
  const x0 = Math.max(0, minX - pad);
  const y0 = Math.max(0, minY - pad);
  const w = Math.min(width - x0, maxX - minX + 1 + pad * 2);
  const h = Math.min(height - y0, maxY - minY + 1 + pad * 2);

  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y + y0) * width + (x + x0)) * channels;
      const d = (y * w + x) * 4;
      rgba[d] = data[s];
      rgba[d + 1] = data[s + 1];
      rgba[d + 2] = data[s + 2];
      rgba[d + 3] = Math.min(255, Math.round((luma[(y + y0) * width + (x + x0)] * 255) / peak));
    }
  }
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .webp(WEBP.line)
    .toFile(outPath);
  return true;
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

  for (const [id, folder, base, kind] of OVERLAYS) {
    const input = src(id);
    if (!input) { missing.push(id); continue; }
    const outDir = join(OUT_ROOT, folder);
    mkdirSync(outDir, { recursive: true });
    const out = join(outDir, `${base}.webp`);
    const pipeline = sharp(input).ensureAlpha();
    if (kind === "line") pipeline.resize({ width: LINE_MAX_WIDTH, withoutEnlargement: true });
    await pipeline.webp(WEBP[kind]).toFile(out);
    const meta = await sharp(out).metadata();
    manifest[id] = { src: `/images/troi-nam/${folder}/${base}.webp`, width: meta.width, height: meta.height };
    console.log(`  ${id} → ${base} (alpha, ${kind})`);
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
        .webp(WEBP.photo)
        .toFile(join(outDir, `${names[i]}.webp`));
      manifest[`${id}.${names[i]}`] = { src: `/images/troi-nam/${folder}/${names[i]}.webp` };
    }
    console.log(`  ${id} → tách ${boxes.length} vật thể vào ${folder}/`);
  }

  for (const [id, folder, cols, rows, names] of ICON_SHEETS) {
    const input = src(id);
    if (!input) { missing.push(id); continue; }
    const { width, height } = await sharp(input).metadata();
    const cellW = Math.floor(width / cols);
    const cellH = Math.floor(height / rows);
    const outDir = join(OUT_ROOT, folder);
    mkdirSync(outDir, { recursive: true });
    let cut = 0;
    for (const [i, name] of names.entries()) {
      const cell = {
        left: (i % cols) * cellW,
        top: Math.floor(i / cols) * cellH,
        width: cellW,
        height: cellH,
      };
      const out = join(outDir, `${name}.webp`);
      if (await cutIcon(input, cell, out)) {
        manifest[`${id}.${name}`] = { src: `/images/troi-nam/${folder}/${name}.webp` };
        cut++;
      } else {
        console.warn(`  ${id}.${name}: ô lưới trống, bỏ qua`);
      }
    }
    console.log(`  ${id} → tách ${cut}/${names.length} icon vào ${folder}/`);
  }

  mkdirSync(OUT_ROOT, { recursive: true });
  writeFileSync(join(OUT_ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nXong. ${Object.keys(manifest).length} mục trong manifest.json`);
  if (missing.length) console.warn(`Thiếu file nguồn: ${missing.join(", ")}`);
}

await run();
