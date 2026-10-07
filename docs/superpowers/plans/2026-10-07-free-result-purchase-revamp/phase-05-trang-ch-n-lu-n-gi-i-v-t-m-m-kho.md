---
phase: 5
title: "Trang chọn luận giải và tấm mở khoá"
status: pending
priority: P1
effort: "3d"
dependencies: [1, 2]
---

# Phase 5: Trang chọn luận giải và tấm mở khoá

## Overview
Làm trang `/la-so/{chartId}/chon-luan-giai` và tấm mở khoá trả lời được câu "mua cái này tôi được gì", chỉ bày món bán được, làm nổi đúng món khách đang tò mò. Câu mời mua theo Hormozi ở mức tiết chế. Không đổi giá, không đổi luồng tiền, không đổi cách nạp trong tấm (LSV-77).

## Requirements
- Functional (theo đề xuất; bỏ mục anh nói Không ở GĐ1):
  - **Chỉ bày món bán được** (Q1): ẩn thẻ "Sắp mở" và tab Hội viên khi gói còn giữ; món nào bật trong danh mục thì tự hiện lại, không cần sửa giao diện.
  - **Mỗi thẻ trả lời "bạn sẽ biết gì"**: 3 dòng điều khách được biết, số phần (ví dụ "12 cung + 10 đại vận + năm 2026"), một đoạn đọc thử ngắn của **chính lá số này** (từ GĐ3), giá Lá; nút riêng trên thẻ, bỏ nút trùng ở dưới.
  - **Bảng so sánh ngắn** Một cung / Bản mệnh / Trọn đời: mỗi gói có gì, giá, "đã trả trước được trừ khi nâng cấp trong 7 ngày".
  - **Làm nổi gói khớp ý định**: khách đến từ đoạn năm 2026 → làm nổi Trọn đời với câu "phần năm 2026 và đại vận hiện tại nằm trong gói này" (Q5a); khách đến từ một cung → làm nổi "Một cung" của đúng cung đó, Trọn đời là lựa chọn thứ hai. Dùng tham số `?offer=&palace=` đã có từ GĐ5 cũ.
  - **Giá tiền đồng** (Q6): trong tấm mở khoá ghi "960 Lá ≈ 86.000đ (theo gói Khởi Đọc)". Không ghi trên thân trang miễn phí.
  - **Thuật ngữ**: "Độ mạnh cấu trúc: 71/100" đổi thành nhãn dễ hiểu ("Bộ sao hỗ trợ mạnh") + số nhỏ bên cạnh; công thức trong hộp giải thích.
  - **Câu mời mua** dùng thư viện câu từ GĐ3; hai bộ để anh chọn: (A) gọn, điềm tĩnh; (B) ấm, nhấn vào điều khách muốn biết. Không dùng đếm ngược, không số người mua.
  - **Giảm rủi ro**: nhắc rõ hoàn Lá khi đánh dấu "Không đúng" (món dưới 500 Lá, FD-105) và khấu trừ 7 ngày khi nâng cấp — đúng như điều kiện thật, không phóng đại.
  - **Giao diện** (Q10): thẻ và tấm "hai lớp viền", nút chính dạng viên có mũi tên trong vòng tròn, phản hồi khi bấm; vùng bấm ≥44px.
- Non-functional: điện thoại trước; giữ nguyên an toàn luồng tiền (một lần bấm một lần trừ, thiếu Lá nạp trong tấm); tiếng Việt và tiếng Anh; sáng và tối.

## Architecture
- Danh mục sản phẩm vẫn là nguồn duy nhất (`config/product-catalog.json` + catalog trong backend): giao diện chỉ đọc trạng thái "bán được/đang giữ", không viết cứng.
- Đoạn đọc thử trên thẻ lấy từ bản chiếu an toàn đã có (không lộ chữ trả phí).
- Tỉ giá Lá ≈ đồng tính từ gói nạp phổ biến trong `la-packs.ts`, ghi rõ gói dùng để quy đổi.

## Related Code Files
- Create: `prototype/revamp-2026-10/chon-luan-giai-v3.html` (+ tấm mở khoá) — bản mẫu bấm được
- Modify: `apps/web/src/features/reports/paid-topic-selector.tsx`, `paid-topic-selector-client.tsx`, `offer-ladder.tsx`, `purchase-offer-presentation.ts`
- Modify: `apps/web/src/features/commerce/unlock-sheet.tsx`, `contextual-unlock.tsx`, `membership-panel.tsx`, `la-packs.ts` (chỉ hàm quy đổi hiển thị)
- Modify: `apps/web/messages/{vi,en}/reports.json`, `commerce.json` (nếu có)
- Tests: `paid-topic-selector.test.tsx`, `purchase-offer-presentation.test.ts`, `offer-selection.test.ts`; e2e `contextual-unlock.spec.ts`, `inline-topup.spec.ts`, `topup-selection.spec.ts`

## Implementation Steps
1. Báo anh trước khi bắt đầu phần giao diện.
2. Dựng bản mẫu HTML bấm được: trang chọn luận giải (3 trường hợp đến: từ năm 2026, từ một cung, vào thẳng) + tấm mở khoá (đủ Lá / thiếu Lá); hai bộ câu A và B để anh bật qua lại; 390 và 1440; sáng và tối.
3. Publish Artifact; anh chọn bộ câu, sửa chữ, bình luận từng thẻ. Sửa đến khi anh duyệt.
4. Viết code theo bản mẫu đã duyệt; giữ test luồng tiền cũ; thêm test "món đang giữ không hiện".
5. Kiểm tra trình duyệt + so "bản mẫu – trang thật" trên trang HTML để anh xác nhận.
6. Merge → phát hành → kiểm tra trên trang thật.

## Success Criteria
- [ ] Anh duyệt bản mẫu và chọn bộ câu.
- [ ] Không còn thẻ "Sắp mở/Sắp có" khi món còn giữ; bật món trong danh mục thì thẻ tự hiện (có test).
- [ ] Mỗi thẻ có "bạn sẽ biết", số phần, đọc thử của chính lá số, giá; một nút duy nhất.
- [ ] Gói làm nổi đổi đúng theo chỗ khách bấm tới.
- [ ] Bộ e2e luồng mở khoá và nạp trong tấm vẫn đạt (một lần bấm một lần trừ).

## Risk Assessment
- Ẩn món đang giữ làm mất cảm giác "còn nhiều thứ để mua" → bảng so sánh và đọc thử bù lại; đo tỷ lệ mua trước/sau ở GĐ6.
- Quy đổi tiền đồng sai khi đổi gói nạp → tính từ `la-packs.ts`, có test.
- Đọc thử trên thẻ vô tình lộ chữ trả phí → chỉ dùng thư viện miễn phí GĐ3, test kiểm tra như LSV-75.
