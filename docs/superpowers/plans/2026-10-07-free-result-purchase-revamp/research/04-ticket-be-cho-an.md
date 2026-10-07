# 04 — Ticket backend và engine cho An (soạn sẵn, chưa tạo trên Kaneo)

Ngày: 07/10/2026. Nguồn: ba bản nghiên cứu cùng thư mục (`01-dai-san-pham-va-vong-thoi-gian.md`, `02-he-thong-ai-viet-chu.md`, `03-tab-hinh-anh-nut-bam.md`), plan `plan.md`, FD-117.

Cách dùng: mỗi mục dưới đây là một ticket (hoặc một nhóm ticket) trong dự án Kaneo "La so viet" (workspace "Cash Cow"). Claude **không** gọi Kaneo; Lãm hoặc người điều phối tạo ticket sau khi anh duyệt GĐ1. Mã `BE-Px-n` là mã trong tài liệu này, không phải mã Kaneo.

Quy tắc chung:
- Một việc một nhánh ngắn, PR vào `master`, test xanh, An hoặc Lãm duyệt mới merge (FD-097). Không đẩy thẳng lên `master`.
- Không đổi luồng tiền, ví, đơn nạp, khấu trừ 7 ngày, SePay, email thật. **Ngoại lệ duy nhất:** BE-P0-1 (tham số hoá năm).
- Không chuyển Kaneo sang Done nếu chưa có bằng chứng đã phát hành và kiểm tra trên trang thật.
- Cột "Chờ" ghi quyết định vòng 2 (R1–R13) mà việc đó phụ thuộc; "—" nghĩa là làm được ngay.

## Tóm tắt thứ tự

| Mức | Mục | Chờ |
|---|---|---|
| **P0** (làm ngay, không cần quyết định kinh doanh; hạn chót thực tế: Tết 06/02/2027) | BE-P0-1 năm tham số; BE-P0-2 tính năm khác; BE-P0-3 ranh giới năm; BE-P0-4 tháng hạn; BE-P0-5 `daily.headline`; BE-P0-6 chữ quy tắc v2; BE-P0-7 danh sách chặng; BE-P0-8 dữ liệu cho giao diện | BE-P0-4: mặc định bỏ, chờ R4 để chốt |
| **P1** | BE-P1-1 gỡ chặn AI; BE-P1-2 hợp đồng + dữ kiện + writer AI; BE-P1-3 cổng chất lượng; BE-P1-4 bộ chạy thử; BE-P1-5 chặn tiền và giá; BE-P1-6 Chặng 10 năm; BE-P1-7 đợt 20 bài; BE-P1-8 Combo tham số; BE-P1-9 API dữ kiện theo người | R1, R2, R3, R7, R9 |
| **P2** | BE-P2-1 Cục/Mệnh chủ/nạp âm; BE-P2-2 cung lưu niên từng năm trong chặng; BE-P2-3 tháng sau; BE-P2-4 gói cặp; BE-P2-5 dọn hai danh mục; BE-P2-6 lưu Hoá đại vận/lưu niên; BE-P2-7 tiểu hạn; BE-P2-8 Hội viên; BE-P2-9 chủ đề mới; BE-P2-10 Hợp đôi/Bát Tự | R8, R10, R11, R12, R13 |

---

## P0 — Làm ngay

### BE-P0-1 — Tham số hoá "Vận hạn năm 2026" thành "Vận hạn năm [Y]" (ưu tiên cao nhất)
**Vì sao:** SKU, backend (4 chỗ), trigger cơ sở dữ liệu và thẻ giao diện đều cứng năm 2026. Sau Tết 06/02/2027 (hôm nay còn khoảng 4 tháng) sản phẩm không bán được dù mở khoá. Combo cũng bị trigger DB chặn ở 2026.
**Việc:**
- Chọn một: (i) SKU sinh theo năm `ZIWEI-YEAR-{Y}-P0`, hoặc (ii) một SKU `ZIWEI-YEAR-P0` + `period_key = Y`. (ii) gọn hơn và tránh phải thêm SKU mỗi năm; An chọn và ghi vào PR.
- Sửa 4 chỗ kiểm tra `deriveReportTimingLineage(now).targetYear !== 2026` trong `wallet-unlock.service.ts` (dòng 581, 648, 814, 1002).
- Sửa `purchasePeriodKey` cố định "2026" trong `period-report-config.ts`.
- **Migration mới** (không sửa 0054 đã chạy) gỡ ràng buộc 2026 khỏi trigger combo (`0054_combo_entitlement_authority.sql:19-23`).
- Sửa `han-month-reminder.service.ts` (dòng 26, 79) kiểm tra đúng SKU 2026.
- Sửa enum SKU, báo giá, hoàn Lá, `commerce.ts` (157-158, 246-250), `la-catalog.ts` (235-251, 320-345).
- Sửa `ziwei-free-result-model.ts:141` (suy ra SKU năm động nhưng danh mục không có nên rơi về Trọn đời).
- Cho phép mua **năm hiện tại và năm kế** (khoảng nằm trong cấu hình).
- Tên khách thấy: "Vận hạn năm [Y] của bạn" (không còn "2026").
**Files:** `packages/contracts/src/la-catalog.ts`, `.../commerce.ts`, `period-report-config.ts`, `packages/backend/.../wallet-unlock.service.ts`, `han-month-reminder.service.ts`, `packages/database/drizzle/0054_combo_entitlement_authority.sql` (chỉ đọc) + migration mới, `apps/web/src/features/reports/offer-ladder.tsx:15` (phối hợp FE), `apps/web/src/features/ziwei/ziwei-free-result-model.ts:141`.
**Tiêu chí nghiệm thu:**
- [ ] Không còn chuỗi "2026" cứng trong SKU, kiểm tra mua, khoá kỳ, trigger, nhắc hạn (grep sạch).
- [ ] Test mua/đọc/hoàn Lá cho năm Y và Y+1 đạt; năm ngoài khoảng cho phép bị từ chối đúng mã lỗi.
- [ ] Test qua ranh giới Tết (phụ thuộc BE-P0-3).
- [ ] Combo (khi bật) không bị trigger chặn ở năm ≠ 2026.
- [ ] Phát hành riêng, trước FE; theo dõi sau phát hành; không đổi giá FD-105.
**Chờ:** — (khoảng cho phép mua mặc định = năm hiện tại và năm kế; gói cặp ở BE-P2-4).

### BE-P0-2 — `calculateZiweiHoroscope` đúng cho năm khác năm hiện tại (B2)
**Vì sao:** `targetYear` chỉ đổi 12 tháng, còn cung lưu niên, can chi, chặng vẫn lấy theo `asOfDate`; nhãn nói năm khác mà cung vẫn của năm nay. Phải đúng trước khi bán "năm sau" hoặc chạy đợt 20 bài của Năm.
**Việc:** tính cung lưu niên, can chi, chặng theo `targetYear` (ví dụ `horoscope("${targetYear}-07-01")` như `period-reading-facts.ts:29`).
**Files:** `packages/engine-adapters/src/ziwei/iztro-horoscope.ts:184-199`; test mới.
**Tiêu chí nghiệm thu:**
- [ ] Test 7 lá số tổng hợp của `01-dai-san-pham-va-vong-thoi-gian.md` mục 4.2 × năm 2026, 2027, 2030, 2035 khớp bảng chạy thử (chặng, cung chặng, cung lưu niên).
- [ ] Kết quả cho **năm hiện tại** không đổi so với trước (test hồi quy).
**Chờ:** —

### BE-P0-3 — Thống nhất ranh giới năm (dương/âm) (B3)
**Vì sao:** backend lấy năm theo lịch dương (1/1), engine đổi năm ở Tết. Từ 01/01 đến 05/02/2027 báo cáo "2027" dùng lưu niên Bính Ngọ.
**Việc:** dùng năm âm lịch (Tết) làm khoá năm, hoặc ghi rõ và xử lý 01/01–05/02; kiểm tra `deriveReportTimingLineage`, khoá mua, nhãn, nội dung báo cáo.
**Files:** `packages/backend/src/reports/identity-report-config.ts:366-381`, `period-reading-facts.ts:16-19`, `period-purchase-key.ts`.
**Tiêu chí nghiệm thu:**
- [ ] Test ngày 2027-01-15 → Bính Ngọ; 2027-02-05 → Bính Ngọ; 2027-02-06 → Đinh Mùi, thống nhất ở mọi lớp (nhãn, khoá, báo cáo).
- [ ] Khoá mua năm Y không đổi nghĩa giữa lúc mua và lúc đọc.
**Chờ:** —

### BE-P0-4 — Tháng "cần chú ý" không bị ép; một định nghĩa "tháng hạn" (B1)
**Vì sao:** khi không có tháng nào đạt điều kiện, code tự đặt tháng 7 thành "cần chú ý" (chủ đề tiền bạc). Bản trả phí dùng định nghĩa khác (Hoá Kỵ lưu nguyệt) nên hai nơi có thể nói khác nhau; đụng nguyên tắc claim bám engine (FD-089).
**Việc:** bỏ đoạn ép; dùng chung định nghĩa với `period-reading-facts.ts:41-46` (`obstacleStarIds`); `hanMonthCount` chỉ đếm tháng thật; nếu 0 tháng → nói "0 tháng cần chú ý" hoặc bỏ câu số (FE xử lý chữ). Nếu R4 = "giữ", thêm cờ `forced: true` và để chữ AI/số chỉ đếm tháng thật.
**Files:** `packages/engine-adapters/src/ziwei/iztro-horoscope.ts:315-330, 341`; `apps/web/src/features/ziwei/ziwei-free-result-model.ts:141-145`.
**Tiêu chí nghiệm thu:**
- [ ] Không còn tháng nào bị ép; test cùng đầu vào ra cùng kết quả.
- [ ] Chạy 200 lá số tổng hợp: báo tỉ lệ lá số có 0 tháng cần chú ý.
- [ ] Trang miễn phí và bản mua cùng một định nghĩa (test đối chiếu).
**Chờ:** R4 (mặc định = bỏ; An có thể làm ngay theo mặc định, chốt khi anh trả lời).

### BE-P0-5 — Sửa `daily.headline` nhắc Hội viên đang ẩn
**Vì sao:** câu kết "Mở mỗi sáng trong gói Hội viên" nhưng Hội viên đang ẩn.
**Việc:** bỏ câu đó (hoặc chỉ hiện khi Hội viên đang bán, đọc từ danh mục).
**Files:** `packages/engine-adapters/src/ziwei/iztro-horoscope.ts:387`.
**Tiêu chí nghiệm thu:** [ ] `daily.headline` không chứa chữ "Hội viên" khi Hội viên đang giữ; test.
**Chờ:** —

### BE-P0-6 — Thư viện thẻ nghĩa + chữ quy tắc v2 (GĐ3, ra trước AI)
**Vì sao:** chữ miễn phí hiện khô (ghép câu mẫu, chỉ 14 chính tinh, in công thức vào bài, lặp câu phủ nhận, Nên làm/Nên tránh giống nhau theo cung). Chữ quy tắc v2 cũng là đường dự phòng vĩnh viễn của AI nên phải ra trước và không bị chặn.
**Việc:**
- Tạo `content/knowledge/vi/ziwei/free-reading-cards.v1.json` (14 chính tinh, 12 cung, 4 Hoá, ~18 sao phụ, 6 quan hệ; mỗi thẻ có `sourcePassageIds`) + `scripts/build-free-reading-cards.mjs` + bộ kiểm cấu trúc thẻ. Soạn nội dung cùng Claude (Sonnet); anh duyệt thẻ.
- Sửa `compileFreeStructuralOverview`/`compileFreeStructuralPalace` theo khung 6 phần, thân bài không công thức (công thức chỉ ở hộp "Điểm này tính thế nào"), một câu thận trọng cuối bài, Nên làm/Nên tránh theo bộ sao + độ sáng, đoạn năm nay 2 câu thật + câu cắt dựng theo khuôn `shown/clip`.
- Dòng đọc thử cho 11 cung + 2 chủ đề (1–2 câu thật, riêng lá số, không lộ nội dung trả phí).
- Căn cứ của nhánh quy tắc = chuỗi `chain` dựng từ thẻ.
- Tăng `FREE_OVERVIEW_RENDERER_VERSION`; lá số cũ ghép lại bằng v2 khi xem lần sau (không tốn AI).
**Files:** `packages/backend/src/ziwei/free-structural-overview.ts`, `free-structural-overview-cache.ts`, `packages/contracts/src/free-structural-overview-v1.ts`, `ziwei-star-meanings-v1.ts`, `free-copy-quality.ts` (mới), `apps/web/src/features/ziwei/ziwei-free-result-model.ts`.
**Tiêu chí nghiệm thu:**
- [ ] 200/200 lá số tổng hợp qua bộ kiểm chữ (độ dài 900–1.300 âm tiết; mỗi đoạn có tên sao/cung riêng; tối đa 1 câu thận trọng; không từ cấm; không số công thức trong thân bài; không lặp câu giữa các cung).
- [ ] Cùng lá số ra cùng chữ; thời gian ghép <50ms; 0 lượt gọi AI.
- [ ] Không chữ trả phí lọt vào dòng đọc thử (test như LSV-75).
- [ ] Có tiếng Anh tương đương.
**Chờ:** — (anh duyệt thẻ nghĩa và giọng ở GĐ3).

### BE-P0-7 — Danh sách đủ các chặng đại vận ra trang miễn phí (BE-1)
**Vì sao:** trang miễn phí chỉ nhận chặng hiện tại; "Đường đời 10 năm" (Q8) cần đủ chặng.
**Việc:** thêm `decadalCycles[]` (thứ tự, tuổi bắt đầu/kết thúc, năm bắt đầu/kết thúc, cung) vào `ZiweiHoroscopeResultV1` bằng `astrolabe.decadalList()` (đã dùng ở `iztro-horoscope.ts:406`). **Không** dùng `deriveDecadalCycles` (trả rỗng ở chặng đầu hoặc thứ 7 vì chiều thuận/nghịch mơ hồ). Chặng "chưa bắt đầu" có trạng thái riêng.
**Files:** `packages/contracts/src/ziwei-horoscope-v1.ts:67-78`, `packages/engine-adapters/src/ziwei/iztro-horoscope.ts:405-417`; test.
**Tiêu chí nghiệm thu:**
- [ ] Test 7 lá số: đủ chặng, đúng tuổi/năm/cung (khớp bảng chạy thử mục 4.2 nghiên cứu 01); nam và nữ cùng ngày sinh ra chặng khác.
- [ ] Xác nhận `decadalList()` trả đủ số chặng cần cho tuổi tới ~95; ghi giới hạn nếu khác.
**Chờ:** —

### BE-P0-8 — Dữ liệu cho giao diện (không đổi hành vi hiện có)
**Việc (gộp vì cùng chạm hợp đồng dữ liệu):**
- `evidence { palaceIds, starIds }` cho từng mục bài tổng quan (BE-4 nghiên cứu 03).
- Danh sách 12 tháng (chỉ `marker` và số tháng, tháng cần chú ý vẫn che nội dung) trong dữ liệu trang miễn phí; không dùng câu chuẩn bị mẫu cho tháng thuận/trung tính.
- Cung đại vận, cung lưu niên vào `FreeResultModel` (đã có trong horoscope, chưa ra model).
- Công thức điểm chặng ghi vào tracker khi anh duyệt (đã có FD-117; BE-5: ghi rõ điểm chặng = điểm cấu trúc đã công bố của cung chặng đi qua; giao diện chỉ dùng hàm đã duyệt, không tính lại).
**Files:** `packages/contracts/src/free-structural-overview-v1.ts:4-9`, `packages/backend/src/ziwei/free-structural-overview.ts`, `packages/contracts/src/ziwei-horoscope-v1.ts`, `iztro-horoscope.ts:196-313`, `apps/web/src/features/ziwei/ziwei-free-result-model.ts`.
**Tiêu chí nghiệm thu:**
- [ ] Mỗi mục tổng quan có `evidence` đúng sao/cung; test.
- [ ] 12 tháng ra đúng số lượng, tháng cần chú ý không lộ nội dung.
- [ ] Không rò chữ trả phí; DTO không gửi khoá thô/hash.
**Chờ:** BE-P0-4 (cách đếm tháng cần chú ý), R5 (có hiện vị trí tháng cần chú ý không; mặc định có).

---

## P1

### BE-P1-1 — Gỡ hai điều chặn để AI miễn phí chạy được
**Vì sao:** (a) `NO_REVIEWED_TOKEN_BOUND_PROOF = () => null` → mọi yêu cầu dừng ở `unproven_bound`; (b) bộ nối 9router + Gemini luôn trả `tokensUnknown` → không tính được tiền, writer luôn `usage_unknown`. Thời gian chờ dài nên bắt đầu sớm.
**Việc:**
- (a) Chứng minh giới hạn token: đầu vào chính xác + trần đầu ra do nhà cung cấp thực thi. Với model có "thinking", `max_tokens` có thể không chặn tổng; hướng: tắt hoặc ép "thinking" thấp qua tham số chuẩn của tuyến Gemini (thử trên 9router), đo bằng `countTokens`, chứng minh bằng thử nghiệm ngưỡng; hoặc bộ nối riêng gọi thẳng API Gemini.
- (b) Có đường lấy usage đáng tin (gọi thẳng API Gemini, hoặc xác minh 9router giữ đủ `usageMetadata`).
**Files:** `apps/api/src/free-palace-composition.ts:16`, `packages/backend/src/ai/openai-compatible-adapter.ts`, `free-palace-cost-context.ts`; `plan/2026-10-06-lsv68-api-reference-pricing.md` (mục Remaining execution gate).
**Tiêu chí nghiệm thu:**
- [ ] Bằng chứng giới hạn token được duyệt (có test ngưỡng); yêu cầu không còn kết thúc `unproven_bound`.
- [ ] Usage thật trả về, writer ghi số token thật; `usage_unknown` chỉ còn là nhánh lỗi hiếm.
**Chờ:** R2 (anh duyệt phạm vi tiền AI mới trước khi bật thật). Có thể làm kỹ thuật trước, chưa bật.

### BE-P1-2 — Hợp đồng, dữ kiện, writer AI một lần gọi
**Việc:**
- `packages/contracts/src/free-reading-v2.ts`: `FreeReadingContentV2Schema` (theo schema mục 3.4 nghiên cứu 02), `FreeReadingFactV2Schema`, `FreeReadingViewV2Schema`, `FreeReadingFrozenCallV2Schema`.
- `free-reading-facts.ts`: dựng dữ kiện thuần, tất định (khoá dẫn chứng `palace:<p>:star:<s>`, `hoa:<s>`, `time:decadal`…; "điều hiếm"; chọn thẻ); **không** đưa tên, ngày/giờ/nơi sinh, `chart_id`, điểm số, nội dung trả phí.
- `free-reading-writer.ts` (khuôn `free-palace-writer.ts`): `free-reading-prompt-v2.0`, system prompt = mục 3.1 nghiên cứu 02 (sau khi anh duyệt giọng) với khối giọng v4.2; cấu hình cấm từ mới `config/ziwei-free-reading-quality.v1.json` (tách khỏi báo cáo trả phí, xử lý mâu thuẫn "tài lộc").
- Đúng **một lần gọi**; không thử lại; khối rớt cổng dùng chữ quy tắc v2; `max_output` 10.000, `max_input` 16.000 (đo lại theo p99 sau 20 lần chạy).
- Lưu: bảng artifact mới (migration kế tiếp sau `0061_free_structural_overview_cache.sql`), `section_status` từng khối `ai|rule_v2`, lineage 4 phiên bản, xoá theo 24 giờ và khi xoá dữ liệu.
- Đọc: `FreePalaceReadService` thêm đường đọc gói v2; DTO an toàn.
- Cờ `FREE_READING_V2_ENABLED`; bật theo thứ tự: tài khoản đã xác minh → khách đã tương tác.
**Files:** theo mục H nghiên cứu 02: `free-palace-request.service.ts`, `free-palace-selection.ts`, `free-palace-artifact.repository.ts`, `free-palace-read.service.ts`, `free-palace-runner.ts`, `packages/database/drizzle/00xx_free_reading_v2.sql`.
**Tiêu chí nghiệm thu:**
- [ ] Test ảnh chụp prompt cho 3 lá số mẫu; test "không có tên/ngày sinh trong prompt".
- [ ] Đúng một lần gọi (lần begin thứ hai bị từ chối); usage không rõ → giữ nguyên số giữ chỗ, không công bố, không gọi lại.
- [ ] Khối rớt cổng chỉ khối đó dùng chữ quy tắc; `sourceKind` từng khối đúng.
- [ ] Hết trần ngày hoặc không rõ giá → không gọi AI, khách thấy chữ quy tắc ngay.
- [ ] Phần sau của câu cắt giữa câu **không tồn tại ở bất kỳ nơi nào** (không sinh, không lưu).
**Chờ:** R2, R3 (tiếng Anh, tên, "tôi", từ cấm).

### BE-P1-3 — Cổng chất lượng `free-reading-quality.ts`
**Việc:** hàm thuần theo bảng mã lỗi mục E nghiên cứu 02: chặn cứng (`schema_invalid`, `length_block`, `key_unresolved`, `invented_element`, `brightness_mismatch`, `placement_mismatch`, `hoa_mismatch`, `uncomputed_number`, `uncomputed_date`, `formula_leak`, `pattern_claim`, `locale_integrity`, `content_line`, `forbidden_self_ref`, `caveat_count`, `teaser_leak`, `teaser_overlap`, `hook_shape`, `basis_generic`, `star_density`, `banned_phrase`…) và cảnh báo mềm (`sentence_shape`, `noun_stack`, `repeat_opening`, `hedge_density`, `person_ratio`, `hanviet_rare`, `term_gloss`, `distinct_openings`). Export `PROHIBITED`, `DATE_PATTERNS`, `CANONICAL_ID` từ `free-palace-quality.ts`.
**Files:** `packages/backend/src/ziwei/free-reading-quality.ts`, `free-palace-quality.ts`, `config/ziwei-free-reading-quality.v1.json`.
**Tiêu chí nghiệm thu:**
- [ ] Mỗi mã lỗi có ít nhất một cặp test văn bản tốt/xấu viết tay (gồm các ví dụ ở mục 2 nghiên cứu 02).
- [ ] `brightness_mismatch`, `placement_mismatch`, `hoa_mismatch` có test lấy các câu thật mô hình từng sinh sai.
- [ ] Chặn theo khối (một khối rớt không làm rớt khối khác).
**Chờ:** R3 (danh sách từ cấm riêng).

### BE-P1-4 — Bộ chạy thử 30 lá số
**Việc:** `scripts/eval-free-reading.mjs` (khuôn `generate-ziwei-quality-samples.mjs` và `native-campaign-*`): vào danh sách lá số tổng hợp (`packages/test-fixtures/ziwei`), ra JSON từng lần chạy (hash prompt, usage thật, tiền, mã lỗi cổng) + bảng tổng; trần tiền riêng (đề xuất ≤180.000đ cho 3 vòng, R2); dừng khi chạm trần; đếm token trước khi gọi để hiệu chỉnh 1,7 token/âm tiết; xuất 10 nhận định ngẫu nhiên/bài để đối chiếu tay. Claude dựng trang `chu-mien-phi-v2.html` từ JSON này.
**Tiêu chí nghiệm thu:**
- [ ] Chạy đủ 30 lá số, một lần gọi mỗi lá số mỗi vòng, không vượt trần.
- [ ] ≥27/30 qua chặn cứng ngay lần đầu; chi phí đo thật ≤3.000đ ở p99; độ trễ p95 báo cáo.
- [ ] Độ trùng giữa hai lá số khác nhau ≤35% cụm 5 từ giống (ngoài phần trích thẻ nghĩa).
**Chờ:** R2 (ngân sách thử).

### BE-P1-5 — Bộ chặn tiền và bảng giá AI
**Vì sao:** giá chạy thật trong DB (migration 0044: 39.165/195.825 đồng mỗi triệu token) gấp đôi FD-114 (19.582/97.912). Bộ chặn tiền đọc bảng giá DB nên phải qua được giá đắt hơn. Giá Google từ 01/01/2027 tăng gấp đôi.
**Việc:** theo quyết định R2: bộ chặn tiền dùng giá tham chiếu FD-114 (đề xuất); cập nhật bảng giá hoặc cấu hình tham chiếu cho khớp, ghi nguồn/phiên bản/hiệu lực; không tăng `max_tokens`, không bật "thinking" dài; số giữ chỗ = 16.000 × giá vào + 10.000 × giá ra (≈1.292đ theo FD-114, ≈2.585đ theo giá DB); từ chối nếu >3.000đ. Báo anh khi chi phí/lá số đo thật vượt 2.000đ hoặc khi giá Google đổi.
**Files:** `packages/database/drizzle/0044_ai_model_pricing_9router_gemini_flash.sql` (chỉ đọc) + migration mới nếu đổi, `free-palace-runner.ts` (đọc `aiModelPricing`), `scripts/lib/native-campaign-api-pricing.mjs`.
**Tiêu chí nghiệm thu:**
- [ ] Bộ chặn tiền dùng đúng bảng giá đã chọn; test số giữ chỗ theo cả hai bảng giá.
- [ ] Ghi chú nguồn giá và hiệu lực trong PR.
**Chờ:** R2.

### BE-P1-6 — Sản phẩm "Chặng [a–b] tuổi của bạn" (SKU, writer, cổng) (B5)
**Việc:**
- SKU mới (vd `ZIWEI-DECADE-P0`, `period_key` = chặng hiện tại hoặc kế tiếp); contract `ziwei-decadal-reading-v1` (tái dùng `ZiweiTopicDecadalTiming*` và đoạn `currentDecadal` nếu hợp).
- Writer + cổng theo mẫu `period-reading-writer.ts` và `topic-deep-dive-quality-v4.ts`; facts từ `decadalList()`; trạng thái "chưa bắt đầu" không bán; cổng thêm "không bịa năm/tuổi ngoài khoảng chặng" (giống `UNCOMPUTED_YEAR` ở `period-reading-writer.ts:27`).
- Mua/đọc/hoàn Lá theo khuôn các món khác; giá 360 Lá (đề xuất, chờ R7).
**Files:** mới `packages/backend/src/reports/decadal-reading-writer.ts`, `decadal-report-config.ts`, `packages/contracts/src/ziwei-decadal-reading-v1.ts`, `la-catalog.ts`, `wallet-unlock.service.ts`.
**Tiêu chí nghiệm thu:**
- [ ] Cổng FD-077 + FD-089 + test không bịa năm/tuổi ngoài chặng.
- [ ] Test mua/đọc/hoàn Lá; 7 lá số cho đúng chặng hiện tại và kế.
- [ ] 20 bài thật liên tiếp đạt (BE-P1-7) trước khi `availability: "active"`.
**Chờ:** R7 (giá/phạm vi), R1 (ngân sách đợt). Phụ thuộc BE-P0-2, BE-P0-7.

### BE-P1-7 — Đợt chất lượng 20 bài thật cho các món mới (B10)
**Việc:** chạy đợt 20 bài liên tiếp cho từng món, thứ tự **Năm → Chặng → Tình duyên và Công việc → Tháng**; dừng ngay ở lần lỗi đầu; trần riêng mỗi đợt; dùng `scripts/verify-topic-deep-dive-real-generations.mjs`, `verify-period-reading-real-generations.mjs`, hạ tầng `native-campaign-*`. Xuất 5 bài mẫu cho trang `mau-bai-<mon>.html`. Bật món bằng cách đổi `availability` trong danh mục chỉ sau khi đạt và anh duyệt mẫu.
**Tiêu chí nghiệm thu:**
- [ ] 20/20 đạt cổng; chi phí đợt ≤ trần đã duyệt; kết quả lưu trên Kaneo.
- [ ] Phải **sau** BE-P0-2, BE-P0-3, BE-P0-4 (kiểm trên dữ kiện đúng) và BE-P0-1 (cho Năm).
**Chờ:** R1.

### BE-P1-8 — Combo tham số "Trọn đời + Năm [Y]"
**Việc:** đổi nghĩa Combo thành Trọn đời + Năm [Y] (tham số, giữ 1.300 Lá); migration mới cho trigger; chỉ bật khi cả hai thành phần Active; test mua hai quyền lợi, phát lại, hoàn.
**Files:** `la-catalog.ts`, `wallet-unlock.service.ts`, migration mới, `0054_combo_entitlement_authority.sql` (chỉ đọc).
**Tiêu chí nghiệm thu:** [ ] test mua/phát lại/hoàn đạt; [ ] không còn gắn 2026; [ ] không bật khi Năm chưa đạt.
**Chờ:** R9 (đổi nghĩa và giá), BE-P0-1, BE-P1-7 (Năm đạt).

### BE-P1-9 — API "dữ kiện theo người" cho dải sản phẩm (B6)
**Việc:** API chỉ đọc trả cho từng lá số: năm âm lịch hiện tại Y, số tháng âm lịch còn lại của năm, chặng hiện tại [a–b], năm thứ k trong chặng, R = 10 − k, cung lưu niên Y và Y+1, cung chặng kế, cờ giờ sinh tạm tính. Giao diện dùng để chọn thẻ đầu (bảng 4.4 nghiên cứu 01).
**Files:** mới trong `ziwei-query.service.ts` (hoặc facts API).
**Tiêu chí nghiệm thu:** [ ] test 7 lá số mục 4.2; [ ] không đổi luồng tiền; [ ] giờ sinh chưa chắc → cờ tạm tính.
**Chờ:** R8 (ngưỡng "năm gần hết"; mặc định ≤3 tháng âm lịch còn lại). Phụ thuộc BE-P0-2, BE-P0-3, BE-P0-7.

---

## P2

### BE-P2-1 — Cục, Mệnh chủ, Thân chủ, nạp âm, âm dương thuận nghịch (BE-6)
Ánh xạ trong engine để giao diện in giữa lá số (người quen xem Tử Vi hay tìm). **Files:** `packages/engine-adapters/src/ziwei/iztro-mapping.ts`, `packages/contracts/src/normalized-ziwei-chart-v1.ts`. **Nghiệm thu:** [ ] test 7 lá số khớp iztro; [ ] không đổi kết quả hiện có. **Chờ:** R13.

### BE-P2-2 — Cung lưu niên từng năm trong chặng (BE-7)
Xác nhận cung theo địa chi của năm khớp `yearly.index` của iztro; xuất ra cho dải "10 năm của chặng này". **Files:** `iztro-horoscope.ts`. **Nghiệm thu:** [ ] test 7 lá số × 10 năm. **Chờ:** —

### BE-P2-3 — Cho mua "tháng sau" (B7)
Hiện writer tháng lọc đúng tháng âm lịch của `asOfDate`. **Files:** `period-reading-facts.ts:26-27`, `period-report-config.ts:6-8`. **Nghiệm thu:** [ ] mua/đọc/hoàn tháng kế; [ ] qua tháng nhuận (2 nửa). **Chờ:** Tháng qua cổng (BE-P1-7); mặc định làm sau.

### BE-P2-4 — Gói cặp "Năm nay + Năm sau" 780 Lá
Một SKU gộp hai kỳ năm (mua lẻ 960, tiết kiệm 180). **Nghiệm thu:** [ ] mua một lần ra hai quyền lợi; phát lại; hoàn theo luật FD-105. **Chờ:** R8; Năm đạt (BE-P1-7).

### BE-P2-5 — Dọn hai danh mục (B9)
`config/product-catalog.json` còn giá VND cũ (Trọn đời 79.000đ…) và `purchase-offer-presentation.ts:143` vẫn có "79.000 ₫"; giá thật nằm ở `la-catalog.ts`. Quyết bỏ hay giữ làm tham chiếu. **Nghiệm thu:** [ ] chỉ còn một nguồn giá bán. **Chờ:** —

### BE-P2-6 — Xuất lưu Hoá (lưu niên, đại vận) ra `ZiweiHoroscopeResultV1`
`yearly.mutagen` đang dùng nội bộ nhưng không xuất; kiểm `decadal.mutagen`. Khi có, đoạn Năm nay có neo thật ("lưu Hoá Kỵ nhập cung Tài Bạch"). **Files:** `iztro-horoscope.ts`, `ziwei-horoscope-v1.ts`. **Nghiệm thu:** [ ] test; [ ] chỉ thêm trường tuỳ chọn. **Chờ:** —

### BE-P2-7 — Tầng "tiểu hạn" (nhịp từng tuổi)
Engine có `age` nhưng ta không dùng. Làm dữ kiện thêm cho Năm/Chặng nếu anh muốn. **Chờ:** R12 (mặc định để sau).

### BE-P2-8 — Hội viên: đặc tả một công cụ trả phí (B12)
Viết đặc tả **một** công cụ: đầu vào → dữ kiện từ engine → đầu ra → giới hạn/hạn dùng → đồng ý/xoá dữ liệu; chỉ mở bán khi quyền lợi có thật. Gợi ý: chọn ngày/lịch dẫn vào "Hôm nay". **Chờ:** R10 (mặc định giữ ẩn).

### BE-P2-9 — Chủ đề mới
Thêm cấu hình cung chính/cung phụ như `TOPIC_PALACE_SCOPES` (`ziwei-topic-deep-dive-v1.ts:28-62`), prompt, cổng, 20 bài mỗi chủ đề. **Chờ:** R12; sau khi hai chủ đề đầu qua cổng.

### BE-P2-10 — Hợp đôi, Bát Tự, Tây phương
Cần engine Bát Tự (chuẩn hoá, adapter, lưu, bằng chứng), luật đồng ý của người thứ hai, writer hợp đôi; **không làm bản Tử Vi-only** (OD-005). Hiện `packages/engine-adapters/src` chỉ có `ziwei/`. **Chờ:** R11 (mặc định hoãn).

---

## Ghi chú cho người tạo ticket
- Ticket P0 tạo ngay sau khi anh duyệt GĐ1 (hoặc ngay bây giờ nếu Lãm cho phép; các mục P0 không chờ quyết định kinh doanh, trừ BE-P0-4 chỉ cần xác nhận mặc định "bỏ").
- Gắn nhãn Kaneo: `plan:free-result-purchase-revamp`, mức P0/P1/P2, GĐ tương ứng (GĐ2, GĐ3, GĐ4, GĐ5, GĐ6).
- Mỗi ticket ghi rõ file, tiêu chí nghiệm thu như trên, và dòng "Chờ" để người nhận biết có thể làm ngay hay không.
- Ngân sách tiền AI (R1, R2) và FD-116 "không hỏi lại API/mô hình/giá": các câu R1, R2 là phạm vi **mới** (đợt thử các món mới và AI viết cả bài miễn phí); không phải hỏi lại cấu hình API cũ. Nếu anh nói không muốn bàn thêm về tiền AI, dùng đề xuất mặc định (giữ trần 3.000đ/lá số, 50.000đ/ngày; bộ chặn dùng giá FD-114).
