---
phase: 5
title: "chart-handoff-and-qa"
status: pending
priority: P2
effort: "1.5d"
dependencies: [4]
---

# Phase 5: Bàn giao lá số + nghiệm thu

## Overview

Khoảnh khắc kết: sao trời tụ lại thành **vòng vàng 12 phần (P05 — tranh có sẵn)**, vòng này
trôi về đúng khung lá số thật của section Explore rồi mờ đi, nhường chỗ cho biểu đồ DOM tương
tác. Cộng nghiệm thu toàn diện và dùng nốt các ảnh còn lại.

Thay cho 12 cụm chấm sáng vẽ bằng code ở bản cũ — đúng nguyên tắc "không pixel nào do code tô".

## Requirements

**Functional**
- p 0.75→1: hạt sao (W11) di chuyển về 12 vị trí trên vòng P05; vòng P05 hiện dần.
- Vòng P05 khớp **đúng khung `.tn-explore .hv3-chart` đang ở trên màn hình** (nhờ hạ tầng
  chiếu lại mỗi frame làm ở Phase 1).
- p → 1: canvas mờ đi, biểu đồ DOM thật là thứ duy nhất còn lại, bấm được bình thường.
- 12 icon cung (I01) hiện trong 12 ô của biểu đồ.

**Non-functional**
- Không tạo dữ liệu lá số giả, không gắn nhãn cung lên hiệu ứng — chỉ trang trí.
- Biểu đồ DOM không bị canvas che hay chặn thao tác ở bất kỳ mốc nào.

## Architecture

### Sao tụ về vòng (thay logic cũ)

Giữ nguyên buffer sao seeded + morph trên GPU (kiến trúc này đúng, chỉ phần hiển thị sai):
- `aStart` = vị trí rải trong vòm sao (như cũ).
- `aTarget` = 12 điểm trên **vòng tròn P05 đã chiếu ra world**, phân bố đều 30° — khớp với 12
  vạch chia của chính tấm tranh P05.
- Hạt dùng texture W11 (6 biến thể) thay vì chấm vẽ bằng shader.
- Vòng P05: một plane alpha, opacity theo `chart` weight, xoay rất chậm (≤2°/s).

### Bám đúng lá số

Dùng hạ tầng Phase 1: stage đo `.tn-explore .hv3-chart` mỗi lần có `troi-nam:progress`, factory
chiếu lại **sau** khi camera cập nhật, trong `renderFrame`. Vòng P05 và 12 điểm đích lấy từ
cùng một phép chiếu → luôn khớp dù cuộn hay resize.

Khi `chart` weight ≥ 0.9: giảm opacity toàn canvas về 0 trong ~400ms, để biểu đồ thật đứng một
mình. Canvas luôn `pointer-events: none` nên không bao giờ chặn bấm.

### Dùng nốt ảnh còn lại

| Ảnh | Việc | Ghi chú |
|---|---|---|
| I01 (12 icon) | Đưa vào 12 ô `.hv3-cell` | Ô hiện chỉ có chữ; icon là thứ được gen sẵn đúng cho việc này. **Cẩn thận: `.hv3-cell` thuộc `homepage-v3` dùng chung** → chỉ thêm qua CSS phạm vi `.tn` hoặc prop tuỳ chọn, không sửa component chung |
| P01 | Vòng ngoài trống đồng bao quanh P05 lúc cao trào | Tuỳ chọn |
| L08, L09–L12, S05 | Nền các beat phía dưới (vận hạn, bốn mùa, tài lộc) | Tuỳ chọn, ngoài phạm vi world |
| T02/T05/T06/T09 | Chất liệu bề mặt thẻ/panel | Tuỳ chọn |
| P03, P04 | Đường phân cách section | Tuỳ chọn |

## Related Code Files

- Modify: `apps/web/src/features/troi-nam/world/troi-nam-world-stars.ts` (texture hạt W11, đích theo vòng)
- Create: `apps/web/src/features/troi-nam/world/troi-nam-world-ring.ts` (vòng P05)
- Modify: `apps/web/src/features/troi-nam/world/troi-nam-world-scene.ts` (mờ canvas ở cuối)
- Modify: `apps/web/src/styles/troi-nam.css` (icon 12 cung phạm vi `.tn`)
- Modify: `apps/web/src/features/troi-nam/troi-nam-explore.tsx` (truyền icon, không sửa component chung)

## Implementation Steps

1. Đổi `aTarget` sang 12 điểm trên vòng chiếu từ rect thật; bỏ lưới 4×4-trừ-giữa cũ.
2. Thêm plane P05, opacity theo `chart`.
3. Đổi hạt sao sang texture W11.
4. Canvas mờ dần khi `chart` ≥ 0.9.
5. Thêm icon I01 vào 12 ô, **kiểm tra trang chủ `/` không đổi** (component dùng chung).
6. Chạy full QA matrix bên dưới.

## Nghiệm thu toàn diện (bắt buộc trước khi báo xong)

| Hạng mục | Cách kiểm | Đạt khi |
|---|---|---|
| Bề rộng | 320 / 390 / 768 / 880 / 1024 / 1440 | Không tràn ngang, chữ đọc được, bố cục world không cắt cụt |
| Ngôn ngữ | VI + EN | Không vỡ layout |
| Reduced motion | Bật trước khi tải **và** bật giữa chừng khi đang tải | Không khởi tạo 3D, ảnh tĩnh nguyên vẹn |
| Không WebGL | Chặn context | Ảnh tĩnh, không lỗi console |
| Mất context GPU | `WEBGL_lose_context.loseContext()` | Lùi ảnh tĩnh, trang không treo |
| Cuộn | Chậm / nhanh / lui / kéo thanh cuộn / anchor / tải lại giữa chừng | Cùng vị trí cuộn luôn ra cùng khung hình |
| Ẩn tab | Chuyển tab rồi quay lại | Dừng render, quay lại không nhảy khung |
| Tương tác | Điền form, bấm 12 ô lá số, mở dialog testimonial | Không bị canvas chặn, focus đúng |
| Hiệu năng | Thiết bị thật (ghi rõ tên máy + trình duyệt) | p95 frame time desktop ≤25ms, mobile ≤40ms |
| LCP/CLS | So trước/sau trên hồ sơ mobile | CLS ≤0.1, LCP không xấu đi |
| Rò rỉ | Điều hướng ra/vào 10 lần | Số WebGL context không tăng, không RAF sống sót |

**Bảng hiệu năng phải đo trên máy thật.** Môi trường container của Claude chạy phần mềm giả
lập GPU (SwiftShader), số đo ở đó **không dùng để kết luận**. Đây là việc founder/An chạy.

## Success Criteria

- [ ] Sao tụ về đúng vòng P05, vòng khớp khung lá số thật ở mọi cỡ màn hình
- [ ] Biểu đồ DOM tương tác bình thường ở p = 1
- [ ] 12 icon cung hiện đúng, trang chủ `/` không đổi một pixel
- [ ] Full QA matrix ở trên xanh hết
- [ ] Bảng hiệu năng máy thật có tên thiết bị/trình duyệt
- [ ] Không còn ảnh nào trong nhóm bắt buộc nằm không (đối chiếu bảng §4.2 của plan.md)

## Risk Assessment

- **Đụng component dùng chung khi thêm icon:** `.hv3-cell` nằm trong `homepage-v3`. Chỉ thêm
  qua CSS phạm vi `.tn` hoặc prop có giá trị mặc định; chụp ảnh `/` trước/sau để chứng minh
  không đổi.
- **Vòng P05 lệch khung lá số trên mobile:** rect nhỏ, sai số chiếu lớn hơn. Kiểm riêng ở 390.
- **Cao trào "quá nhiều thứ":** sao + vòng + trống đồng + sương cùng lúc dễ rối. Nếu rối, bỏ
  P01, giữ P05.
