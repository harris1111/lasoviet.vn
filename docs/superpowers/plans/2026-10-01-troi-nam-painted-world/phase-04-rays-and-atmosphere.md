---
phase: 4
title: "rays-and-atmosphere"
status: pending
priority: P2
effort: "1.5d"
dependencies: [3]
---

# Phase 4: Tia nắng & khí quyển

## Overview

Thứ duy nhất trong cả kế hoạch mà **CSS không làm được**: tia nắng bị chính dãy núi che, đổi
hình khi camera dịch. Đây là lý do đáng giá nhất để có WebGL. Cộng thêm sương, vụn vàng rơi,
hoa đăng đêm — tất cả từ ảnh đã gen.

Áp dụng `3d-sky-rays`, `3d-falling-leaves`, `3d-retina-resolution`.

## Requirements

**Functional**
- Tia nắng phát ra từ đúng vị trí mặt trời của tấm trời đang hiển thị (một hướng duy nhất dùng
  chung cho trời, tia, và tint lớp).
- Mép núi và tán lá **cắt** tia nắng thành các chùm — nhìn rõ, không phải vệt sáng phủ đều.
- Tia tắt dần qua hoàng hôn, tắt hẳn ở đêm.
- Ban đêm: hoa đăng (E02) trôi trên nước, vụn vàng (T03) bay ở đoạn chuyển.

**Non-functional**
- Ray pass ở nửa độ phân giải, 24–32 mẫu. Tier low: tắt hẳn.
- Chi phí tăng thêm của ray pass ≤ 4ms/frame trên desktop, đo được (bật/tắt để so).

## Ảnh đã có (xác nhận 2026-10-01)

| Ảnh | Đo được | Dùng cho |
|---|---|---|
| W10 | 1024×1024, alpha thật, **đối xứng xuyên tâm tuyệt đối** (sai lệch RGBA khi xoay 90° = 0), alpha=0 toàn mép | Đĩa mặt trời + quầng; **tâm sprite = nguồn tia**, dùng chung một hướng với trời |
| W04/W05/W06 | alpha thật, min=0 max=255 | **Mặt nạ che** — mép lá/đá giữ đúng vì là alpha-test, không thành hình chữ nhật |
| W08 | alpha thật, mép trên + trái | Vừa là mặt nạ, vừa là bề mặt đục cần **giảm mạnh overlay** để đá/lá giữ tương phản |
| T11 | có sẵn từ kho cũ, 3 dải sương rời có alpha | Sương xen giữa các lớp |
| T03 | có sẵn, vụn vàng lá có alpha | Hạt vàng rơi |
| E02 | có sẵn, 4 hoa đăng có alpha | Hoa đăng đêm |

Không cần gen thêm gì cho Phase 4.

## Architecture

### God-ray (theo `3d-sky-rays`)

Điểm mấu chốt: **mặt nạ trời**. Ta có lợi thế hiếm — các lớp núi đã là PNG alpha, nên mặt nạ
gần như cho không:

1. Render một pass riêng chỉ có các lớp núi/tiền cảnh, material trắng đặc trên nền đen →
   ra `skyMask` (trắng = trời hở, đen = bị núi che). Vì lớp là alpha-test, mép lá được giữ
   đúng, không biến thành hình chữ nhật đặc.
2. Chiếu vị trí mặt trời (từ chapter ledger) ra NDC → UV. **Loại bỏ khi mặt trời ở sau camera**
   trước khi dùng toạ độ chiếu.
3. March từ mỗi pixel về phía UV mặt trời, cộng dồn `skyMask × độ sáng` có suy giảm, chia cho
   tổng trọng số (để đổi số mẫu không đổi độ sáng).
4. Cộng **additive vào màu tuyến tính trước** bước tone-map/output cuối.
5. Trên bề mặt tiền cảnh đục (W06, W08) giảm mạnh overlay để đá và lá giữ được tương phản.

Ngưỡng bắt đầu: 28 mẫu, buffer 0.5×, decay 0.95, cường độ thấp rồi tăng dần. **Trắng xoá
nghĩa là mặt nạ sai hoặc cường độ quá tay, không phải thiếu bloom.**

### Sương (T11 — đã có, alpha thật, 3 dải rời)

Cắt 3 dải của T11 thành 3 plane riêng đặt ở z = −18, −9, −3. Trôi ngang rất chậm (≥40s/vòng),
ngược chiều nhau một chút để sinh cảm giác khối. Độ mờ theo `mist` trong ledger.

### Vụn vàng rơi (T03 — theo `3d-falling-leaves`)

Bật ở đoạn p 0.45–0.75 (lúc chuyển hoàng hôn → đêm). Instanced plane, 40 hạt (high) / 15
(low), rơi + xoay chậm, seed cố định để cuộn lui/tới ra đúng cảnh cũ. Không dùng particle
system ngẫu nhiên theo thời gian thực — vi phạm yêu cầu tái lập được.

### Hoa đăng đêm (E02 — đã có 4 màu alpha)

p ≥ 0.72, 5–8 chiếc trôi chậm trên mặt nước, mỗi chiếc có quầng sáng nhỏ (dùng lại W10 thu
nhỏ, opacity thấp). Đây là cầu nối cảm xúc sang phần "hoa đăng Hội An" (L06/L07) đang dùng ở
section dưới — tạo mạch liên tục cho cả trang.

### Retina (theo `3d-retina-resolution`)

- `renderer.setPixelRatio(min(devicePixelRatio, 1.5))` cho high, `1.0` cho low (đã có).
- **Ray buffer phải resize theo drawing buffer thật**, không theo CSS size — đây là lỗi kinh
  điển khi thêm post-processing vào scene đã có DPR.
- Uniform độ phân giải của shader phải khớp đúng texture đang lấy mẫu (buffer nửa cỡ), không
  phải kích thước canvas.

## Related Code Files

- Create: `apps/web/src/features/troi-nam/world/troi-nam-world-rays.ts` (mask pass + ray pass + composite)
- Create: `apps/web/src/features/troi-nam/world/troi-nam-world-particles.ts` (vụn vàng + hoa đăng, instanced, seeded)
- Modify: `apps/web/src/features/troi-nam/world/troi-nam-world-layers.ts` (thêm sương T11)
- Modify: `apps/web/src/features/troi-nam/world/troi-nam-world-scene.ts` (thứ tự pass, resize ray buffer, tắt ở tier low)

## Implementation Steps

1. Gọi skill `3d-sky-rays` đọc đầy đủ trước khi viết shader (kế hoạch này chỉ tóm tắt).
2. Dựng mask pass trước, **render mask ra màn hình để mắt kiểm tra** — mép lá phải đúng, không
   bị vuông.
3. Thêm ray pass, bắt đầu ở cường độ rất thấp, tăng dần tới khi vừa mắt.
4. Kiểm tra quay camera ra xa mặt trời → tia biến mất êm, không nháy, không có nguồn sáng ảo.
5. Thêm sương, vụn vàng, hoa đăng.
6. Gọi skill `3d-retina-resolution`, kiểm tra kích thước buffer thật ở DPR 1 và 2.
7. Đo chi phí: bật/tắt ray pass, ghi lại ms/frame.

## Success Criteria

- [ ] Ảnh chụp cho thấy **chùm tia bị núi cắt rõ ràng**, không phải vệt sáng phủ đều
- [ ] Tia tắt hẳn khi p ≥ 0.6, không sót vệt sáng lúc đêm
- [ ] Không trắng xoá ở bất kỳ mốc p nào, ở cả 390 và 1440
- [ ] Tier low: ray pass tắt, cảnh vẫn đẹp (kiểm bằng ảnh chụp)
- [ ] Bảng đo ms/frame có/không ray pass, desktop + giả lập mobile
- [ ] Vụn vàng & hoa đăng tái lập đúng khi cuộn lui rồi tới lại cùng vị trí
- [ ] DPR 1 và 2 đều sắc nét, ray buffer đúng cỡ (in ra để đối chiếu)

## Risk Assessment

- **Ray pass đắt trên mobile:** đã có cơ chế suy giảm 3 bậc từ Phase 1; ray là thứ tắt đầu tiên.
- **Mask sai → tia xuyên qua núi:** kiểm bằng cách render riêng mask ra màn hình, không đoán.
- **Chồng nhiều lớp alpha + additive → overdraw:** giới hạn tối đa 3 lớp full-screen blend
  cùng lúc (ngân sách của `build-threejs-scroll-worlds`).
