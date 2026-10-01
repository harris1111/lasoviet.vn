---
phase: 5
title: chart-handoff-and-qa
status: completed
priority: P2
effort: 1.5d
dependencies:
  - 4
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

> **Sửa 2026-10-01 (nghiệm thu ChatGPT):**
> - Vòng P05 phải **giữ đúng tỉ lệ gốc của tranh**, khớp tâm và khung dự định với `.hv3-chart`
>   theo một "chính sách fit" ghi rõ (contain hay cover), **không** kéo méo hình tròn thành hình
>   chữ nhật để "cho khớp khung" — nếu khung không vuông, chừa viền chứ không méo.
> - Phải **gỡ hoặc ẩn vòng CSS thủ công cũ** (nếu còn) đúng lúc P05 hiện ra — hai vòng chồng
>   nhau cùng lúc là lỗi, không phải hiệu ứng.
> - 12 icon cung (I01) phải khớp **đúng theo ngữ nghĩa cung số** (thứ tự 12 cung thật), không
>   giả định khớp theo thứ tự file trong sheet ảnh hay thứ tự DOM hiện có — kiểm tra từng icon
>   đúng tên cung trước khi coi là xong.
> - Chiếu lại `aTarget`/vòng P05 phải làm **sau khi world matrix của camera đã cập nhật** cho tư
>   thế mới của frame đó — xác minh lại thứ tự này khi viết code, không chỉ dựa vào ghi chú cũ
>   rằng "camera đã ổn định".

### Sao tụ về vòng (thay logic cũ)

Giữ nguyên buffer sao seeded + morph trên GPU (kiến trúc này đúng, chỉ phần hiển thị sai):
- `aStart` = vị trí rải trong vòm sao (như cũ).
- `aTarget` = 12 điểm trên **vòng tròn P05 đã chiếu ra world**, phân bố đều 30° — khớp với 12
  vạch chia của chính tấm tranh P05.
- Hạt dùng texture W11 thay vì chấm vẽ bằng shader. **Đã giao 2026-10-01:** ChatGPT tách sẵn
  thành 6 file riêng `hat-sao-{1..6}` (512×512, alpha thật, mỗi hạt scale về 480px + 16px đệm
  trong suốt). Giao ở 256×256 là đủ — hạt chỉ chiếm vài pixel trên màn hình. Gán biến thể theo
  `index % 6` để giữ tính tái lập.
- Vòng P05: một plane alpha, opacity theo `chart` weight, xoay rất chậm (≤2°/s).

### Bám đúng lá số

Dùng hạ tầng Phase 1: stage đo `.tn-explore .hv3-chart` mỗi lần có `troi-nam:progress`, factory
chiếu lại **sau** khi camera cập nhật, trong `renderFrame`. Vòng P05 và 12 điểm đích lấy từ
cùng một phép chiếu → luôn khớp dù cuộn hay resize.

**Nợ kỹ thuật cần trả ở phase này:** bản Phase 1 chiếu lại **mỗi frame vô điều kiện**, nghĩa là
mỗi frame đều cấp phát một `Float32Array(36)` mới, ghi lại toàn bộ 1200×3 giá trị `aTarget` rồi
đẩy cả buffer lên GPU (~14 KB/frame, ~860 KB/s ở 60fps). Đúng về mặt kết quả nhưng trái với yêu
cầu "không cấp phát mỗi frame" của hợp đồng hiệu ứng. Khi viết lại phần sao ở phase này, thêm
cổng chặn: chỉ chiếu lại khi `progress`, `aspect`, `chartRect` **hoặc** kích thước canvas đổi,
và bỏ qua hoàn toàn khi `chart` weight = 0 (p < 0.75) vì lúc đó sao chưa morph về đích.

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

> **Sửa 2026-10-01:** bảng phân bổ ảnh bắt buộc ở `plan.md` §4.2 ghi T10 cho About nhưng wrapper
> hiện tại đang dùng T04; L13 được gán cho beat "mở khoá" nhưng chưa thấy tham chiếu ở đâu. Đóng
> hai chỗ lệch này (đổi đúng ảnh hoặc cập nhật lại bảng phân bổ) trước khi báo "không còn ảnh bắt
> buộc nào nằm không dùng" — tiêu chí §4.2 chưa đạt nếu còn lệch.

> **Sửa 2026-10-01:** Phase 5 mới này hoàn tất riêng phần P05/W11/I01 + QA hình ảnh — **không
> thay thế** các cổng phát hành cũ ở `docs/superpowers/plans/2026-09-30-troi-nam-plan-5-readiness.md`
> (kiểm bàn phím/form/dialog, khớp VI/EN, theme/zoom, LCP/CLS, build production, chuyển
> root/canonical/robots/sitemap, rollback, smoke test triển khai). Giữ nguyên các cổng đó, không
> coi Phase 5 ở đây là đủ để phát hành.

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

## Kết quả thật (2026-10-01)

Triển khai bởi ChatGPT, nghiệm thu và vá lỗi bởi Claude trước khi nhập kho. P01 (trống đồng)
được bỏ qua như phương án dự phòng trong plan (chỉ dùng P05) — tránh "quá nhiều thứ" ở cao trào.

**Đã xác minh (Playwright, desktop 1440 + mobile 390):** sao hội tụ đúng vào vòng P05; vòng bám
đúng khung `.tn-explore .hv3-chart` thật khi cuộn (chiếu lại mỗi frame chỉ khi progress/aspect/
chartRect đổi — nợ kỹ thuật từ Phase 1 đã được trả ở đây); canvas mờ dần đúng lúc khung lá số
tới giữa màn hình, bảng lá số DOM bấm được ngay; 12 icon cung hiện đúng cung (đối chiếu
`palaceOnBranch` — thứ tự cung thật, không theo thứ tự file); bấm cung hoạt động bình thường;
không lỗi console/shader qua suốt vòng cuộn lui/tới; rút gọn chuyển động (`prefers-reduced-
motion`) vẫn chặn WebGL hoàn toàn, không khởi tạo.

**Chưa xác minh (cần máy thật, giữ nguyên yêu cầu cũ ở bảng nghiệm thu toàn diện phía trên):**
p95 frame time desktop/mobile, CLS/LCP trước-sau, chuyển tab thật (chỉ giả lập được sự kiện
visibility, chưa phải chuyển tab thật), độ phủ thiết bị/trình duyệt thực tế. Môi trường này chỉ
có SwiftShader — số đo ms/frame ở đây không dùng để kết luận, theo đúng ghi chú đã có.
