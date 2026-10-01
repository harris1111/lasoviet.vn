---
phase: 1
title: foundation-fixes
status: completed
priority: P1
effort: 1d
dependencies: []
---

# Phase 1: Sửa nền tảng + dùng ngay ảnh sẵn có

## Overview

Sửa 6 lỗi đã kiểm chứng trong engine world, rồi bổ sung tấm "đêm" (L04/L05) vào crossfade
hero để hành trình bình minh → hoàng hôn → đêm sao hoàn chỉnh **bằng CSS thuần**, không phụ
thuộc WebGL. Kết thúc phase này trang đã đẹp hơn hiện tại và hết lỗi, kể cả khi không bao giờ
làm tiếp Phase 3–5.

## Requirements

**Functional**
- Canvas world bám viewport suốt quãng hero → explore (sticky hoạt động thật).
- Hero crossfade 3 tấm theo tiến độ cuộn: L01/L02 (bình minh) → L03 (hoàng hôn) → L04/L05 (đêm sao).
- Bật reduced-motion giữa chừng → không khởi tạo 3D, ảnh tĩnh giữ nguyên.
- Lỗi render bất kỳ lúc nào → lùi về ảnh tĩnh, không treo, không vòng lặp chạy tiếp.

**Non-functional**
- Không thêm dependency.
- Không đụng `/` hay component dùng chung (`SiteHeader`, `homepage-v3/*`).
- Tier low giới hạn 30fps **đo bằng thời gian**, không phụ thuộc tần số màn hình.

## Architecture

Crossfade 3 tấm dùng đúng cơ chế Plan 3 slice 1 đã có: `TroiNamHero` ghi hai biến CSS
`--tn-hero-dusk` và `--tn-hero-night` (0..1) từ `scenePhases(progress)`; CSS đổi `opacity`
của từng tấm. Hiện `--tn-hero-night` **đã được ghi nhưng chỉ dùng để tối màn hình**
(`.tn-hero-scrim-night`), chưa có tấm ảnh đêm nào. Phase này chỉ cần thêm tấm L04 và nối nó
vào biến sẵn có — không có logic mới.

Với sticky: thay `overflow: hidden` bằng `overflow: clip`. `clip` cắt tràn **mà không tạo
scroll container**, nên sticky tiếp tục bám viewport. Kỹ thuật này repo đã dùng ở `.tn-hero`.

## Related Code Files

- Modify: `apps/web/src/styles/troi-nam.css` (backdrop overflow, tấm ảnh đêm)
- Modify: `apps/web/src/features/troi-nam/troi-nam-hero.tsx` (thêm `<img>` tấm đêm L04/L05)
- Modify: `apps/web/src/features/troi-nam/troi-nam-world-stage.tsx` (lỗi #2, #3-hạ tầng)
- Modify: `apps/web/src/features/troi-nam/world/troi-nam-world-scene.ts` (lỗi #3, #4, #5, #6)
- Modify: `apps/web/src/styles/troi-nam-reduced-motion-guards.css` (tấm đêm phải tắt)
- Reference: `apps/web/public/images/troi-nam/manifest.json` (L04, L05 đã có sẵn)

## Implementation Steps

### 1. Lỗi #1 — sticky không bám viewport

```css
/* troi-nam.css — .tn-world-backdrop */
- overflow: hidden;
+ overflow: clip;   /* clip cắt tràn nhưng KHÔNG tạo scroll container, sticky vẫn bám viewport */
```

Kiểm chứng bắt buộc (không tin mắt thường): script đo `.tn-world-sticky.getBoundingClientRect().top`
tại 5 mốc cuộn 0 / 0.25 / 0.5 / 0.75 / 0.95. **Top phải ở khoảng 0 (±8px) ở mọi mốc sau khi
stage bắt đầu.** Số liệu trước khi sửa: +75 / −577 / −1229 / −1880 / −2402.

### 2. Lỗi #2 — reduced-motion lúc đang tải

```ts
// troi-nam-world-stage.tsx
function onReducedMotionChange() {
  if (!reducedMotionQuery?.matches) return;
  cancelled = true;          // ← thiếu dòng này: lượt khởi tạo đang chờ vẫn hoàn tất
  handle?.dispose();
  handle = null;
  markReady(false);
}
```
Đồng thời kiểm tra lại preference **ngay trước khi nhận handle**, vì `cancelled` có thể được
đặt sau khi promise đã resolve nhưng trước khi gán:
```ts
if (cancelled || reducedMotionQuery?.matches) { nextHandle.dispose(); return; }
```

### 3. Lỗi #3 (hạ tầng) — chiếu lại mục tiêu lá số khi cuộn

Nguyên nhân: `setChartTarget` chiếu rect qua camera tại thời điểm gọi, nhưng cuộn làm đổi cả
camera lẫn vị trí lá số trên màn hình. ResizeObserver không bắn khi cuộn.

Cách sửa: **đo và chiếu lại mỗi frame, sau khi camera đã cập nhật**, thay vì lưu kết quả chiếu.
- Stage đo `chartRect` (toạ độ so với canvas) và đẩy sang handle mỗi lần có `troi-nam:progress`
  (đã chạy theo rAF của progress controller nên không phát sinh vòng lặp mới).
- Factory lưu **rect**, không lưu toạ độ world; chiếu sang world **bên trong `renderFrame`,
  sau `applyPose()`**.
- `getBoundingClientRect()` mỗi frame trên 1 phần tử là chấp nhận được; nếu đo thấy tốn, cache
  theo `scrollY` + `resize`.

Phase này chỉ làm đúng hạ tầng chiếu lại; hiệu ứng sao tụ thật thuộc Phase 5.

### 4. Lỗi #4 — tier low giới hạn 30fps theo thời gian

```ts
// thay cách bỏ mỗi RAF thứ hai (phụ thuộc tần số màn hình)
const MIN_FRAME_MS = { 0: 0, 1: 1000 / 30 };
const loop = (now: number) => {
  rafId = requestAnimationFrame(loop);
  if (disposed || !active) return;
  if (now - lastRenderTime < MIN_FRAME_MS[qualityStep]) return;  // ← giới hạn theo thời gian
  lastRenderTime = now;
  renderFrame(now);
};
```
Kiểm chứng: đếm số lần render trong 2 giây ở tier low trên màn 60Hz **và** giả lập 120Hz —
cả hai phải ra ~60 lần (30fps × 2s), sai số ±10%.

### 5. Lỗi #5 — builder lỗi giữa chừng phải dọn sạch

```ts
let karst, light, water, stars;
try {
  karst = createKarstLayers(...);
  light = createDawnLight(...);
  water = createWater(...);
  stars = createStars(...);
} catch (error) {
  karst?.dispose(); light?.dispose(); water?.dispose(); stars?.dispose();
  renderer.dispose();
  onFailure();
  reject(error);
  return;
}
```

### 6. Lỗi #6 — lỗi render sau frame đầu phải lùi về ảnh tĩnh

Bọc `renderFrame` trong try/catch ở **mọi** đường gọi (vòng lặp và `resize`), không chỉ frame
đầu. Bắt được lỗi → `disposeInternal()` + `onFailure()` + không lên lịch RAF tiếp.

### 7. Thêm tấm đêm L04/L05 vào hero

`troi-nam-hero.tsx` — thêm `<img className="tn-hero-plate tn-hero-plate-night">` đọc
`troiNamAsset("L04")`, kèm `<source media={MOBILE}>` cho L05 (mobile **có** bản đêm, khác với
L03 vốn không có bản điện thoại nên mới bị giới hạn ≥880px).

`troi-nam.css`:
```css
.tn-hero-plate-night { position: absolute; inset: 0; opacity: 0; pointer-events: none; }
/* night lên khi --tn-hero-night tăng; dusk phải tắt dần để không chồng 3 tấm */
.tn-hero-plate-night { opacity: var(--tn-hero-night, 0); }
.tn-hero-plate-dusk  { opacity: calc(var(--tn-hero-dusk, 0) * (1 - var(--tn-hero-night, 0))); }
```
Trọng số này đúng công thức đặc tả: dawn `1-dusk`, dusk `dusk*(1-night)`, night `night`.

Vì L05 tồn tại, **bỏ giới hạn desktop-only cho riêng lớp đêm** (giữ giới hạn cũ cho L03).

`troi-nam-reduced-motion-guards.css`: thêm `.tn .tn-hero-plate-night { opacity: 0 !important; }`
cùng nhóm với `.tn-hero-plate-dusk`.

### 8. Ảnh OG dùng O01

`apps/web/src/app/[locale]/troi-nam/` — dùng `O01` (`anh-chia-se-troi-sao-la-so-trang-chu`)
làm ảnh chia sẻ mạng xã hội. Hiện chưa có; O01 được gen đúng cho việc này.

## Success Criteria

- [ ] `.tn-world-sticky` top ≈ 0 (±8px) tại cả 5 mốc cuộn — có bảng số đo trước/sau
- [ ] Cuộn hero → explore thấy ảnh chuyển bình minh → hoàng hôn → **trời sao**, mượt, đảo chiều đúng
- [ ] Mobile 390px cũng có tấm đêm (L05), không bị kẹt ở bình minh
- [ ] Bật reduced-motion **trong lúc** trang đang tải three.js → `data-troi-nam-world-ready` không bao giờ xuất hiện, `.tn-hero-media` opacity = 1
- [ ] Tier low render ~30fps đo được trên cả 60Hz và 120Hz giả lập
- [ ] Ném lỗi giả trong builder thứ 3 → không còn WebGL context sống, không rò RAF
- [ ] Ném lỗi giả ở frame thứ 10 → ảnh tĩnh quay lại, console sạch, không vòng lặp
- [ ] `pnpm i18n:check && pnpm lint && pnpm typecheck` sạch
- [ ] Ảnh chụp 390 + 1440 ở 4 mốc p = 0 / .375 / .625 / 1

## Risk Assessment

- **`overflow: clip` không cắt được tràn ngang như `hidden`:** `clip` vẫn cắt cả hai trục khi
  không đặt `overflow-clip-margin`. Kiểm tra không xuất hiện thanh cuộn ngang ở 320px.
- **Chồng 3 tấm ảnh lớn cùng lúc:** cả 3 đều `loading` mặc định; đặt `fetchPriority="high"` cho
  tấm bình minh, `loading="lazy"` cho tấm đêm, và kiểm tra LCP không xấu đi (so trước/sau).
- **Đo `getBoundingClientRect` mỗi frame:** chỉ 1 phần tử, trong callback rAF sẵn có; nếu
  profiler báo tốn thì cache theo `scrollY`.
