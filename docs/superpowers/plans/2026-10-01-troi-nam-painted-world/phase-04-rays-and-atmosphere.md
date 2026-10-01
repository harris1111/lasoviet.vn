---
phase: 4
title: rays-and-atmosphere
status: completed
priority: P2
effort: 1.5d
dependencies:
  - 3
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

> **Sửa 2026-10-01:** bảng phân bổ ảnh ở `plan.md` §4.2 có gán T07 (mây khảm xà cừ) cho Phase 4,
> nhưng các bước triển khai bên dưới chưa có việc nào dùng T07. Chốt: **hoãn T07 sang một bước
> sau nếu có nhu cầu**, không âm thầm bỏ — nếu không dùng, cập nhật lại bảng phân bổ ở plan.md
> cho khớp để không còn ảnh "được giao nhưng không gắn vào đâu".

> **Sửa 2026-10-01 (mục P2 nghiệm thu):** `loadWorldTexture` hiện gọi
> `TextureLoader.load(url)` không có callback thành công/lỗi — factory resolve xong một khung
> hình đồng bộ trong khi texture có thể vẫn trống. Trước khi thêm hiệu ứng phụ thuộc vào toàn bộ
> canvas hiển thị đúng (ví dụ ray pass dùng mặt nạ từ các lớp núi), phải quyết định rõ: texture
> chưa tải xong thì mặt nạ tính sao (coi là "hở" tạm thời, hay trì hoãn bật ray pass tới khi tải
> xong)? Việc này phải kiểm bằng request thật bị làm chậm (slow-3G) hoặc bị chặn, không suy
> đoán — xem thêm nợ kỹ thuật đã ghi ở phase-03.

## Architecture

### God-ray (theo `3d-sky-rays`)

> **Sửa 2026-10-01 (nghiệm thu ChatGPT, mục P1):** bản trước mô tả quy ước mặt nạ mâu thuẫn
> với chính nó (yêu cầu núi trắng-trên-đen ở bước 1, rồi định nghĩa kết quả là "trời hở = trắng,
> núi che = đen" — hai quy ước ngược nhau). Chốt lại **một quy ước duy nhất, đặt tên rõ**, và
> debug-view mặt nạ trước khi viết ray march, không đoán.

Điểm mấu chốt: **mặt nạ `skyVisibility`**. Ta có lợi thế hiếm — các lớp núi đã là PNG alpha, nên
mặt nạ gần như cho không:

1. Định nghĩa `skyVisibility`: **1.0 = trời hở (không bị che), 0.0 = bị núi/tán lá che**.
2. Render một pass riêng: xoá nền **trắng** (`skyVisibility = 1` mặc định), rồi vẽ **chỉ các
   lớp núi/tiền cảnh đục** (W04, W05, W06, W08 — không phải T11 sương, không phải W10 mặt trời,
   không phải hoa đăng/vụn vàng, những thứ này không che trời) bằng material **đen đặc**, dùng
   alpha-test từ chính texture của chúng (giữ đúng mép lá/đá, không thành hình chữ nhật) và tôn
   trọng UV đã lật của W08. Kết quả: trắng = hở, đen = che — khớp định nghĩa ở bước 1.
3. Chiếu vị trí mặt trời (từ **chapter ledger** — cùng một nguồn ánh sáng dùng chung cho sprite
   mặt trời W10, hướng tia, tint cảnh, và hướng phản chiếu trên nước; vị trí hardcode hiện tại
   của W10 **chưa** phải bộ điều phối ánh sáng duy nhất này, phải nâng lên ledger trước khi
   Phase 4 bắt đầu) ra NDC → UV. **Loại bỏ khi mặt trời ở sau camera** trước khi dùng toạ độ
   chiếu.
4. March từ mỗi pixel về phía UV mặt trời, cộng dồn `skyVisibility × độ sáng` có suy giảm, chia
   cho tổng trọng số (để đổi số mẫu không đổi độ sáng).
5. Render vào **một target màu tuyến tính trung gian** (không phải mặt sau cùng), cộng
   **additive**, rồi áp dụng colorspace/tone-map **một lần duy nhất** ở bước output cuối cùng —
   không chuyển đổi màu nhiều lần qua các pass.
6. Trên bề mặt tiền cảnh đục (W06, W08) giảm mạnh overlay để đá và lá giữ được tương phản.

Ngưỡng bắt đầu: 28 mẫu, buffer 0.5× **kích thước drawing-buffer thật** (không phải CSS size —
xem mục Retina bên dưới), decay 0.95, cường độ thấp rồi tăng dần. **Trắng xoá nghĩa là mặt nạ
sai hoặc cường độ quá tay, không phải thiếu bloom.**

**Thứ tự triển khai bắt buộc (nghiệm thu ChatGPT):** render mặt nạ ra màn hình để mắt kiểm tra
trước → ray pass cường độ thấp → kiểm tắt êm khi mặt trời sau camera → chụp ảnh cuộn thật trên
trang (không chỉ canvas cô lập) → đo chi phí. Số đo trên renderer phần mềm (SwiftShader, môi
trường Claude) là **chẩn đoán, không phải nghiệm thu thiết bị thật**.

**Bậc chất lượng dùng chung:** ray pass, hạt (vụn vàng/hoa đăng), và sương phải đọc **cùng một
trạng thái bậc chất lượng đã chốt** (xem `qualityStep` ở Phase 1/`troi-nam-world-scene.ts`) —
hạ DPR/FPS không tự động tắt ray pass hay giảm chi tiết particle. Tier thấp và tier đã suy
giảm (degraded-high) đều phải tắt hẳn ray pass, không chỉ giảm mẫu.

**Nơi tia thật sự hiển thị trên trang thật:** CSS hiện tại cố ý giữ ảnh hero và các mặt
story/ticker/explore đục, world chỉ lộ qua khe hở giữa các section (quyết định thiết kế đã có,
không phải lỗi). Vì vậy việc "tia bị núi cắt" phải được xác nhận bằng ảnh chụp cuộn thật trên
trang (`/vi/troi-nam`), không chỉ ảnh canvas cô lập — canvas cô lập không chứng minh được trải
nghiệm cuộn thật.

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

## Kết quả thật (2026-10-01)

Triển khai bởi ChatGPT, nghiệm thu và vá lỗi bởi Claude trước khi nhập kho (xem
`troi-nam-world-rays.ts`, `troi-nam-world-particles.ts`). Mặt nạ dùng đúng một quy ước
`skyVisibility` (trắng=hở, đen=che), có debug mode (`?troiNamWorldDebug=1`) để xem mặt nạ riêng.

**Lỗi tìm thấy khi nghiệm thu, đã vá trước khi nhập kho:**
- Mặt nước không nằm trong danh sách vật che → tia phủ sáng đều cả mặt hồ thay vì bị núi cắt.
  Đã thêm mặt nước vào danh sách che (không cắt theo alpha, che toàn bộ mặt phẳng).
- Lớp mây T07 lộ cạnh thẳng lúc camera nghiêng (overscan quá sát viewport). Đã nới overscan.
- Đường chéo (anti-alias) bị mất ở tier cao khi tia bật, do render-to-texture không giữ MSAA.
  Đã bật `samples: 4` cho render target.

**Đã xác minh:** không còn hiện tượng phủ sáng đều mặt nước; không lỗi console/shader qua
Playwright (desktop 1440, mobile 390, cuộn lui/tới); tia tắt đúng lúc p≥0.6; tier thấp không
chạy ray pass.

**Chưa xác minh (cần máy thật, giữ nguyên yêu cầu cũ):** chi phí ms/frame bật/tắt ray pass trên
GPU thật, độ mạnh tia theo cảm nhận thị giác trên thiết bị thật — môi trường này chỉ có
SwiftShader (renderer phần mềm), số đo ở đây chỉ mang tính chẩn đoán.
