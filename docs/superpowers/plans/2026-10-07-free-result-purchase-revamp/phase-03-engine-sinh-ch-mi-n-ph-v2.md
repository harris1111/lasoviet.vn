---
phase: 3
title: "Hệ thống AI viết chữ và căn cứ"
status: pending
priority: P1
effort: "6d (BE An 5d, FE 1d, anh duyệt chữ)"
dependencies: [1]
---

# Phase 3: Hệ thống AI viết chữ và căn cứ

## Overview
Anh đã chốt (Q9, Q2): **AI viết** chữ miễn phí, prompt rất chặt, tiếng Việt tự nhiên, riêng cho từng người, có chất chuyên gia, và căn cứ nằm cạnh từng nhận định. Mục tiêu duy nhất: khách **tin** Lá Số Việt luận đúng.

Cách làm (theo `research/02-he-thong-ai-viet-chu.md`): **một lần gọi AI cho mỗi lá số**, trả về một gói gồm: bài tổng quan, cung đọc trọn theo mối quan tâm, dòng đọc thử cho 13 mục còn khoá (11 cung + 2 chủ đề), đoạn "Năm nay" cắt giữa câu, và căn cứ cho từng nhận định. Gói được kiểm tự động theo từng khối; khối nào rớt thì dùng chữ quy tắc đã cải tiến (không gọi lại, vì tiền vẫn tính).

**Thứ tự giao:** (1) chữ quy tắc v2 + thư viện thẻ nghĩa ra **trước**, vì không bị chặn kỹ thuật và là đường dự phòng; (2) AI ra sau khi An gỡ hai chỗ chặn. Ngân sách tiền (R2) và bốn nguyên tắc viết (R3) chờ anh trả lời trước khi bật AI thật.

## Hiện trạng (đã kiểm trong mã)
- Chữ tổng quan do `free-structural-overview.ts` ghép từ câu mẫu, không AI; chỉ biết ý nghĩa 14 chính tinh viết lối Hán Việt cứng; in cả công thức điểm vào thân bài; mỗi cung lặp câu tự phủ nhận; "Nên làm/Nên tránh" giống nhau cho mọi người cùng cung.
- Đoạn "Năm nay" dừng ở "…điều cần xem kỹ là…" là chuỗi cố định, không phải câu cắt từ một đoạn thật.
- Tab Căn cứ chỉ có 3 mục chung chung.
- AI một cung (LSV-71) có sẵn: một lần gọi, cache, chặn tiền (trần 3.000đ/lá số, 50.000đ/ngày); prompt chỉ 6 câu luật; trần output 2.500 token.
- **Hai chỗ chặn:** (a) `NO_REVIEWED_TOKEN_BOUND_PROOF` ở `apps/api/src/free-palace-composition.ts` → mọi yêu cầu dừng ở `unproven_bound`; (b) bộ nối 9router + Gemini coi số token là "không rõ" → không tính được tiền.
- Giá chạy thật trong bảng giá hệ thống (migration 0044) gấp đôi FD-114 (39.165/195.825 đồng mỗi triệu token so với 19.582/97.912).

## Requirements
- **Giọng và niềm tin:** 15 thủ pháp trong nghiên cứu 02 (neo lá số; tương phản có neo; chuỗi "vì sao" ≤3 mắt xích; cảnh đời thường "thử để ý xem"; neo thời gian thật; dám nói điều khó nghe kèm việc chuẩn bị; **một** câu thận trọng cả bài; hiếm trước phổ biến sau; lời khuyên đo được…). Hàng rào cứng: không sao/cung/Hoá/độ sáng/tuổi/năm/tháng ngoài dữ kiện engine; không cách cục trừ khi engine tính; không sự kiện/ngày cụ thể; không chết/bệnh cụ thể/cúng/xổ số; không "chúng tôi/đội ngũ/chuyên gia/AI"; không tự khoe kinh nghiệm.
- **Bài tổng quan 900–1.300 âm tiết:** chân dung một câu; trục Mệnh–Thân; điểm mạnh; chỗ hay vướng (kèm cảnh); công việc, tiền bạc, tình cảm; 3 việc nên làm đo được; cầu nối sang "Năm nay". Không số công thức trong thân bài (công thức chỉ nằm trong hộp "Điểm này tính thế nào", FD-107).
- **Cung đọc trọn:** kết luận một câu, 3 ý chính, 3–4 đoạn, Nên làm/Nên tránh **riêng theo bộ sao**.
- **Dòng đọc thử 13 mục** (cho Q4): 1–2 câu thật của chính mục đó, dừng ở chỗ còn câu hỏi; **không** lời khuyên, lý do, con số, kết luận tốt/xấu; không lộ nội dung trả phí (FD-059).
- **Đoạn Năm nay:** 2 câu hiển thị khớp số liệu thật + câu thứ ba cắt giữa câu; phần sau của câu **không tồn tại ở bất kỳ nơi nào**.
- **Căn cứ (Q2):** hai tầng: (1) thẻ sao/cung/độ sáng lấy thẳng từ engine (không thể sai); (2) 2–3 bước do AI viết như người có nghề giải thích cho người ngoài ngành, bám đúng lá số.
- **Cổng kiểm tra tự động theo khối:** chặn cứng (sai schema/độ dài; khoá dẫn chứng không có thật; sao/cung/Hoá/số không có trong dữ kiện; **tả sai độ sáng**; **sai vị trí sao–cung**; sai Hoá; công thức lọt vào bài; từ cấm; câu thận trọng quá số; teaser lộ nội dung; đoạn cắt sai dạng) và cảnh báo mềm (câu dài, danh từ trừu tượng chồng, lặp đầu câu, rào đón, ít chữ "bạn", dồn Hán Việt).
- **Dự phòng:** khối nào rớt chặn cứng dùng chữ quy tắc v2 (cùng thư viện thẻ nghĩa); hết trần ngày hoặc không rõ giá → không gọi AI; **không thử lại**.
- **Tiếng Anh:** AI chỉ tiếng Việt; người đọc tiếng Anh dùng chữ quy tắc (chờ R3).
- **Tên khách không gửi cho AI**; trang tự chèn câu chào (chờ R3).
- **Chi phí:** khoảng 990đ/lá số theo giá FD-114, trần chặn trước khi gọi ≈1.290đ; theo giá hệ thống hiện tại ≈1.974đ, trần chặn ≈2.585đ (dưới 3.000đ nhưng chỉ dư ≈415đ → không tăng `max_tokens`, không bật "thinking" dài). **Bộ chặn tiền dùng giá tham chiếu FD-114** (đề xuất R2), đồng nhất với FD-114; An cập nhật bảng giá hoặc cấu hình tham chiếu cho khớp. Trần ngày 50.000đ chỉ đủ ≈25–50 lá số/ngày; còn lại dùng chữ quy tắc v2.
- **Không dùng hiệu ứng "chờ lâu":** giao diện hiện bản quy tắc trước rồi thay bằng bản AI khi xong (dự kiến 40–90 giây).

## Architecture
1. **Thư viện thẻ nghĩa có phiên bản** `content/knowledge/vi/ziwei/free-reading-cards.v1.json`: 14 chính tinh (essence/strength/cost/scene/độ sáng/Hoá), 12 cung, 4 Hoá, ~18 sao phụ (lục cát, lục sát, Lộc Tồn, Thiên Mã, Tuần, Triệt), 6 quan hệ; soạn từ Kho tri thức V4.1 + văn bài mẫu đã duyệt; mỗi thẻ có `sourcePassageIds`; **anh duyệt**. Thiếu thẻ cho sao nào thì bỏ sao đó khỏi dữ kiện.
2. **Dựng dữ kiện thuần, tất định** `free-reading-facts.ts`: khoá dẫn chứng (`palace:<p>:star:<s>`, `hoa:<s>`, `time:decadal`…), thứ hạng "điều hiếm", chọn thẻ. Không đưa vào: tên, ngày/giờ/nơi sinh, `chart_id`, điểm số, nội dung trả phí.
3. **Writer một lần gọi** `free-reading-writer.ts` (khuôn `free-palace-writer.ts`): phiên bản prompt `free-reading-prompt-v2.0`; system prompt = bản nháp đầy đủ trong nghiên cứu 02 mục 3.1 (sau khi anh duyệt giọng) với khối giọng v4.2, danh sách cấm từ cấu hình `config/ziwei-free-reading-quality.v1.json` (tách khỏi báo cáo trả phí, xử lý mâu thuẫn "tài lộc").
4. **Cổng chất lượng** `free-reading-quality.ts` (hàm thuần, mỗi mã lỗi một cặp test tốt/xấu).
5. **Lưu và cache:** bảng artifact mới (migration kế tiếp), lưu `content_v2`, trạng thái từng khối `ai|rule_v2`, lineage gồm 4 phiên bản; xoá theo 24 giờ và khi xoá dữ liệu như hiện nay; chiếu DTO an toàn ra giao diện (không gửi khoá thô/hash).
6. **Cờ triển khai:** chữ quy tắc v2 luôn bật; `FREE_READING_V2_ENABLED` cho AI; bật theo thứ tự: tài khoản đã xác minh → khách đã tương tác.

## Related Code Files
**Backend (An):**
- Create: `packages/contracts/src/free-reading-v2.ts`, `content/knowledge/vi/ziwei/free-reading-cards.v1.json`, `scripts/build-free-reading-cards.mjs`, `packages/backend/src/ziwei/free-reading-facts.ts`, `free-reading-writer.ts`, `free-reading-quality.ts`, `config/ziwei-free-reading-quality.v1.json`, `scripts/eval-free-reading.mjs`, `packages/database/drizzle/00xx_free_reading_v2.sql`
- Modify: `packages/backend/src/ziwei/free-structural-overview.ts`, `free-structural-overview-cache.ts`, `packages/contracts/src/free-structural-overview-v1.ts`, `free-palace-request.service.ts`, `free-palace-selection.ts`, `free-palace-quality.ts` (export hằng), `free-palace-runner.ts`, `free-palace-read.service.ts`
- Modify (gỡ chặn): `apps/api/src/free-palace-composition.ts`, `packages/backend/src/ai/openai-compatible-adapter.ts`, `free-palace-cost-context.ts`
- Modify: `packages/engine-adapters/src/ziwei/iztro-horoscope.ts` (cờ tháng ép; tuỳ chọn xuất lưu Hoá)
**Frontend (Lãm + Claude):**
- Create: `apps/web/src/features/ziwei/claim-with-basis.tsx` (chip "Căn cứ" cạnh nhận định)
- Modify: `ziwei-free-result-model.ts`, `ziwei-free-result.tsx`, `free-palace-gift-block.tsx`, `ziwei-overview-tab.tsx`, `ziwei-annual-tab.tsx`, `secure-locked-preview.tsx`, `ziwei-free-preview-projection.ts`, `apps/web/messages/{vi,en}/ziwei.json` (bỏ `evidenceTab.*`, giữ `pnpm i18n:check` xanh)
- Create: `prototype/revamp-2026-10/chu-mien-phi-v2.html` (bản nguồn Artifact)

## Implementation Steps
| # | Việc | Ai |
|---|---|---|
| 1 | Chọn 6 rồi 30 lá số tổng hợp (mỗi chính tinh làm sao Mệnh ≥1; Mệnh vô chính diệu; Mệnh/Thân cùng và khác cung; Hoá Kỵ ở Mệnh/Tài/Phu Thê; giờ sinh chưa chắc) | Claude + An |
| 2 | Soạn thư viện thẻ nghĩa (14 chính tinh trước, rồi Hoá, sao phụ); anh duyệt | Claude (Sonnet) soạn, anh duyệt |
| 3 | **Chữ quy tắc v2**: bộ ghép dùng thẻ nghĩa, đúng khung 6 phần, thân bài không công thức, một câu thận trọng cuối, Nên làm/Nên tránh theo bộ sao + độ sáng; tăng `FREE_OVERVIEW_RENDERER_VERSION` | An |
| 4 | Dựng dữ kiện, schema, cổng chất lượng, writer một lần gọi (chạy thử bằng giả lập) | An |
| 5 | **Gỡ chặn 1 và 2** (bằng chứng giới hạn token; số token Gemini) | An (P1-AI, bắt đầu sớm vì thời gian chờ dài) |
| 6 | Soạn prompt với Claude trước (6 lá số, rẻ), chỉnh luật | Claude + An |
| 7 | Chạy thật 30 lá số (trần thử riêng ≤180.000đ cho 3 vòng, chờ R2); cổng tự động; xuất 10 nhận định/bài để đối chiếu tay | An |
| 8 | **Trang HTML duyệt chữ**: mỗi lá số một cột "Chữ cũ / Chữ mới / Căn cứ"; số chữ; đánh dấu chi tiết riêng; thang chấm của anh | Claude dựng từ JSON bộ chạy thử |
| 9 | Anh đọc 5 lá số (vô chính diệu; giờ sinh chưa chắc; Mệnh có sao miếu; Hoá Kỵ ở Mệnh; chọn "tình cảm"), chấm 4 tiêu chí; A/B mù bản cũ–mới | Anh |
| 10 | Sửa prompt (tối đa 3 vòng); kiểm độ trùng giữa các lá số | An + Claude |
| 11 | FE: chip "Căn cứ", trạng thái "đang viết riêng cho bạn", nhãn "AI hỗ trợ diễn giải", chèn tên ở giao diện, nút phản hồi theo từng nhận định | Lãm + Claude |
| 12 | PR → merge → bật cờ theo thứ tự → xem lá số thật | An + Lãm |

## Success Criteria
- [ ] Anh duyệt thẻ nghĩa và giọng văn.
- [ ] 30 lá số thử: ≥27/30 qua toàn bộ chặn cứng ngay lần đầu (tỉ lệ rơi về chữ quy tắc ≤10%).
- [ ] Anh chấm trung bình ≥4,0 ở cả 4 tiêu chí (đúng lá số, tự nhiên, khí chất chuyên gia, muốn đọc tiếp), không ô nào dưới 3; **0 câu sai sự thật về lá số** trong 5 bài anh đọc và 10 nhận định ngẫu nhiên/bài đối chiếu tay (10 bài).
- [ ] A/B mù: ≥4/5 chọn bản mới.
- [ ] Chi phí đo thật ≤3.000đ ở p99; trần chặn ≤3.000đ; độ trễ p95 <90 giây hoặc giao diện có trạng thái chờ tốt.
- [ ] Chữ quy tắc v2 qua cổng 200/200 lá số tổng hợp; thân bài không còn số công thức; hộp "Điểm này tính thế nào" vẫn đủ công thức.
- [ ] Không chữ trả phí lọt vào dòng đọc thử (kiểm tự động như LSV-75); phần sau câu cắt không tồn tại ở bất cứ đâu.
- [ ] Không còn tab Căn cứ; mọi nhận định có chip Căn cứ.

## Risk Assessment
- **AI chưa chạy được đến khi An gỡ hai chỗ chặn.** Giảm thiểu: chữ quy tắc v2 ra trước và là đường dự phòng vĩnh viễn.
- Trần ngày 50.000đ chỉ đủ 25–50 lá số → phần lớn khách thấy chữ quy tắc v2; đo tỉ lệ rơi, quyết nâng trần theo số liệu (R2).
- Chờ 40–90 giây → hiện bản quy tắc trước, thay khi AI xong; nếu JSON hỏng >10% hoặc p95 >60 giây thì chuyển 2 lần gọi song song (cần sửa FD-109a).
- "Nghĩa gượng" mà cổng không bắt được → mắt anh ở bước chấm và nút "Đúng / Một phần / Không đúng" theo từng nhận định.
- Kho tri thức V4.1 không phủ sao phụ trang trí → bỏ sao thiếu thẻ khỏi dữ kiện, không bịa.
- Giá Google tăng gấp đôi từ 01/01/2027 → giá FD-114 hết hiệu lực; An đổi bảng giá và trần theo mức mới, báo anh khi chi phí/lá số vượt 2.000đ.

## Trang HTML duyệt
`chu-mien-phi-v2.html`. Anh làm gì: (1) duyệt thẻ nghĩa các sao chính; (2) xem 3 lá số mẫu chữ cũ cạnh chữ mới, sửa chữ trực tiếp hoặc bình luận từng đoạn; (3) chấm 1–5 theo bốn tiêu chí cho 5 bài, đánh dấu "câu sai sự thật" và "câu ngại gửi khách"; (4) chọn giọng văn (ấm áp gần gũi / gọn rõ như người tư vấn).
