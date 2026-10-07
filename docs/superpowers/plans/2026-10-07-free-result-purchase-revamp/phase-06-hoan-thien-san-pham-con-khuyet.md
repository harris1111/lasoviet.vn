---
phase: 6
title: "Hoàn thiện sản phẩm còn khuyết"
status: pending
priority: P1
effort: "10d+ (BE An chủ yếu; mỗi món một đợt riêng)"
dependencies: [2, 3, 5]
---

# Phase 6: Hoàn thiện sản phẩm còn khuyết

## Overview
Anh đã chốt (Q1): nếu engine sẵn sàng thì **xây** các món còn thiếu, không chỉ ẩn. Nghiên cứu 01 cho thấy **không món nào chỉ thiếu giao diện**: các món "Sắp mở" đã có code backend, bị giữ vì cổng chất lượng (20 bài thật đạt liên tiếp, FD-082) và ngân sách chưa duyệt; riêng Chặng 10 năm chưa có SKU và writer. Giai đoạn này đưa **từng món** qua cổng rồi bật trong danh mục; giao diện (GĐ4, GĐ5) tự hiện thẻ, không phải sửa.

Thứ tự đề xuất (R1): **Vận hạn năm [Y] → Chặng 10 năm → Tình duyên và Công việc → Tháng này → Combo.** Món nào chưa qua cổng thì ẩn (Q1), không hiện "Sắp mở".

## Requirements

### Các món trong phạm vi
| Món | Hiện trạng | Việc | Cổng | Chờ quyết định |
|---|---|---|---|---|
| **Vận hạn năm [Y]** (480) | Code xong cho 2026, cứng năm | Năm tham số (GĐ5), sửa tính năm (GĐ2), chạy đợt 20 bài, viết lại nhãn "Năm [Y]" | FD-077 + FD-089 + 20 bài thật liên tiếp + anh xem 5 bài | R1 (ngân sách), R4 (tháng hạn) |
| **Chặng [a–b] tuổi của bạn** (360 đề xuất) | Chưa có SKU/writer; chỉ có đoạn trong Trọn đời và chủ đề | SKU mới (vd `ZIWEI-DECADE-P0`, `period_key` = chặng hiện tại hoặc kế), contract `ziwei-decadal-reading-v1`, writer + cổng theo mẫu `period-reading-writer.ts` và `topic-deep-dive-quality-v4.ts`, facts từ `decadalList()`; "chưa bắt đầu" thì không bán; cổng thêm "không bịa năm/tuổi ngoài khoảng chặng" | như trên | R7 (giá, phạm vi), R1 |
| **Tình duyên, Công việc** (480 mỗi đề) | Code xong (`topic-deep-dive-writer-v4.ts`) | 20 bài thật **mỗi chủ đề** | như trên | R1 |
| **Tháng này của bạn** (300) | Code xong (`period-reading-writer.ts`), thẻ chưa có trên trang chọn | 20 bài thật; thêm thẻ khi qua; (tuỳ) cho mua "tháng sau" | như trên | R1 |
| **Combo** (1.300) | Code xong, cứng 2026 ở DB | Đổi thành "Trọn đời + Năm [Y]" tham số; chỉ mở sau khi Trọn đời và Năm đều đạt; thử mua hai quyền lợi, phát lại, hoàn | cả hai món thành phần đạt | R9 |
| **Gói cặp Năm nay + Năm sau** (780) | Chưa có | Làm sau khi bản Năm đạt | như Năm | R8 |
| **Cục, Mệnh chủ, Thân chủ, nạp âm giữa lá số** | Engine chưa có | Thêm ở lớp ánh xạ engine; FE điền giữa lá số (không bắt buộc cho bản đầu) | không có cổng 20 bài (là dữ kiện, không phải bài viết) | R13 |

### Không nằm trong phạm vi (xem R10–R12)
Hội viên (chờ chọn công cụ trả phí), Hợp đôi/Bát Tự/Tây phương (chưa có engine; OD-005 cần Bát Tự), thêm chủ đề khác, tầng tiểu hạn. Chỉ đưa vào nếu anh chọn "làm ngay" ở R10–R12.

### Quy tắc cổng cho mỗi món mới
- Số chữ tối thiểu, từ cấm, bám chứng cứ (FD-077); nói hạn như việc chuẩn bị, **chỉ nêu tháng hạn khi engine đã tính** (FD-089).
- **20 bài thật liên tiếp đạt**; dừng ngay ở lần lỗi đầu; script có sẵn `scripts/verify-topic-deep-dive-real-generations.mjs`, `verify-period-reading-real-generations.mjs`; hạ tầng ngân sách `native-campaign-*`.
- Anh xem 5 bài mẫu trên trang HTML.
- Hoàn Lá "Không đúng" cho món dưới 500 Lá giữ nguyên (FD-105).
- **Bật bằng danh mục:** đổi `availability` của món trong danh mục; giao diện tự hiện thẻ; chỉ chuyển Done ở Kaneo khi có bằng chứng phát hành và kiểm tra trên trang thật.
- **Trước khi chạy đợt 20 bài của Năm, phải xong B1–B3 (GĐ2)** để kiểm trên dữ kiện đúng.

## Architecture
Mỗi món theo khuôn có sẵn: facts thuần từ engine → writer một lần gọi → cổng chất lượng → báo cáo lưu, mua/đọc/hoàn Lá qua `wallet-unlock.service.ts`. Không đổi luồng tiền ngoài năm tham số (GĐ5). Chặng 10 năm tái dùng `ZiweiTopicDecadalTiming*` và đoạn `currentDecadal` nếu hợp, nên chi phí viết thêm vừa phải (suy luận, An xác nhận).

## Related Code Files
**Backend (An):**
- Create: `packages/backend/src/reports/decadal-reading-writer.ts`, `decadal-report-config.ts`, `packages/contracts/src/ziwei-decadal-reading-v1.ts`
- Modify: `packages/contracts/src/la-catalog.ts` (SKU Chặng), `wallet-unlock.service.ts`, `period-reading-facts.ts` (`:26-27` tháng sau), `period-report-config.ts`, `topic-deep-dive-writer-v4.ts`, `packages/database/drizzle/00xx_*.sql` (SKU, combo)
- Modify (R13): `packages/engine-adapters/src/ziwei/iztro-mapping.ts`, `packages/contracts/src/normalized-ziwei-chart-v1.ts`
- Scripts: chạy đợt 20 bài của từng món (có trần tiền riêng)
**Frontend (Lãm + Claude):**
- Modify: `offer-ladder.tsx` (thẻ Tháng, Chặng khi qua cổng; câu mời mua theo mục 6.3 nghiên cứu 01), `paid-topic-selector*.tsx`, `ziwei-decadal-strip.tsx` (nút "Xem thử chặng này" mở thẻ Chặng thay vì Một cung)
- Create: `prototype/revamp-2026-10/mau-bai-<mon>.html` mỗi món một trang

## Implementation Steps
| # | Việc | Ai |
|---|---|---|
| 1 | Chờ GĐ2 xong B1–B3 (tính năm, ranh giới Tết, tháng hạn) và GĐ5 xong năm tham số | An |
| 2 | Anh duyệt ngân sách đợt (R1); An chạy **đợt Năm** | An |
| 3 | Dựng `mau-bai-nam.html` (5 bài mẫu thật + bảng kết quả 20 bài); anh xem, duyệt mở bán | Claude dựng; anh duyệt |
| 4 | Bật Năm trong danh mục; FE đưa thẻ lên (đã có từ GĐ5); kiểm tra trên trang thật | An + Lãm |
| 5 | Xây Chặng 10 năm (SKU, contract, writer, cổng) khi R7 chốt giá; chạy đợt 20 bài; trang mẫu; bật | An; Claude; anh |
| 6 | Tình duyên, Công việc: chạy đợt, trang mẫu, bật từng đề | An; Claude; anh |
| 7 | Tháng này: chạy đợt, bật, thêm thẻ; (tuỳ) tháng sau | An; Lãm + Claude |
| 8 | Combo tham số + thử mua hai quyền lợi/phát lại/hoàn; bật sau khi Trọn đời + Năm đạt | An |
| 9 | Gói cặp 780 (nếu R8 đồng ý) | An; Lãm + Claude |
| 10 | (R13) Cục/Mệnh chủ/Thân chủ/nạp âm: engine, rồi giữa lá số | An; Lãm + Claude |

## Success Criteria
- [ ] Mỗi món bật có: 20/20 bài thật đạt liên tiếp, anh duyệt 5 bài mẫu, bằng chứng trên Kaneo.
- [ ] Món nào chưa đạt thì **không** hiện trên trang chọn (Q1).
- [ ] Món vừa đạt tự hiện thẻ từ danh mục, không sửa giao diện.
- [ ] Chặng 10 năm: test không bịa năm/tuổi ngoài khoảng chặng; 7 lá số cho đúng chặng hiện tại và chặng kế.
- [ ] Combo: mua hai quyền lợi, phát lại, hoàn Lá đều đạt; không còn gắn 2026.
- [ ] Không món nào đổi giá FD-105 trừ Chặng (mới).

## Risk Assessment
- Tốn tiền AI cho nhiều đợt → từng đợt trần riêng, dừng ở lỗi đầu, thứ tự đề xuất bán được nhiều nhất trước (Năm).
- Chặng 10 năm bán được nhưng chữ bị bắt bẻ ("chặng của tôi sai") → cổng kiểm năm/tuổi, nhãn "tạm tính" khi giờ sinh chưa chắc.
- Combo mở trước khi thành phần đạt → khoá bằng danh mục: chỉ bật khi cả hai thành phần Active.
- Hai món cùng nói về năm (Trọn đời có một đoạn, Năm có 12 tháng) → câu mời mua nói thật phần nào có gì (GĐ5).
- Mở món mới mà chưa đo → giữ khấu trừ 7 ngày như cũ (R9), đo trước khi mở rộng.

## Trang HTML duyệt
`mau-bai-<mon>.html` (một trang cho mỗi món: Năm, Chặng, Tình duyên, Công việc, Tháng): 5 bài mẫu thật từ lá số tổng hợp, bảng kết quả 20 bài (đạt/không đạt theo mã lỗi), chi phí đợt. Anh làm gì: đọc mẫu, chấm 1–5, bấm duyệt hoặc "chưa đạt" cho từng món; món nào duyệt thì An bật.
