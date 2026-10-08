---
phase: 5
title: "Trang chọn luận giải và dải sản phẩm"
status: pending
priority: P1
effort: "6d (FE 3d, BE năm tham số 3d, song song)"
dependencies: [1, 2]
---

# Phase 5: Trang chọn luận giải và dải sản phẩm

## Overview
Làm trang `/la-so/{chartId}/chon-luan-giai` và tấm mở khoá trả lời được câu "mua cái này tôi được gì", **bày dải sản phẩm theo vòng thời gian của chính người đó** (Q5), chỉ bày món bán được (Q1), làm nổi đúng món khách đang tò mò, nút bấm một bước có phản hồi rõ (Q10). Câu mời mua theo Hormozi ở mức tiết chế. Giá chỉ bằng Lá; **tiền đồng chỉ ở bước xác nhận cuối trước khi thanh toán** (Q6: KHÔNG ghi thêm giá đồng trên thẻ hay trong tấm xem thử).

Song song có **việc backend ưu tiên cao của An: tham số hoá năm** (bỏ "2026" cứng) để sản phẩm không chết sau Tết 06/02/2027 và để dải sản phẩm có món "Vận hạn năm [Y]".

## Requirements

### Dải sản phẩm theo vòng thời gian (FE, từ nghiên cứu 01 mục 4.4 và 6.2)
Trang chọn luận giải bày thẻ theo **tầng thời gian**, mỗi tầng có thẻ miễn phí đã đọc và thẻ trả phí:

| Tầng | Miễn phí (đã đọc ở trang lá số) | Trả phí | Giá Lá | Hiện khi |
|---|---|---|---|---|
| Hôm nay | một dòng ngày + cung bị chạm | Hôm nay của bạn | 60 | bán ngay |
| Tháng | 12 ô tháng, đánh dấu (chỉ tháng engine tính thật, R4/R5) | Tháng này của bạn | 300 | qua cổng (GĐ6: kiểm tự động + 2–3 bài thử tay) |
| Năm | cung lưu niên, tóm tắt năm | **Vận hạn năm [Y]** (năm nay hoặc năm sau) | 480 | tham số năm xong + qua cổng |
| Chặng 10 năm | Đường đời 10 năm, điểm | **Chặng [a–b] tuổi của bạn** | **360 (R7 đã chốt)** | xây xong + engine đại vận đã kiểm chứng (BE-P0-8) + qua cổng |
| Cung | 12 điểm, 1 cung quà | Một cung (120), Bản mệnh (240) | 120 / 240 | bán ngay |
| Chủ đề | câu hỏi + cung liên quan | Tình duyên, Công việc, và chủ đề mới khi Active (`research/05`) | 480 | qua cổng (GĐ6) |
| Hai người | — | Hợp đôi (Tử Vi + Bát Tự) | 600 | mã xong + kết quả kiểm tra pháp lý Nghị định 13/2023 (GĐ6) |
| Hệ thứ hai | — | Bát Tự toàn diện | giá theo SKU Bát Tự (anh chốt khi có mẫu) | engine + qua cổng (GĐ6) |
| Trọn đời | — | Tử Vi trọn đời | 960 | bán ngay |
| Gói gộp | — | Combo "Trọn đời + Năm [Y]" (1.300); gói cặp Năm nay + Năm sau (780, R8 đã chốt) | 1.300 / 780 | qua cổng (gói cặp sau khi Năm đạt) |

**Ẩn có điều kiện (Q1, đã chốt):** mỗi món chỉ ẩn **đến khi qua cổng chất lượng**; bật món trong danh mục thì thẻ tự hiện (giao diện chỉ đọc trạng thái từ danh mục, không viết cứng); có test "món đang giữ không hiện". Tab Hội viên **ẩn** khi còn giữ (R10 đã chốt: giữ "sắp ra mắt", công cụ Hội viên được xây ở GĐ6 nhưng chưa mở bán, không nút mua). Không còn "Sắp mở/Sắp có/Sắp ra mắt"; không còn thẻ mang hai nhãn.

### Chọn thẻ đầu theo từng người (Q5, bảng 4.4 nghiên cứu 01)
API "dữ kiện theo người" (BE, chỉ đọc) trả: năm âm lịch hiện tại Y, số tháng âm lịch còn lại của năm, chặng hiện tại [a–b] tuổi, năm thứ k trong chặng, số năm còn lại R = 10 − k, cung lưu niên của Y và Y+1, cung chặng kế. Giao diện chọn thẻ đầu:
- Bấm "Năm nay", còn nhiều tháng → thẻ đầu **Vận hạn năm Y**, thẻ hai **Chặng hiện tại**; câu mở bằng số thật ("Năm Bính Ngọ của bạn rơi vào cung X, năm thứ k trong chặng a–b tuổi").
- Bấm "Năm nay", chỉ còn vài tháng cuối trước Tết (R8 đã chốt; ngưỡng mặc định ≤3 tháng âm lịch còn lại) → thẻ đầu **Vận hạn năm Y+1** hoặc cặp Y và Y+1; nói **sự thật về thời gian** ("năm Bính Ngọ đến 06/02/2027"), không đếm ngược giả.
- R ≤ 2 → thêm **Chặng kế tiếp** ("Chặng a–b của bạn kết thúc năm B; chặng kế bắt đầu B+1 ở cung X'"). k ≤ 2 → làm nổi **Chặng hiện tại**.
- Chưa đến tuổi chặng đầu → ẩn Chặng, hiện "chặng đầu bắt đầu năm …". Giờ sinh chưa chắc → nhãn "tạm tính" (FD-103).
- Đã có Trọn đời → mở lại báo cáo; Năm Y (12 tháng) là phần **thêm**; nói thật điều này.
- **Khi bản Năm/Chặng chưa qua cổng:** tiếp tục dùng Trọn đời làm đích cho khách tò mò năm (FD-116) nhưng **nói đúng**: "Trọn đời có phần chặng hiện tại và năm hiện tại ở dạng tóm tắt; muốn 12 tháng của năm thì có bản Vận hạn năm". Không viết "Trọn đời là phần năm".

### Thẻ và tấm mở khoá
- Mỗi thẻ: 3 dòng "bạn sẽ biết", số phần (ví dụ "12 cung + 10 chặng + năm Y"), đọc thử ngắn của **chính lá số** (từ GĐ3), giá Lá; **một nút duy nhất** "Mở – N Lá →" ngay trên thẻ, mở thẳng tấm xác nhận (bỏ nút "Chọn phần này" và nút gộp cuối trang). Thẻ bấm cả vùng; thẻ "Một cung" có chip chọn cung hiện ✓, chỉ kéo giãn vùng đầu thẻ.
- **Bảng so sánh ngắn** Một cung / Bản mệnh / Chặng / Năm / Trọn đời: mỗi gói có gì, giá, "đã trả trước được trừ khi nâng cấp trong 7 ngày" (luật hiện có; **chưa mở rộng** cho Năm/Chặng, R9 đã chốt).
- **Làm nổi gói khớp ý định** qua `?offer=&palace=`: nhãn "Hợp với câu bạn vừa hỏi", hai lớp viền vàng.
- **Thuật ngữ:** "Độ mạnh cấu trúc: 71/100" → nhãn dễ hiểu ("Bộ sao hỗ trợ mạnh") + số nhỏ.
- **Giá tiền đồng (Q6 = Không):** không ghi trên thẻ, không ghi trong tấm xem thử. Chỉ ở **bước xác nhận cuối** ngay trước thanh toán/nạp (số dư, còn lại bao nhiêu, quy đổi tiền đồng từ gói nạp phổ biến trong `la-packs.ts`, ghi rõ gói dùng để quy đổi). Hàm quy đổi chỉ để hiển thị; có test.
- **Câu mời mua:** hai bộ cho anh chọn: (A) gọn, điềm tĩnh; (B) ấm, nhấn vào điều khách muốn biết. Bốn đòn bẩy giá trị: điều khách muốn, căn cứ, đọc ngay, một chạm. **Giảm rủi ro đúng như điều kiện thật:** hoàn Lá khi đánh dấu "Không đúng" trong 24 giờ cho món dưới 500 Lá (mỗi tài khoản một lần, FD-105); khấu trừ 7 ngày khi nâng cấp. Cấm: "giải mã vận mệnh", "đổi đời", "bí mật", đếm ngược giả, số người mua giả, nói Trọn đời "là phần năm".
- **Giao diện (Q10):** thẻ và tấm hai lớp viền; nút chính viên có mũi tên trong vòng tròn; mọi trạng thái nút theo bảng E4 (nghiên cứu 03); nút bị khoá có viền đứt + dòng lý do ("Cần X Lá nữa"), `aria-disabled`; đang tải có vòng xoay, chặn bấm đúp; xoá mã chết nhóm thẻ cũ `.offer-card`.
- Non-functional: điện thoại trước; giữ nguyên an toàn luồng tiền (một lần bấm một lần trừ, thiếu Lá nạp trong tấm); VI/EN; sáng/tối.

### Backend: năm tham số (An; chi tiết trong `research/04-ticket-be-cho-an.md`)
- SKU năm theo tham số: hoặc `ZIWEI-YEAR-{Y}-P0` sinh theo năm, hoặc một SKU `ZIWEI-YEAR-P0` + `period_key = Y`. Sửa 4 chỗ kiểm tra `deriveReportTimingLineage(now).targetYear !== 2026` trong `wallet-unlock.service.ts` (dòng 581, 648, 814, 1002), `purchasePeriodKey` trong `period-report-config.ts`, trigger combo ở migration 0054 (**migration mới**, không sửa 0054 đã chạy), `han-month-reminder.service.ts` (26, 79), enum SKU, báo giá, hoàn Lá, thẻ ở `offer-ladder.tsx:15`.
- Cho phép mua **năm hiện tại và năm kế**; khoảng cho phép nằm trong cấu hình.
- Combo tham số "Trọn đời + Năm [Y]" (R9 đã chốt: giữ 1.300 Lá; BE-P1-11).
- `ziwei-free-result-model.ts:141` đã suy ra SKU năm theo năm động nhưng danh mục không có `ZIWEI-YEAR-2027-P0` nên rơi về Trọn đời → sửa cùng.
- **Hạn chót thực tế: phát hành trước Tết 06/02/2027.** Bắt đầu ngay, không chờ FE.
- API "dữ kiện theo người" (B6) chỉ đọc, test với 7 lá số của nghiên cứu 01 mục 4.2.

## Architecture
- Danh mục sản phẩm vẫn là nguồn duy nhất (`packages/contracts/src/la-catalog.ts` là nguồn bán thật; `config/product-catalog.json` giá VND cũ chỉ để tham chiếu, An dọn sau, B9): giao diện chỉ đọc "bán được/đang giữ".
- Đoạn đọc thử trên thẻ lấy từ bản chiếu an toàn (không lộ chữ trả phí), chỉ dùng thư viện miễn phí GĐ3.
- Chọn thẻ đầu là hàm thuần trên dữ kiện theo người (dễ test).

## Related Code Files
**Frontend:**
- Create: `prototype/revamp-2026-10/chon-luan-giai-v3.html` (+ tấm mở khoá) bản mẫu bấm được
- Modify: `apps/web/src/features/reports/offer-ladder.tsx`, `paid-topic-selector.tsx`, `paid-topic-selector-client.tsx` (xoá `:287-465` mã chết), `palace-picker.tsx`, `purchase-offer-presentation.ts` (bỏ chữ "79.000 ₫" cũ, B9), `apps/web/src/features/commerce/unlock-sheet.tsx`, `contextual-unlock.tsx`, `wallet-unlock-dialog.tsx` (quy đổi tiền đồng ở bước xác nhận), `membership-panel.tsx`, `la-packs.ts` (hàm quy đổi hiển thị), `contextual-unlock.css`, `pricing-and-topup.css`
- Modify: `apps/web/messages/{vi,en}/reports.json`, `commerce.json`
- Tests: `paid-topic-selector.test.tsx`, `purchase-offer-presentation.test.ts`, `offer-selection.test.ts`; e2e `contextual-unlock.spec.ts`, `inline-topup.spec.ts`, `topup-selection.spec.ts`
**Backend (An):**
- Modify: `packages/contracts/src/la-catalog.ts` (`:235-251`, `:320-345`), `period-report-config.ts` (`:4-9`), `packages/backend/src/.../wallet-unlock.service.ts`, `han-month-reminder.service.ts`, `packages/contracts/src/commerce.ts` (`:157-158`, `:246-250`)
- Create: `packages/database/drizzle/00xx_year_parameter.sql`; mới trong `ziwei-query.service.ts` (hoặc facts API) cho dữ kiện theo người
- Tests: mua/đọc/hoàn Lá cho năm Y và Y+1; qua ranh giới Tết; 7 lá số

## Implementation Steps
1. **BE (bắt đầu ngay):** An làm năm tham số + migration + API dữ kiện theo người; phát hành sớm nhất có thể (hạn chót Tết 06/02/2027).
2. **FE:** báo anh trước khi bắt đầu phần giao diện.
3. **FE:** dựng bản mẫu HTML bấm được: trang chọn luận giải (3 trường hợp đến: từ năm nay, từ một cung, vào thẳng; thêm "năm gần hết" và "chặng sắp đổi") + dải sản phẩm theo tầng thời gian + tấm xác nhận (đủ Lá / thiếu Lá; bước cuối có tiền đồng); hai bộ câu A và B anh bật qua lại; 390 và 1440; sáng và tối.
4. Người điều phối publish; anh chọn bộ câu, sửa chữ, bình luận từng thẻ; sửa đến khi duyệt.
5. Viết code theo bản mẫu đã duyệt; giữ test luồng tiền cũ; thêm test "món đang giữ không hiện", "món qua cổng tự hiện", test chọn thẻ đầu cho 7 lá số.
6. Kiểm tra trình duyệt; trang so "bản mẫu – trang thật" để anh xác nhận.
7. Merge → phát hành → kiểm tra trên trang thật.

## Success Criteria
- [ ] Anh duyệt bản mẫu và chọn bộ câu A hoặc B.
- [ ] Không còn thẻ "Sắp mở/Sắp có/Sắp ra mắt"; bật món trong danh mục thì thẻ tự hiện (có test); tab Hội viên ẩn khi còn giữ.
- [ ] Mỗi thẻ có "bạn sẽ biết", số phần, đọc thử của chính lá số, giá Lá, **một nút duy nhất** có đủ trạng thái.
- [ ] Thẻ đầu chọn đúng theo từng người (7 lá số: đúng chặng, đúng cung lưu niên, đúng "năm gần hết"/"chặng sắp đổi").
- [ ] Không có giá tiền đồng trên thân trang, thẻ, hay tấm xem thử; có đúng một chỗ hiện tiền đồng: bước xác nhận cuối.
- [ ] Sản phẩm năm không còn cứng 2026: mua/đọc/hoàn Lá đạt cho năm Y và Y+1, qua ranh giới Tết; không còn trigger/enum nào gắn 2026.
- [ ] Bộ e2e luồng mở khoá và nạp trong tấm vẫn đạt (một lần bấm một lần trừ).

## Risk Assessment
- Ẩn món đang giữ làm mất cảm giác "còn nhiều thứ để mua" → bảng so sánh + đọc thử bù lại; đo tỉ lệ mua trước/sau ở GĐ7.
- Quy đổi tiền đồng sai khi đổi gói nạp → tính từ `la-packs.ts`, ghi rõ gói, có test.
- Đọc thử trên thẻ vô tình lộ chữ trả phí → chỉ dùng thư viện miễn phí GĐ3, test như LSV-75.
- Năm tham số làm hỏng luồng tiền → đây là ngoại lệ duy nhất đụng money path: migration mới, test mua/đọc/hoàn, phát hành riêng trước FE, theo dõi sau phát hành.
- Ranh giới năm dương/âm (01/01–05/02) → An xử lý ở GĐ2 (B3) trước khi dùng cho thẻ.
- Khách tưởng Trọn đời "là phần năm" → nói thật trong câu mời mua, có test chữ.
- Dữ kiện theo người sai cho giờ sinh chưa chắc → nhãn "tạm tính", không bán món phụ thuộc chặng nếu lá số tạm tính (hoặc nói rõ).

## Trang HTML duyệt
`chon-luan-giai-v3.html`: bản mẫu bấm được của trang chọn luận giải (dải sản phẩm theo tầng thời gian, thẻ một bước, tấm mở khoá, bước xác nhận cuối có tiền đồng) với các trường hợp đến khác nhau. Anh làm gì: bật qua lại bộ câu A/B, chọn một, sửa chữ trực tiếp, bình luận từng thẻ; xác nhận món nào hiện và món nào ẩn ở thời điểm phát hành.
