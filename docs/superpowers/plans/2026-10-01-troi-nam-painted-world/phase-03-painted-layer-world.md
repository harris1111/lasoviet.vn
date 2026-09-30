---
phase: 3
title: "painted-layer-world"
status: pending
priority: P1
effort: "2d"
dependencies: [1, 2]
---

# Phase 3: Thế giới lớp tranh

## Overview

Thay toàn bộ hình học vector bằng **các mặt phẳng dán tranh** đặt ở độ sâu khác nhau. Camera
đi qua chúng sinh parallax thật. Trời là ảnh pha trộn theo tiến độ cuộn. Không còn pixel nào
do code tô màu.

Áp dụng `3d-sky-background` (trời bằng ảnh, trọng số liên tục, màu đúng chuẩn, có dự phòng)
và `3d-high-resolution-textures` (mật độ texel, mipmap, anisotropy, tải tăng dần, ngân sách
GPU).

## Requirements

**Functional**
- Bố cục p=0 phải **ngang ngửa hoặc hơn** ảnh L01 khi đặt cạnh nhau. Nếu không đạt → dừng, giữ Phase 1.
- Cuộn sinh parallax: lớp gần dịch nhiều hơn lớp xa, rõ mắt nhưng không chóng mặt.
- Trời chuyển bình minh → hoàng hôn → đêm liên tục, không nháy, không lộ đường cắt.
- Ảnh chưa tải xong → vẫn có nền dùng được, không phải khung đen.

**Non-functional**
- Tổng texture tải ở màn hình đầu ≤ 2.5 MB; toàn cảnh ≤ 6 MB.
- Draw call ≤ 40; triangle ≤ 20k (lớp phẳng nên rất rẻ).
- Bộ nhớ GPU ước tính ≤ 120 MB (tính cả mip chain).

## Architecture

### Sơ đồ lớp (z trong world, camera ở z ≈ +6)

| z | Lớp | Nguồn | Parallax |
|---|---|---|---|
| −60 | Trời (3 tấm chồng, pha theo trọng số) | W01/W02/W03 | 0 (khoá theo camera) |
| −34 | Đĩa mặt trời + quầng | W10 | rất nhỏ |
| −28 | Núi lớp xa | W04 | 0.15 |
| −18 | Sương dải 1 | T11 (đã có) | 0.3 |
| −14 | Núi lớp giữa | W05 | 0.35 |
| −9 | Sương dải 2 | T11 | 0.5 |
| −7 | Thuỷ đình + thuyền nan | W09 | 0.6 |
| −5 | Núi lớp gần | W06 | 0.75 |
| −1 | Mặt nước | W07 | 1.0 |
| +3 | Khung tiền cảnh | W08 | 1.6 (gần camera nhất) |

Parallax **không** tự code bằng tay — nó là hệ quả của phối cảnh thật: đặt đúng z rồi cho
camera dịch là ra. Chỉ nhân thêm hệ số khi cần cường điệu.

### Trời (theo `3d-sky-background`)

- Ba `PlaneGeometry` phẳng lớn, khoá vị trí theo camera (`sky.position.copy(camera.position)`
  mỗi frame, chỉ dịch z) để trời không bao giờ trôi khỏi khung.
- `material.opacity` = đúng công thức đặc tả: dawn `1-dusk`, dusk `dusk*(1-night)`, night `night`.
- **Màu:** texture ảnh màu → `texture.colorSpace = THREE.SRGBColorSpace`. Tính toán giữ tuyến
  tính, đổi màu đầu ra **một lần** ở cuối. Đây là lỗi thầm lặng hay gặp nhất khi dùng ảnh.
- **Dự phòng:** vẽ ngay một gradient CanvasTexture rẻ tiền (cùng 4 nấc màu với W01) rồi mới
  nạp ảnh thật và pha vào. Ảnh lỗi → vẫn còn trời dùng được, không bao giờ để khung trống.

### Lớp núi/vật thể (theo `3d-high-resolution-textures`)

- `MeshBasicMaterial({ map, transparent: true, depthWrite: false })` — lớp tranh không cần
  chiếu sáng PBR, ánh sáng đã vẽ sẵn trong tranh.
- `map.colorSpace = SRGBColorSpace`; `generateMipmaps = true`; `minFilter = LinearMipmapLinearFilter`.
- `anisotropy = min(4, renderer.capabilities.getMaxAnisotropy())` — chỉ cho lớp nước (góc tà),
  các lớp khác nhìn vuông góc không cần.
- **Mật độ texel:** lớp gần (W06, W08) chiếm nhiều pixel màn hình nhất → giữ 2560px; lớp xa
  (W04) chỉ cần 1440px. Không rải 2560 cho tất cả.
- **Viền alpha:** loang màu mép vào vùng trong suốt trước khi nén (pipeline làm ở khâu build),
  nếu không mip sẽ sinh viền tối quanh lá cây.
- **Tải tăng dần:** nạp theo thứ tự trời → núi xa → núi giữa → núi gần → nước → tiền cảnh →
  sương/vật thể. Chỉ `resolve()` handle sau khi nhóm bắt buộc (trời + 3 lớp núi + nước) xong.

### Chapter ledger (theo `build-threejs-scroll-worlds`)

Lưu thành **dữ liệu**, không rải ngưỡng khắp render loop:

```ts
const chapters = [
  { id: "binh-minh", p: 0.00, camera: { pos: [0, 1.4, 6], look: [0, 0.4, -6], fov: 40 },
    sky: { dawn: 1, dusk: 0, night: 0 }, rays: 1.0, mist: 1.0 },
  { id: "hoang-hon", p: 0.50, camera: { pos: [0, 1.8, 6.5], look: [0, 2.6, -9], fov: 42 },
    sky: { dawn: 0, dusk: 1, night: 0 }, rays: 0.15, mist: 0.9 },
  { id: "dem-sao",  p: 0.75, camera: { pos: [0, 2.2, 7], look: [0, 6.5, -16], fov: 46 },
    sky: { dawn: 0, dusk: 0, night: 1 }, rays: 0, mist: 0.5 },
  { id: "la-so",    p: 1.00, camera: { pos: [0, 3.0, 5], look: [0, 3.2, -3], fov: 40 },
    sky: { dawn: 0, dusk: 0, night: 1 }, rays: 0, mist: 0.3 },
];
```
Có bản `mobile` đè riêng cho `pos`/`fov` (màn dọc hẹp cần lùi xa + mở góc — đã làm ở
`applyResponsiveFraming`, giữ nguyên cách tính đó).

## Related Code Files

- Create: `apps/web/src/features/troi-nam/world/troi-nam-world-layers.ts` (lớp tranh + parallax)
- Create: `apps/web/src/features/troi-nam/world/troi-nam-world-textures.ts` (nạp, colorSpace, mipmap, anisotropy, tải tăng dần, dispose)
- Create: `apps/web/src/features/troi-nam/world/troi-nam-world-chapters.ts` (ledger)
- Modify: `apps/web/src/features/troi-nam/world/troi-nam-world-scene.ts` (dùng layers thay terrain/light/water)
- Modify: `apps/web/src/features/troi-nam/world/troi-nam-world-light.ts` (bỏ gradient vẽ tay, chuyển sang ảnh trời + giữ dự phòng)
- Delete: `apps/web/src/features/troi-nam/world/troi-nam-world-terrain.ts` (hình học vector — thứ founder bác)
- Modify: `apps/web/src/features/troi-nam/world/troi-nam-world-water.ts` (dán W07 thay vì màu phẳng; giữ gợn sóng shader nhẹ)
- Modify: `prototype/revamp-2026-09/troi-nam-world/` (harness kiểm tra trước khi lên trang thật)

## Implementation Steps

1. **Trước khi code:** gọi skill `3d-sky-background` và `3d-high-resolution-textures` để lấy
   hướng dẫn đầy đủ (kế hoạch này chỉ tóm tắt).
2. Viết `troi-nam-world-textures.ts`: hàm nạp texture có `colorSpace`, mipmap, anisotropy,
   hàng đợi ưu tiên, và `disposeAll()`.
3. Viết `troi-nam-world-layers.ts`: dựng 10 lớp theo bảng z ở trên từ manifest, mỗi lớp là một
   plane đúng tỉ lệ ảnh, có `setPhase(weights)` để đổi opacity/tint.
4. Chuyển trời sang 3 tấm ảnh + gradient dự phòng.
5. Chuyển nước sang W07 + giữ gợn sóng vertex nhẹ (đã có, chỉ đổi màu nền thành texture).
6. Xoá `troi-nam-world-terrain.ts` và mọi tham chiếu.
7. Nối ledger chapter vào `applyPose`.
8. **Chụp ảnh p=0 đặt cạnh L01 để so.** Đây là cổng quyết định — không đạt thì dừng.
9. Chạy trong harness prototype trước, rồi mới bật trên `/troi-nam`.

## Success Criteria

- [ ] Ảnh so sánh cạnh nhau: world p=0 vs ảnh L01 — world **không thua** về độ sang
- [ ] Cuộn thấy chiều sâu rõ (lớp gần trượt nhanh hơn lớp xa), không giật, đảo chiều đúng
- [ ] Bắt mạng chậm 3G: có trời dự phòng ngay, ảnh vào dần, không khung đen
- [ ] Chặn 1 file texture → world vẫn chạy, không vỡ
- [ ] `renderer.info`: draw call ≤ 40, triangle ≤ 20k
- [ ] Không còn file/hàm nào sinh hình học trang trí bằng code
- [ ] Ảnh chụp 4 mốc p ở 390 và 1440

## Risk Assessment

- **"Sân khấu giấy bồi":** lớp phẳng lộ ra khi camera dịch ngang nhiều. Giảm thiểu: biên độ
  camera nhỏ (≤1.5 đơn vị ngang), luôn có sương xen giữa hai lớp kề nhau, lớp gần luôn tối hơn.
- **Sai không gian màu:** ảnh bị bợt hoặc quá tương phản. Kiểm bằng cách chụp texture gốc và
  khung render cạnh nhau, so histogram.
- **Bộ nhớ GPU:** 2560×1440 RGBA + mip ≈ 19 MB/lớp. 10 lớp ≈ 190 MB → **vượt ngân sách**. Bắt
  buộc hạ cỡ theo bảng mật độ texel (lớp xa 1440, sương/vật thể 1024) và cân nhắc KTX2.
