# 04 — Backlog backend và engine cho An (bản chính thức sau vòng 2, FD-118)

Ngày: 08/10/2026. Thay thế bản 07/10. Nguồn: `plan.md`, ba bản nghiên cứu 01–03, `05-chu-de-moi-tu-seo.md`, FD-117, **FD-118** (anh trả lời R1–R13 ngày 08/10).

## Cách dùng

- Mỗi mục `### BE-Px-n` là **một ticket Kaneo** (dự án "La so viet", workspace "Cash Cow"). Có thể dán nguyên mục vào mô tả ticket: tiêu đề, ưu tiên, vì sao, việc, file, nghiệm thu, phụ thuộc. Viết tiếng Việt thường, kèm chi tiết kỹ thuật cho An.
- Claude **không** gọi Kaneo. Lãm hoặc người điều phối tạo ticket.
- Mã `BE-Px-n` là mã trong tài liệu này, không phải mã Kaneo. Gắn nhãn Kaneo: `plan:free-result-purchase-revamp`, mức P0/P1/P2, giai đoạn (GĐ2…GĐ6).
- Phân công (quy tắc của anh, FD-118): **mọi mã backend/engine = ticket cho An; giao diện (UX/UI) = anh + Claude.** Sonnet viết, Opus review.

## Quy tắc chung cho mọi ticket

1. Một việc một nhánh ngắn, PR vào `master`, test xanh, An hoặc Lãm duyệt mới merge (FD-097). Không đẩy thẳng `master`. Commit tiếng Anh dạng conventional commits.
2. Không đổi luồng tiền, ví, đơn nạp, khấu trừ 7 ngày, SePay, email gửi khách. **Ngoại lệ:** tham số hoá năm (BE-P0-1) và các SKU mới (có migration mới + test mua/đọc/hoàn Lá).
3. **Cổng chất lượng mới (FD-118, thay luật "20 bài thật đạt liên tiếp" của FD-082/FD-112 cho đợt này):** mỗi món chỉ cần
   - (a) **kiểm tự động**: test đơn vị + chạy cổng FD-077/FD-089 trên 7 lá số tổng hợp (`packages/test-fixtures/ziwei`) × các năm cần thiết, và cổng chạy tự động trên **mỗi bài sinh ra** khi đang bán;
   - (b) **2–3 bài thử tay** do anh và đồng nghiệp tự bấm mua/đọc trên môi trường thật (trừ Lá thử), gửi ảnh chụp cho Claude chấm; bằng chứng ghi trên ticket.
   Không còn "đợt 20 bài" và trần tiền theo đợt. Bật món bằng cách đổi `availability` trong danh mục; giao diện tự hiện thẻ.
4. Không chuyển Kaneo sang Done nếu chưa có bằng chứng đã phát hành và đã kiểm tra trên trang thật (CLAUDE.md).
5. Quy tắc nội dung (FD-118): cấm cứng **chỉ** (i) điều luật Việt Nam cấm và (ii) câu sai sự thật về lá số (sao/cung/độ sáng/Hoá/vị trí/ngày không do engine tính). Danh sách cụm từ/văn phong chỉ là **cảnh báo mềm**, không chặn bài. Các chủ đề FD-075 (cái chết, tuổi thọ, chẩn đoán bệnh cụ thể, cúng bái/giải hạn, xổ số) giữ nguyên cho tới khi **kiểm tra pháp lý nội dung** (mục "Việc của anh" cuối tài liệu) cho biết luật thực sự cấm cái nào.
6. Cột "Phụ thuộc": ticket phải xong trước. "—" nghĩa là làm được ngay.

## Tóm tắt thứ tự

| Mức | Mục | Ghi chú |
|---|---|---|
| **P0** (làm ngay; hạn chót thực tế: Tết 06/02/2027) | BE-P0-1 năm tham số · BE-P0-2 tính đúng năm khác · BE-P0-3 ranh giới năm · **BE-P0-4 tháng cần chú ý do engine tính thật (R4)** · BE-P0-5 `daily.headline` · BE-P0-6 thẻ nghĩa + chữ quy tắc v2 (VI/EN) · BE-P0-7 danh sách chặng 10 năm · **BE-P0-8 kiểm chứng engine đại vận (R7)** · BE-P0-9 dữ liệu cho giao diện | P0 không chờ quyết định nào nữa |
| **P1** | BE-P1-1 gỡ chặn AI · BE-P1-2 writer AI + căn cứ (VI/EN) · BE-P1-3 cổng chất lượng · BE-P1-4 bộ chạy thử · BE-P1-5 bộ chặn tiền + cảnh báo tăng trưởng · BE-P1-6 API dữ kiện theo người · BE-P1-7 Chặng 10 năm · BE-P1-8 Vận hạn năm [Y] · BE-P1-9 Tình duyên + Công việc · BE-P1-10 Tháng này · BE-P1-11 Combo tham số · BE-P1-12 gói cặp Năm · BE-P1-13 Cục/Mệnh chủ/Thân chủ/nạp âm · BE-P1-14 công cụ Hội viên · BE-P1-15 engine Bát Tự · BE-P1-16 Hợp đôi · BE-P1-17 chủ đề mới | R1–R13 đã trả lời |
| **P2** | BE-P2-1 cung lưu niên từng năm trong chặng · BE-P2-2 xuất lưu Hoá · BE-P2-3 dọn hai danh mục · BE-P2-4 tầng tiểu hạn · BE-P2-5 "Tuần này của bạn" (tuỳ chọn) · BE-P2-6 Hôm nay: kiểm ranh giới ngày | |

Đường găng (theo thứ tự): BE-P0-1 → BE-P0-2/3 → BE-P0-8 → BE-P1-6/BE-P1-8 (phát hành trước Tết). Song song: BE-P0-4, BE-P0-6, BE-P1-1.

---

## P0 — Làm ngay

### BE-P0-1 — Tham số hoá "Vận hạn năm 2026" thành "Vận hạn năm [Y]" (ưu tiên cao nhất)
**Vì sao:** SKU, backend (4 chỗ), trigger cơ sở dữ liệu và thẻ giao diện đều cứng năm 2026. Sau Tết 06/02/2027 sản phẩm không bán được dù mở khoá; Combo cũng bị trigger DB chặn ở 2026.
**Việc:**
- Chọn một: (i) SKU sinh theo năm `ZIWEI-YEAR-{Y}-P0`, hoặc (ii) một SKU `ZIWEI-YEAR-P0` + `period_key = Y`. (ii) gọn hơn, không phải thêm SKU mỗi năm; An chọn và ghi vào PR.
- Sửa 4 chỗ `deriveReportTimingLineage(now).targetYear !== 2026` trong `wallet-unlock.service.ts` (dòng 581, 648, 814, 1002); sửa `purchasePeriodKey` cố định "2026" trong `period-report-config.ts`.
- **Migration mới** (không sửa 0054 đã chạy) gỡ ràng buộc 2026 khỏi trigger combo (`0054_combo_entitlement_authority.sql:19-23`).
- Sửa `han-month-reminder.service.ts` (26, 79); enum SKU, báo giá, hoàn Lá: `commerce.ts` (157-158, 246-250), `la-catalog.ts` (235-251, 320-345).
- Sửa `ziwei-free-result-model.ts:141` (suy ra SKU năm động nhưng danh mục không có nên rơi về Trọn đời).
- Cho phép mua **năm hiện tại và năm kế** (khoảng cho phép nằm trong cấu hình).
- Tên khách thấy: "Vận hạn năm [Y] của bạn".
**File:** `packages/contracts/src/la-catalog.ts`, `commerce.ts`, `period-report-config.ts`, `packages/backend/.../wallet-unlock.service.ts`, `han-month-reminder.service.ts`, migration mới, `apps/web/src/features/reports/offer-ladder.tsx:15` (FE phối hợp), `ziwei-free-result-model.ts:141`.
**Nghiệm thu:**
- [ ] Không còn chuỗi "2026" cứng ở SKU, kiểm tra mua, khoá kỳ, trigger, nhắc hạn (grep sạch).
- [ ] Test mua/đọc/hoàn Lá cho năm Y và Y+1; năm ngoài khoảng bị từ chối đúng mã lỗi; test qua ranh giới Tết (cần BE-P0-3).
- [ ] Combo không bị trigger chặn ở năm khác 2026.
- [ ] Phát hành riêng, trước giao diện; theo dõi sau phát hành; không đổi giá FD-105.
**Ưu tiên:** P0. **Phụ thuộc:** —

### BE-P0-2 — Cung lưu niên, can chi, chặng tính theo `targetYear` (B2)
**Vì sao:** trong `calculateZiweiHoroscope`, `targetYear` chỉ đổi 12 tháng; cung lưu niên, can chi, chặng vẫn lấy theo `asOfDate`. Nhãn nói năm khác mà cung vẫn của năm nay. Phải đúng trước khi bán "năm sau".
**Việc:** tính cung lưu niên, can chi, chặng theo `targetYear` (ví dụ `horoscope("${targetYear}-07-01")` như `period-reading-facts.ts:29`).
**File:** `packages/engine-adapters/src/ziwei/iztro-horoscope.ts:184-199`; test mới.
**Nghiệm thu:**
- [ ] 7 lá số tổng hợp của `01-dai-san-pham-va-vong-thoi-gian.md` mục 4.2 × năm 2026, 2027, 2030, 2035 khớp bảng chạy thử.
- [ ] Kết quả cho **năm hiện tại** không đổi (test hồi quy).
**Ưu tiên:** P0. **Phụ thuộc:** —

### BE-P0-3 — Thống nhất ranh giới năm dương/âm (B3)
**Vì sao:** backend lấy năm theo lịch dương (1/1), engine đổi năm ở Tết. Từ 01/01 đến 05/02/2027 báo cáo "2027" dùng lưu niên Bính Ngọ.
**Việc:** dùng năm âm lịch (Tết) làm khoá năm, hoặc xử lý rõ 01/01–05/02; rà `deriveReportTimingLineage`, khoá mua, nhãn, nội dung báo cáo. Rà cả tuổi âm tính bằng `targetYear - birthYear + 1` ở `iztro-horoscope.ts` (lấy `birthYear` từ ngày chuẩn hoá; nếu ngày chuẩn hoá là **dương lịch** và sinh từ 01/01 đến Tết thì năm sinh âm lịch khác năm dương → tuổi âm lệch 1; **cần kiểm chứng**).
**File:** `packages/backend/src/reports/identity-report-config.ts:366-381`, `packages/engine-adapters/src/ziwei/period-reading-facts.ts:16-19`, `period-purchase-key.ts`, `iztro-horoscope.ts` (tuổi âm).
**Nghiệm thu:**
- [ ] 2027-01-15 → Bính Ngọ; 2027-02-05 → Bính Ngọ; 2027-02-06 → Đinh Mùi, thống nhất ở mọi lớp.
- [ ] Khoá mua năm Y không đổi nghĩa giữa lúc mua và lúc đọc.
- [ ] Tuổi âm đúng cho người sinh trong khoảng 01/01–Tết (test có lá số mẫu).
**Ưu tiên:** P0. **Phụ thuộc:** —

### BE-P0-4 — "Tháng cần chú ý" do engine tính thật, không ép (R4 = KHÔNG ép tháng)
**Vì sao (anh quyết 08/10):** tháng cần chú ý phải là **đúng những tháng thật sự cần chú ý của lá số đó**; anh tin lá số nào cũng có tháng riêng cần chú ý và dặn "đào sâu engine". Hiện code ép tháng 7 thành tháng "tiền bạc" khi không có tháng nào đạt (`iztro-horoscope.ts:315-330`), và còn hai chỗ bịa nữa (xem dưới). Ngoài ra trang miễn phí và bản trả phí dùng **hai định nghĩa khác nhau** về "tháng hạn".
**Hiện trạng đã đọc trong code:**
- Trang miễn phí (`iztro-horoscope.ts:221-295`): dùng `monthlyList(targetYear)` (không tháng nhuận), mỗi tháng lấy cung lưu nguyệt `m.index`. Đặt `warn` khi (a) sao Hoá Kỵ lưu nguyệt nằm trong **chính tinh** của cung đó, hoặc (b) sao Hoá Kỵ lưu niên nằm trong chính tinh của cung đó, hoặc (c) có sát tinh lưu nguyệt trong cung và cung ấy bản mệnh có hãm/Hoá Kỵ/sát tinh.
- Bản trả phí (`period-reading-facts.ts`): dùng `monthlyList(targetYear, true)` (có tháng nhuận, hai nửa), Hoá Kỵ lưu nguyệt tính trên **cả chính tinh lẫn phụ tinh** của cung.
- Ba chỗ không phải do engine: (1) ép tháng thứ 7 thành `warn` "tiền bạc" khi 0 tháng; (2) nếu không có `focusAreas` thì tự thêm "tiền bạc" và "giấy tờ" vào câu tóm tắt; (3) câu chuẩn bị (`prepText`) là chuỗi mẫu cố định theo 5 nhóm `primaryFocus`, giống nhau cho mọi lá số.
- Cung không có chính tinh (vô chính diệu) không bao giờ kích hoạt tín hiệu Kỵ ở các nhánh (a), (b).
**Việc (nghiên cứu rồi làm):**
1. **Bỏ ép** (1) và (2). Câu tóm tắt chỉ nói số tháng thật; 0 tháng → nói "chưa thấy tháng nào bị ép đặc biệt" hoặc bỏ câu số, FE chọn chữ (không bao giờ bịa).
2. **Một hàm duy nhất** dùng cho cả trang miễn phí và bản trả phí (đặt ở `packages/engine-adapters/src/ziwei/`, ví dụ `month-attention.ts`), dùng `monthlyList(year, true)` (xử lý tháng nhuận), trả về cho mỗi kỳ: `marker`, `score`, `signals[]` (mã tín hiệu + sao + cung), `evidenceKeys`.
3. **Quy tắc đề xuất để nghiên cứu và hiệu chỉnh** (điểm theo tín hiệu, mọi tín hiệu lấy từ engine; An xác minh từng tín hiệu với Kho tri thức V4.1 và tài liệu Tử Vi truyền thống trước khi chốt trọng số):
   - Hoá Kỵ lưu nguyệt rơi vào sao (chính tinh **hoặc phụ tinh**) của cung lưu nguyệt: tín hiệu mạnh; rơi vào cung **xung chiếu** (đối cung) của cung lưu nguyệt: tín hiệu vừa.
   - Hoá Kỵ lưu niên rơi vào cung lưu nguyệt (hoặc đối cung): tín hiệu vừa.
   - Hoá Kỵ **đại vận** rơi vào cung lưu nguyệt: tín hiệu vừa (cần xuất `decadal.mutagen`, xem BE-P2-2).
   - Hoá Kỵ sinh niên (bản mệnh) nằm trong cung lưu nguyệt: tín hiệu nền.
   - Sát tinh lưu nguyệt (Kình Đà lưu nguyệt…) và sát tinh bản mệnh (Kình, Đà, Hoả, Linh, Không, Kiếp) cùng ở cung lưu nguyệt: tín hiệu vừa; chính tinh hãm trong cung: tăng nặng khi đã có tín hiệu khác.
   - Cung vô chính diệu: kiểm xem Tử Vi truyền thống có "mượn sao đối cung" không; nếu có thì áp dụng và ghi rõ trong căn cứ.
   - `warn` khi tổng điểm ≥ ngưỡng (An đề xuất ngưỡng sau khi đo). Có thể thêm bậc "đáng để ý" nếu nghiên cứu thấy cần.
4. **Đo trước khi chốt:** chạy ≥200 lá số tổng hợp (nam/nữ, nhiều năm sinh, nhiều giờ sinh) × năm 2026/2027/2030; báo cáo phân bố số tháng cần chú ý mỗi lá số và **tỉ lệ lá số có 0 tháng**. Nếu có lá số 0 tháng thì **tinh chỉnh quy tắc cho đúng Tử Vi** (thêm tín hiệu có thật), **không hạ ngưỡng chỉ để có tháng**; nếu tinh chỉnh rồi vẫn 0 thì giữ 0 và nói thật.
5. Câu chuẩn bị theo tháng: bỏ chuỗi mẫu cố định; FE/AI viết từ `signals[]` (ví dụ "Hoá Kỵ lưu nguyệt nhập cung Tài Bạch, trúng sao Thiên Đồng"). Tháng thuận/trung tính không có câu mẫu.
6. Sửa tuỳ chọn `isLocked`/`monthNumberDisplay`: giữ che nội dung ở bản miễn phí nhưng **vị trí ô** vẫn theo thứ tự (R5 = hiện 12 ô, ô cần chú ý có dấu khoá).
**File:** `packages/engine-adapters/src/ziwei/iztro-horoscope.ts:196-345`, `period-reading-facts.ts:41-46`, `period-reading-writer.ts:27-41`, `packages/contracts/src/ziwei-horoscope-v1.ts`, `apps/web/src/features/ziwei/ziwei-free-result-model.ts:141-145`; test và báo cáo phân bố.
**Nghiệm thu:**
- [ ] Không còn tháng ép, không còn "tiền bạc/giấy tờ" mặc định; cùng đầu vào ra cùng kết quả.
- [ ] Trang miễn phí và bản trả phí cùng một hàm (test đối chiếu cho 200 lá số, kể cả tháng nhuận).
- [ ] Báo cáo phân bố trên ≥200 lá số: số tháng/lá số, tỉ lệ lá số 0 tháng, ví dụ 5 lá số có `signals[]`; anh xem và duyệt quy tắc trước khi bật.
- [ ] 3 lá số được đối chiếu tay (anh hoặc đồng nghiệp biết Tử Vi) khớp cho các tháng `warn`.
- [ ] Mọi tháng `warn` có `signals[]` không rỗng và `evidenceKeys` tương ứng.
**Ưu tiên:** P0. **Phụ thuộc:** BE-P0-2, BE-P0-3 (cho năm khác). Làm xong trước BE-P1-8 và trước khi FE dựng dải 12 ô (GĐ4).

### BE-P0-5 — `daily.headline` nhắc Hội viên đang ẩn
**Vì sao:** câu kết "Mở mỗi sáng trong gói Hội viên" nhưng Hội viên đang ẩn (vẫn ẩn sau vòng 2, R10).
**Việc:** bỏ câu đó, hoặc chỉ hiện khi Hội viên `availability` là bán (đọc danh mục).
**File:** `packages/engine-adapters/src/ziwei/iztro-horoscope.ts:387`.
**Nghiệm thu:** [ ] `daily.headline` không chứa "Hội viên" khi Hội viên đang giữ; test cả hai trạng thái.
**Ưu tiên:** P0. **Phụ thuộc:** —

### BE-P0-6 — Thư viện thẻ nghĩa + chữ quy tắc v2 (VI và EN; ra trước AI)
**Vì sao:** chữ miễn phí hiện khô (ghép câu mẫu, chỉ 14 chính tinh, công thức nằm trong thân bài, lặp câu phủ nhận, Nên làm/Nên tránh giống nhau theo cung). Chữ quy tắc v2 cũng là đường dự phòng vĩnh viễn của AI nên không được chờ AI.
**Việc:**
- `content/knowledge/vi/ziwei/free-reading-cards.v1.json` (14 chính tinh, 12 cung, 4 Hoá, ~18 sao phụ, 6 quan hệ; mỗi thẻ có `sourcePassageIds`) + `scripts/build-free-reading-cards.mjs` + bộ kiểm cấu trúc. **Có bản tiếng Anh tương đương** (`content/knowledge/en/...`) vì R3: tiếng Anh dùng cùng quy tắc giọng như tiếng Việt. Soạn nội dung cùng Claude (Sonnet); anh duyệt thẻ.
- Sửa `compileFreeStructuralOverview`/`compileFreeStructuralPalace`: khung 6 phần, thân bài không công thức (công thức chỉ ở hộp "Điểm này tính thế nào"), một câu thận trọng cuối bài, Nên làm/Nên tránh theo bộ sao + độ sáng, đoạn Năm nay 2 câu thật + câu cắt dựng theo khuôn `shown/clip`.
- Dòng đọc thử cho 11 cung + 2 chủ đề (1–2 câu thật, riêng lá số, không lộ nội dung trả phí).
- Căn cứ của nhánh quy tắc = chuỗi `chain` dựng từ thẻ.
- Tăng `FREE_OVERVIEW_RENDERER_VERSION`; lá số cũ ghép lại bằng v2 khi xem lần sau (không tốn AI).
**File:** `packages/backend/src/ziwei/free-structural-overview.ts`, `free-structural-overview-cache.ts`, `packages/contracts/src/free-structural-overview-v1.ts`, `ziwei-star-meanings-v1.ts`, `free-copy-quality.ts` (mới), `apps/web/src/features/ziwei/ziwei-free-result-model.ts`.
**Nghiệm thu:**
- [ ] 200/200 lá số tổng hợp qua bộ kiểm chữ **ở cả VI và EN** (900–1.300 âm tiết cho VI, độ dài tương đương cho EN; mỗi đoạn có tên sao/cung riêng; tối đa 1 câu thận trọng; không số công thức trong thân bài; không lặp câu giữa các cung).
- [ ] Cùng lá số ra cùng chữ; ghép <50ms; 0 lượt gọi AI.
- [ ] Không chữ trả phí lọt vào dòng đọc thử (test như LSV-75).
- [ ] Từ khoá cấm chỉ gồm điều luật cấm và câu sai sự thật (quy tắc chung số 5); cụm văn phong chỉ cảnh báo.
**Ưu tiên:** P0. **Phụ thuộc:** — (anh duyệt thẻ nghĩa và giọng ở GĐ3).

### BE-P0-7 — Danh sách đủ các chặng đại vận ra trang miễn phí
**Vì sao:** trang miễn phí chỉ nhận chặng hiện tại; "Đường đời 10 năm" (Q8) và sản phẩm Chặng (R7) cần đủ chặng.
**Việc:** thêm `decadalCycles[]` (thứ tự, tuổi bắt đầu/kết thúc, năm bắt đầu/kết thúc, cung, trạng thái `past/current/upcoming/not_started`) vào `ZiweiHoroscopeResultV1` bằng `astrolabe.decadalList()` (đã dùng ở `iztro-horoscope.ts:406`). **Không** dùng `deriveDecadalCycles` (trả rỗng ở chặng đầu hoặc thứ 7 vì chiều thuận/nghịch mơ hồ).
**File:** `packages/contracts/src/ziwei-horoscope-v1.ts:67-78`, `iztro-horoscope.ts:405-417`; test.
**Nghiệm thu:**
- [ ] 7 lá số: đủ chặng, đúng tuổi/năm/cung, khớp bảng chạy thử mục 4.2 nghiên cứu 01; nam và nữ cùng ngày sinh ra chặng khác.
- [ ] Xác nhận `decadalList()` trả đủ chặng cho tuổi tới ~95; ghi giới hạn nếu khác.
**Ưu tiên:** P0. **Phụ thuộc:** BE-P0-8 (cùng kiểm chứng).

### BE-P0-8 — Kiểm chứng engine đại vận và suy luận thời gian cho mọi lá số (R7 ghi chú)
**Vì sao (anh dặn):** "kiểm tra engine thật kỹ để suy luận thời gian và đọc chặng 10 năm đúng cho mọi lá số". Sản phẩm Chặng (360 Lá) và dải "Đường đời 10 năm" sẽ bị bắt bẻ ngay nếu một chặng lệch.
**Việc (đây là việc kiểm chứng, tạo test cố định; sửa lỗi nếu thấy):**
- **Chiều thuận/nghịch:** đối chiếu quy tắc (dương nam, âm nữ đi thuận; âm nam, dương nữ đi nghịch, theo quy ước phổ biến) với kết quả `decadalList()` cho 4 tổ hợp can năm sinh × giới tính. Ghi rõ nếu iztro dùng quy ước khác.
- **Tuổi bắt đầu = số Cục (2–6)**, mỗi chặng 10 năm, tính theo **tuổi âm**; chặng đầu ở cung Mệnh; 12 chặng liền kề nhau không trùng không hở. Kiểm cho tuổi tới ~95.
- **Khoảng năm của chặng:** năm bắt đầu = năm sinh âm lịch + tuổi bắt đầu − 1 (kiểm với bảng chạy thử 7 lá số); **chặng hiện tại** xác định theo **năm âm lịch** (Tết 06/02/2027), không theo 01/01; kiểm các ngày 2027-01-15, 2027-02-05, 2027-02-06 và người sinh sát Tết hoặc sát ranh giới giờ Tý (23h).
- **Năm sinh âm lịch** của người nhập ngày dương trong khoảng 01/01–Tết (xem BE-P0-3), tháng nhuận, giờ sinh chưa chắc (nhãn "tạm tính" khi cung Mệnh, Cục hoặc chặng phụ thuộc giờ).
- **Chặng sắp đổi:** số năm còn lại R = 10 − k đúng ở ngày cuối cùng của chặng; người chưa đến tuổi chặng đầu → `not_started`.
- **Đối chiếu chéo:** so với một cài đặt thứ hai (ví dụ `mingyu` như `Product Scope` ghi, hoặc phần mềm Tử Vi công khai) trên ≥30 lá số do anh/đồng nghiệp chọn; lệch chỗ nào ghi rõ và quyết cái nào đúng.
- **Cấu hình iztro:** ghi lại và giải thích `yearDivide`, `horoscopeDivide`, `ageDivide`, `algorithm` đang dùng (`"normal"`/`"default"`) và tác động lên chặng/năm; đổi nếu sai.
**File:** `packages/engine-adapters/src/ziwei/iztro-horoscope.ts`, `iztro-report-snapshot.ts:262-264, 316, 358-362`, `period-reading-facts.ts`; test cố định mới trong `packages/test-fixtures/ziwei` (lá số tổng hợp + kết quả mong đợi đã đối chiếu).
**Nghiệm thu:**
- [ ] Bảng kết quả kiểm cho ≥30 lá số × 4 ngày mốc (gồm 3 ngày quanh Tết) với cột "iztro / đối chiếu / lệch?"; không còn dòng lệch chưa giải thích.
- [ ] Bất biến kiểm tự động trên ≥200 lá số: 12 chặng liền kề; tuổi bắt đầu = Cục; chặng đầu ở cung Mệnh; chiều đúng theo bảng.
- [ ] Báo cáo ngắn bằng tiếng Việt thường cho anh (đúng/sai, chỗ nào đã sửa).
**Ưu tiên:** P0. **Phụ thuộc:** BE-P0-2, BE-P0-3. Phải xong trước BE-P1-7 và trước khi FE bày Đường đời 10 năm ra trang thật.

### BE-P0-9 — Dữ liệu cho giao diện (không đổi hành vi hiện có)
**Việc (gộp vì cùng chạm hợp đồng dữ liệu):**
- `evidence { palaceIds, starIds }` cho từng mục bài tổng quan.
- Danh sách 12 tháng ra dữ liệu trang miễn phí: `marker`, số tháng, `signals[]` (khi mở khoá), tháng cần chú ý vẫn che nội dung ở bản miễn phí; **vị trí ô giữ đúng thứ tự** (R5); không dùng câu chuẩn bị mẫu.
- Cung đại vận, cung lưu niên vào `FreeResultModel`.
- Ghi vào tracker: điểm chặng = điểm cấu trúc đã công bố (FD-107/FD-111) của cung chặng đi qua; giao diện chỉ dùng hàm đã duyệt.
**File:** `packages/contracts/src/free-structural-overview-v1.ts:4-9`, `free-structural-overview.ts`, `ziwei-horoscope-v1.ts`, `iztro-horoscope.ts`, `ziwei-free-result-model.ts`.
**Nghiệm thu:** [ ] mỗi mục tổng quan có `evidence` đúng; [ ] 12 tháng đúng số lượng, không rò nội dung tháng cần chú ý; [ ] DTO không gửi khoá thô/hash.
**Ưu tiên:** P0. **Phụ thuộc:** BE-P0-4 (định nghĩa tháng), BE-P0-7.

---

## P1

### BE-P1-1 — Gỡ hai điều chặn để AI miễn phí chạy được
**Vì sao:** (a) `NO_REVIEWED_TOKEN_BOUND_PROOF = () => null` ở `apps/api/src/free-palace-composition.ts:16` → mọi yêu cầu dừng ở `unproven_bound`; (b) bộ nối 9router + Gemini luôn trả `tokensUnknown` → không tính được tiền, writer luôn `usage_unknown` (bị đưa vào diện cách ly, "usage quarantine").
**Việc:**
- (a) Chứng minh giới hạn token: đầu vào chính xác + trần đầu ra do nhà cung cấp thực thi. Với model có "thinking", `max_tokens` có thể không chặn tổng; hướng: tắt hoặc ép "thinking" thấp qua tham số chuẩn của tuyến Gemini (thử trên 9router), đo bằng `countTokens`, chứng minh bằng thử nghiệm ngưỡng; hoặc bộ nối riêng gọi thẳng API Gemini.
- (b) Có đường lấy usage đáng tin (gọi thẳng API Gemini, hoặc xác minh 9router giữ đủ `usageMetadata`).
**File:** `apps/api/src/free-palace-composition.ts:16`, `packages/backend/src/ai/openai-compatible-adapter.ts`, `free-palace-cost-context.ts`; `plan/2026-10-06-lsv68-api-reference-pricing.md`.
**Nghiệm thu:** [ ] bằng chứng giới hạn token (có test ngưỡng); yêu cầu không còn kết thúc `unproven_bound`; [ ] usage thật trả về, writer ghi số token thật, `usage_unknown` chỉ còn là nhánh lỗi hiếm; [ ] chưa bật cờ cho khách.
**Ưu tiên:** P1 (bắt đầu sớm vì thời gian chờ dài). **Phụ thuộc:** —

### BE-P1-2 — Hợp đồng, dữ kiện, writer AI một lần gọi, căn cứ (VI và EN)
**Việc:**
- `packages/contracts/src/free-reading-v2.ts`: `FreeReadingContentV2Schema` (theo schema mục 3.4 nghiên cứu 02), `FreeReadingFactV2Schema`, `FreeReadingViewV2Schema`, `FreeReadingFrozenCallV2Schema`.
- `free-reading-facts.ts`: dựng dữ kiện thuần, tất định (khoá dẫn chứng `palace:<p>:star:<s>`, `hoa:<s>`, `time:decadal`…; "điều hiếm"; chọn thẻ); **không** đưa tên, ngày/giờ/nơi sinh, `chart_id`, điểm số, nội dung trả phí.
- `free-reading-writer.ts` (khuôn `free-palace-writer.ts`): `free-reading-prompt-v2.0` theo mục 3.1 nghiên cứu 02, **sửa theo FD-118**: viết cả **tiếng Việt và tiếng Anh** với cùng quy tắc giọng cá nhân hoá, chuyên gia, tư vấn/đồng hành/tâm tình (mỗi lá số một lần gọi theo ngôn ngữ người đang đọc); bỏ yêu cầu "AI chỉ tiếng Việt"; không nhồi danh sách từ cấm văn phong vào prompt, chỉ nêu điều luật cấm và điều không được bịa. Tên khách vẫn không gửi cho AI (giữ riêng tư, trang tự chèn câu chào).
- **Căn cứ hai tầng:** tầng 1 thẻ sao/cung/độ sáng lấy thẳng từ engine; tầng 2 do AI viết 2–3 bước như người có nghề giải thích cho người ngoài ngành, bám đúng lá số.
- Đúng **một lần gọi**; không thử lại; khối rớt cổng dùng chữ quy tắc v2 (BE-P0-6); `max_output` 10.000, `max_input` 16.000 (đo lại theo p99).
- Lưu: bảng artifact mới (migration sau `0061_free_structural_overview_cache.sql`), `section_status` từng khối `ai|rule_v2`, lineage 4 phiên bản, xoá theo 24 giờ và khi xoá dữ liệu. Đọc: `FreePalaceReadService` thêm đường đọc gói v2; DTO an toàn.
- Cờ `FREE_READING_V2_ENABLED`; bật theo thứ tự: tài khoản đã xác minh → khách đã tương tác.
**File:** `free-palace-request.service.ts`, `free-palace-selection.ts`, `free-palace-artifact.repository.ts`, `free-palace-read.service.ts`, `free-palace-runner.ts`, `packages/database/drizzle/00xx_free_reading_v2.sql`.
**Nghiệm thu:**
- [ ] Ảnh chụp prompt cho 3 lá số mẫu ở cả VI và EN; test "không có tên/ngày sinh trong prompt".
- [ ] Đúng một lần gọi (lần begin thứ hai bị từ chối); usage không rõ → giữ nguyên số giữ chỗ, không công bố, không gọi lại.
- [ ] Khối rớt cổng chỉ khối đó dùng chữ quy tắc; `sourceKind` từng khối đúng.
- [ ] Hết trần ngày hoặc không rõ giá → không gọi AI, khách thấy chữ quy tắc ngay.
- [ ] Phần sau câu cắt giữa câu **không tồn tại ở bất kỳ nơi nào**.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P0-6, BE-P1-1, BE-P1-3, BE-P1-5.

### BE-P1-3 — Cổng chất lượng `free-reading-quality.ts` (cứng = sự thật + luật; mềm = văn phong)
**Việc:** hàm thuần theo bảng mã lỗi mục E nghiên cứu 02, **phân lại theo FD-118**:
- **Chặn cứng:** `schema_invalid`, `length_block`, `key_unresolved`, `invented_element`, `brightness_mismatch`, `placement_mismatch`, `hoa_mismatch`, `uncomputed_number`, `uncomputed_date`, `formula_leak`, `pattern_claim`, `locale_integrity`, `teaser_leak`, `teaser_overlap`, `hook_shape`, `caveat_count` (quá một câu thận trọng thì cảnh báo, không chặn) và các chủ đề luật cấm.
- **Chuyển từ cứng sang cảnh báo mềm:** `banned_phrase`, `banned_opener`, `forbidden_self_ref`, `star_density`, `basis_generic` và mọi cụm văn phong.
- Cảnh báo mềm: `sentence_shape`, `noun_stack`, `repeat_opening`, `hedge_density`, `person_ratio`, `hanviet_rare`, `term_gloss`, `distinct_openings`.
- Có phiên bản **tiếng Anh** của các kiểm tra phụ thuộc ngôn ngữ (`locale_integrity`, độ dài, độ sáng).
- Export `PROHIBITED`, `DATE_PATTERNS`, `CANONICAL_ID` từ `free-palace-quality.ts`.
**File:** `packages/backend/src/ziwei/free-reading-quality.ts`, `free-palace-quality.ts`, `config/ziwei-free-reading-quality.v1.json`.
**Nghiệm thu:** [ ] mỗi mã lỗi có ít nhất một cặp test tốt/xấu viết tay; [ ] `brightness_mismatch`, `placement_mismatch`, `hoa_mismatch` có test lấy các câu thật mô hình từng sinh sai; [ ] chặn theo khối (khối rớt không làm rớt khối khác); [ ] cụm từ văn phong không bao giờ làm rớt bài.
**Ưu tiên:** P1. **Phụ thuộc:** —

### BE-P1-4 — Bộ chạy thử 30 lá số
**Việc:** `scripts/eval-free-reading.mjs` (khuôn `generate-ziwei-quality-samples.mjs` và `native-campaign-*`): vào danh sách lá số tổng hợp, ra JSON từng lần (hash prompt, usage thật, tiền, mã lỗi cổng) + bảng tổng; **trần tiền cho cả đợt thử ≤180.000đ cho 3 vòng** (R2 đồng ý); dừng khi chạm trần; đếm token trước khi gọi để hiệu chỉnh 1,7 token/âm tiết; xuất 10 nhận định ngẫu nhiên/bài để đối chiếu tay; chạy cả VI và EN cho một phần lá số. Claude dựng trang `chu-mien-phi-v2.html` từ JSON này.
**Nghiệm thu:** [ ] chạy đủ 30 lá số, một lần gọi mỗi lá số mỗi vòng, không vượt trần; [ ] ≥27/30 qua chặn cứng ngay lần đầu; chi phí đo thật ≤3.000đ ở p99; độ trễ p95 báo cáo; [ ] độ trùng giữa hai lá số khác nhau ≤35% cụm 5 từ giống (ngoài phần trích thẻ nghĩa).
**Ưu tiên:** P1. **Phụ thuộc:** BE-P1-1, BE-P1-2, BE-P1-3, BE-P1-5.

### BE-P1-5 — Bộ chặn tiền AI: giá tham chiếu FD-114, trần giữ nguyên, cảnh báo khi lượng khách tăng (R2)
**Vì sao:** giá chạy thật trong DB (migration 0044: 39.165/195.825 đồng mỗi triệu token) gấp đôi FD-114 (19.582/97.912). Bộ chặn tiền đọc bảng giá DB nên phải qua được giá đắt hơn. Giá Google từ 01/01/2027 tăng gấp đôi.
**Việc:**
- **Giữ trần** 3.000đ mỗi lá số và 50.000đ mỗi ngày UTC (FD-109a; anh xác nhận R2).
- Bộ chặn tiền dùng giá tham chiếu FD-114; cập nhật bảng giá hoặc cấu hình tham chiếu cho khớp, ghi nguồn/phiên bản/hiệu lực; không tăng `max_tokens`, không bật "thinking" dài; số giữ chỗ = 16.000 × giá vào + 10.000 × giá ra (≈1.292đ theo FD-114, ≈2.585đ theo giá DB); từ chối nếu >3.000đ.
- **Cảnh báo tăng trưởng (mới, R2):** khi nhu cầu tăng thì hệ thống phải **báo** để nâng trần ngày. Đề xuất: (i) đếm mỗi ngày số lá số được AI viết, số lá số rơi về chữ quy tắc vì hết trần ngày, % trần đã dùng; (ii) cảnh báo mức 1 khi trần ngày dùng ≥80% trước 18:00 giờ Việt Nam hoặc ≥3 ngày trong 7 ngày dùng ≥80%; cảnh báo mức 2 khi đã hết trần và có lá số bị đẩy về chữ quy tắc; (iii) cảnh báo nêu số liệu và gợi ý mức trần mới; (iv) kênh cảnh báo là hạ tầng quan sát nội bộ hiện có (`packages/observability`, bảng điều khiển quản trị, Sentry), **không gửi email cho khách** (email thật vẫn tắt); An chọn kênh và ghi vào PR; (v) hiện số liệu đó trên bảng điều khiển quản trị.
- Báo anh khi chi phí/lá số đo thật vượt 2.000đ hoặc khi giá nhà cung cấp đổi.
**File:** `packages/database/drizzle/0044_ai_model_pricing_9router_gemini_flash.sql` (chỉ đọc) + migration mới nếu đổi, `free-palace-runner.ts` (đọc `aiModelPricing`), `scripts/lib/native-campaign-api-pricing.mjs`, `packages/observability`, trang quản trị.
**Nghiệm thu:** [ ] bộ chặn dùng đúng bảng giá đã chọn; test số giữ chỗ theo cả hai bảng giá; [ ] test cảnh báo mức 1 và mức 2 bằng số liệu giả; [ ] ghi chú nguồn giá và hiệu lực trong PR.
**Ưu tiên:** P1. **Phụ thuộc:** —

### BE-P1-6 — API "dữ kiện theo người" cho dải sản phẩm
**Việc:** API chỉ đọc trả cho từng lá số: năm âm lịch hiện tại Y, số tháng âm lịch còn lại, chặng hiện tại [a–b], năm thứ k trong chặng, R = 10 − k, cung lưu niên Y và Y+1, cung chặng kế, cờ giờ sinh tạm tính. Ngưỡng "năm gần hết" mặc định ≤3 tháng âm lịch còn lại (R8 đồng ý), nằm trong cấu hình.
**File:** mới trong `ziwei-query.service.ts` (hoặc facts API).
**Nghiệm thu:** [ ] test 7 lá số mục 4.2 nghiên cứu 01; [ ] không đổi luồng tiền; [ ] giờ sinh chưa chắc → cờ tạm tính.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P0-2, BE-P0-3, BE-P0-7, BE-P0-8.

### BE-P1-7 — Sản phẩm "Chặng [a–b] tuổi của bạn" (R7: 360 Lá)
**Vì sao:** khách hay hỏi giai đoạn 10 năm của mình mà Trọn đời chỉ có một đoạn; chưa có SKU và writer. **Xây ngay trên engine của repo** (R1).
**Việc:**
- SKU mới (ví dụ `ZIWEI-DECADE-P0`, `period_key` = chặng hiện tại hoặc kế tiếp khi chặng còn ≤2 năm); contract `ziwei-decadal-reading-v1` (tái dùng `ZiweiTopicDecadalTiming*` và đoạn `currentDecadal` nếu hợp); giá 360 Lá.
- Writer + cổng theo mẫu `period-reading-writer.ts` và `topic-deep-dive-quality-v4.ts`; facts từ `decadalList()` (đã kiểm ở BE-P0-8); chặng `not_started` không bán; cổng thêm "không bịa năm/tuổi ngoài khoảng chặng" (giống `UNCOMPUTED_YEAR` ở `period-reading-writer.ts:27`).
- Mua/đọc/hoàn Lá theo khuôn các món khác; có nhãn "tạm tính" khi giờ sinh chưa chắc.
**File:** mới `packages/backend/src/reports/decadal-reading-writer.ts`, `decadal-report-config.ts`, `packages/contracts/src/ziwei-decadal-reading-v1.ts`; sửa `la-catalog.ts`, `wallet-unlock.service.ts`, migration mới.
**Nghiệm thu:** [ ] cổng tự động FD-077 + FD-089 + test không bịa năm/tuổi ngoài chặng, chạy trên 7 lá số × chặng hiện tại và chặng kế; [ ] test mua/đọc/hoàn Lá; [ ] 2–3 bài thử tay do anh/đồng nghiệp, ảnh chụp gửi Claude chấm; [ ] bật `availability: "active"` sau khi đạt.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P0-2, BE-P0-7, BE-P0-8.

### BE-P1-8 — "Vận hạn năm [Y]": writer, kiểm tra, kích hoạt
**Việc:** (sau khi có năm tham số) dùng `period-reading-writer.ts` cho kỳ năm Y và Y+1; áp **một** định nghĩa tháng cần chú ý (BE-P0-4) để bài và trang miễn phí không nói khác nhau; viết lại nhãn "Năm [Y]"; câu mở dùng số thật (năm thứ k của chặng, cung lưu niên); nói thật rằng Trọn đời chỉ có một đoạn năm, bản này có 12 tháng. Chạy cổng nhẹ (xem quy tắc chung số 3), 2–3 bài thử tay, rồi bật trong danh mục.
**Nghiệm thu:** [ ] test mua/đọc/hoàn Lá cho Y và Y+1; [ ] cổng tự động trên 7 lá số × năm 2026/2027; [ ] 2–3 bài thử tay + ảnh chụp; [ ] không còn tháng ép.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P0-1, BE-P0-2, BE-P0-3, BE-P0-4.

### BE-P1-9 — "Tình duyên và hôn nhân" + "Công việc và tài lộc": kích hoạt
**Việc:** code writer đã xong (`topic-deep-dive-writer-v4.ts`). Chạy cổng nhẹ trên 7 lá số cho mỗi đề, 2–3 bài thử tay mỗi đề, bật `availability` từng đề trong danh mục. Rà đoạn timing của chủ đề dùng cùng dữ kiện đã sửa (BE-P0-2, BE-P0-8).
**Nghiệm thu:** [ ] mỗi đề có cổng tự động + 2–3 bài thử tay; [ ] mua/đọc/hoàn Lá; [ ] thẻ tự hiện từ danh mục.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P0-2, BE-P0-8.

### BE-P1-10 — "Tháng này của bạn": kích hoạt (kèm tháng sau, tuỳ chọn)
**Việc:** cổng nhẹ + 2–3 bài thử tay; thêm thẻ trên trang chọn (FE); dùng định nghĩa tháng cần chú ý của BE-P0-4; tháng nhuận (hai nửa) đúng. **Tuỳ chọn:** cho mua "tháng sau" (`period-reading-facts.ts:26-27`, `period-report-config.ts:6-8`).
**Nghiệm thu:** [ ] mua/đọc/hoàn tháng hiện tại (và tháng sau nếu làm); [ ] qua tháng nhuận; [ ] 2–3 bài thử tay.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P0-3, BE-P0-4.

### BE-P1-11 — Combo tham số "Trọn đời + Vận hạn năm [Y]" (R9)
**Việc:** đổi nghĩa Combo thành Trọn đời + Năm [Y], **giữ 1.300 Lá**; migration mới cho trigger; chỉ bật khi cả hai thành phần Active; khấu trừ 7 ngày **giữ như cũ, không mở rộng** cho Năm/Chặng; nói thật trong chữ bán rằng Trọn đời đã có một đoạn năm, phần cộng thêm là 12 tháng.
**Nghiệm thu:** [ ] test mua hai quyền lợi, phát lại, hoàn; [ ] không còn gắn 2026; [ ] không bật khi Năm chưa Active.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P0-1, BE-P1-8.

### BE-P1-12 — Gói cặp "Năm nay + Năm sau" 780 Lá (R8)
**Việc:** một SKU gộp hai kỳ năm (mua lẻ 960, tiết kiệm 180); làm sau khi bản Năm đạt.
**Nghiệm thu:** [ ] mua một lần ra hai quyền lợi; phát lại; hoàn theo luật FD-105.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P1-8.

### BE-P1-13 — Cục, Mệnh chủ, Thân chủ, nạp âm, âm dương thuận/nghịch (R13)
Ánh xạ trong engine để giao diện in giữa lá số (người quen xem Tử Vi hay tìm). Làm ở đợt hoàn thiện, không chặn việc khác.
**File:** `packages/engine-adapters/src/ziwei/iztro-mapping.ts`, `packages/contracts/src/normalized-ziwei-chart-v1.ts`.
**Nghiệm thu:** [ ] 7 lá số khớp iztro; [ ] không đổi kết quả hiện có.
**Ưu tiên:** P1 (thấp trong P1). **Phụ thuộc:** BE-P0-8 (cùng quy ước).

### BE-P1-14 — Công cụ cho Hội viên (backend) — R10 = xây công cụ ngay, Hội viên vẫn "sắp ra mắt"
**Vì sao:** Hội viên đang ẩn vì quyền lợi đã hứa ("công cụ trả phí theo lá số", theo đặc tả `docs/superpowers/specs/2026-09-25-membership-architecture-design.md`) chưa có thật. Anh chọn: **giữ "sắp ra mắt" như bây giờ, đồng thời xây các công cụ còn thiếu ngay.** Mở bán Hội viên là quyết định riêng sau khi công cụ xong.
**Công cụ đề xuất (An kiểm khả thi trên engine, ghi đầu vào → dữ kiện engine → đầu ra → giới hạn/hạn dùng → xoá dữ liệu):**
1. **Chọn ngày theo lá số** (ngày tốt cá nhân hoá: dùng lưu nhật/lưu nguyệt của chính người đó theo mục đích: việc lớn, ký giấy tờ, đi xa) dẫn vào "Hôm nay". Đầu ra là danh sách ngày kèm căn cứ; **không** đoán ngày giờ không do engine tính.
2. **Lịch vận cá nhân của tháng** (lưu nhật theo lịch, ngày nào cung nào bị chạm, tháng nhuận đúng).
3. **Nguyệt vận 12 tháng** (đã có nền ở "Tháng này"/"Vận hạn năm", dùng BE-P0-4).
4. **Nhắc tháng cần chú ý** (đã có `han-month-reminder.service.ts`; nối với BE-P0-4; kênh thông báo theo hạ tầng hiện có, không bật email thật).
5. **Phiên bản cá nhân hoá của các công cụ miễn phí** (cùng trang `/cong-cu-mien-phi`), đúng quyền lợi "Free-tools personalization" trong đặc tả.
6. Khấu trừ 20% báo cáo (đã có).
**Việc:** viết đặc tả từng công cụ, hợp đồng, endpoint, cổng quyền lợi (chỉ dành cho Hội viên đang hiệu lực), rồi xây theo thứ tự 1 → 4 → 2 → 3 → 5. **Không** mở bán Hội viên, **không** hiện nút mua Hội viên ở giao diện cho tới khi anh quyết.
**Nghiệm thu:** [ ] mỗi công cụ có đặc tả, test engine, test quyền lợi (không Hội viên thì không dùng được); [ ] Hội viên vẫn `availability` giữ; [ ] 2–3 lần thử tay mỗi công cụ do anh/đồng nghiệp.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P0-4, BE-P0-5, BE-P2-6.

### BE-P1-15 — Engine Bát Tự / Tứ Trụ (R11: xây)
**Vì sao:** anh chọn xây cả Hợp đôi và hệ thứ hai (Bát Tự); OD-005 phương án C (Tử Vi + Bát Tự cùng lúc). Hiện `packages/engine-adapters/src` chỉ có `ziwei/`. Từ khoá "lá số bát tự" 50.000/tháng (+900%) là nhu cầu mạnh nhất sau Tử Vi (`05-chu-de-moi-tu-seo.md`).
**Việc:** (i) chọn thư viện/engine (xem `Product Scope`: `mingyu` + fixtures độc lập; giấy phép MIT ưu tiên) và ghi quyết định; (ii) chuẩn hoá hợp đồng `normalized-bazi-chart-v1` (4 trụ, tàng can, thập thần, ngũ hành, Nhật chủ, đại vận Bát Tự); (iii) adapter + fixtures đối chiếu độc lập; (iv) lưu lá số (bảng/migration mới), bằng chứng (evidence keys), quy tắc khoá phiên bản như Tử Vi; (v) lá số Bát Tự miễn phí (dữ kiện) và báo cáo trả phí (writer theo khuôn, chạy cổng nhẹ + 2–3 bài thử tay); (vi) SKU Bát Tự toàn diện; (vii) múi giờ/tiết khí đúng (ranh giới tiết khí quyết định trụ tháng).
**Nghiệm thu:** [ ] fixtures ≥30 lá số đối chiếu độc lập (lệch = 0 hoặc giải thích); [ ] kiểm biên tiết khí và giờ Tý; [ ] test mua/đọc/hoàn Lá; [ ] 2–3 bài thử tay.
**Ưu tiên:** P1. **Phụ thuộc:** — (độc lập với Tử Vi; Hợp đôi cần nó).

### BE-P1-16 — Hợp đôi (hai người) trên Tử Vi + Bát Tự, kèm kiểm tra pháp lý dữ liệu người thứ hai
**Vì sao:** anh quyết: làm cả Hợp đôi; **người thứ hai không cần đồng ý, một người xem cho cả hai** (R11). Đây là thay đổi so với giả định cũ (OD-005 "luật đồng ý của người thứ hai"). **Cờ pháp lý (không bỏ):** ngày sinh/giờ sinh của người thứ hai là dữ liệu cá nhân theo **Nghị định 13/2023/NĐ-CP**; theo nguyên tắc của anh "chỉ luật Việt Nam là ranh giới", kiểm tra pháp lý sẽ quyết định thiết kế cuối cùng. An **không tự giả định** mà thiết kế để chịu được kết quả kiểm tra.
**Việc:**
- Hợp đồng `compatibility-v1`: đầu vào hai hồ sơ sinh (hồ sơ thứ hai **tối thiểu**: ngày/giờ/giới tính và một nhãn gọi tên tự đặt, không họ tên thật, không số điện thoại/email/địa chỉ); đầu ra: tương hợp theo Tử Vi (so cung Mệnh, Phu Thê, Phúc Đức… giữa hai lá số) cộng Bát Tự (ngũ hành, thập thần, hợp/xung/hình giữa hai trụ).
- Lưu trữ tối thiểu: **không lưu hồ sơ người thứ hai ngoài thời gian cần để dựng bài đọc** (hoặc lưu đúng thời hạn ngắn đã duyệt), xoá khi xoá dữ liệu của chủ tài khoản, không dùng cho mục đích khác; không đưa vào AI những trường nhận dạng (chỉ nhãn tự đặt).
- Chữ chính sách bảo mật và câu thông báo ở bước nhập người thứ hai (soạn cùng Claude, **chờ kết quả kiểm tra pháp lý**).
- SKU Hợp đôi 600 Lá (FD-105; chưa có trong `la-catalog.ts`), writer + cổng nhẹ, mua/đọc/hoàn Lá.
- Cờ cấu hình `compat.counterpartyConsent` (`none | notice | confirm`) để đổi thiết kế theo kết quả pháp lý mà không viết lại.
**Nghiệm thu:** [ ] test hợp đồng + dữ liệu tối thiểu (không có trường dư); [ ] test xoá; [ ] 2–3 bài thử tay; [ ] **không bật bán** cho tới khi anh ghi kết quả kiểm tra pháp lý vào tracker.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P1-15; kết quả kiểm tra pháp lý (việc của anh) để bật bán.

### BE-P1-17 — Chủ đề mới (R12: làm ngay, xếp hạng theo từ khoá Google trong repo)
**Việc:** thêm chủ đề theo khuôn `TOPIC_PALACE_SCOPES` (`ziwei-topic-deep-dive-v1.ts:28-62`): ID chủ đề, cung chính/phụ, tiêu đề VI/EN, SKU, prompt, cổng, 2–3 bài thử tay mỗi chủ đề. **6 chủ đề đầu theo `05-chu-de-moi-tu-seo.md` mục 4:** (1) Kinh doanh và làm ăn, (2) Đổi việc và bước ngoặt sự nghiệp, (3) Gia đạo và con cái, (4) Duyên số theo năm (chỉ khi khác biệt rõ với Tình duyên), (5) Học hành và con đường nghề, (6) Nhà đất và an cư. Mỗi chủ đề một ticket con khi bắt đầu; giá tạm 480 Lá.
**Nghiệm thu:** [ ] mỗi chủ đề có test cấu hình cung, cổng tự động, mua/đọc/hoàn Lá; [ ] 2–3 bài thử tay mỗi chủ đề; [ ] bật bằng danh mục, thẻ tự hiện.
**Ưu tiên:** P1. **Phụ thuộc:** BE-P0-2, BE-P0-8.

---

## P2

### BE-P2-1 — Cung lưu niên từng năm trong chặng
Xác nhận cung theo địa chi của năm khớp `yearly.index` của iztro; xuất cho dải "10 năm của chặng này". **File:** `iztro-horoscope.ts`. **Nghiệm thu:** [ ] 7 lá số × 10 năm. **Phụ thuộc:** BE-P0-8.

### BE-P2-2 — Xuất lưu Hoá (lưu niên, đại vận) ra `ZiweiHoroscopeResultV1`
`yearly.mutagen` đang dùng nội bộ nhưng không xuất; kiểm `decadal.mutagen` (cần cho BE-P0-4 tín hiệu đại vận). Khi có, đoạn Năm nay có neo thật ("lưu Hoá Kỵ nhập cung Tài Bạch"). **File:** `iztro-horoscope.ts`, `ziwei-horoscope-v1.ts`. **Nghiệm thu:** [ ] test; [ ] chỉ thêm trường tuỳ chọn. **Ưu tiên:** P2 nhưng nên làm cùng BE-P0-4.

### BE-P2-3 — Dọn hai danh mục
`config/product-catalog.json` còn giá VND cũ (Trọn đời 79.000đ…) và `purchase-offer-presentation.ts:143` vẫn có "79.000 ₫"; giá thật nằm ở `la-catalog.ts`. Quyết bỏ hay giữ làm tham chiếu. **Nghiệm thu:** [ ] chỉ còn một nguồn giá bán. **Phụ thuộc:** —

### BE-P2-4 — Tầng "tiểu hạn" (nhịp từng tuổi)
Engine có `age` nhưng ta không dùng. R12 anh không nhắc riêng tầng này; để sau, làm dữ kiện thêm cho Năm/Chặng nếu anh muốn. **Phụ thuộc:** BE-P0-8.

### BE-P2-5 — "Tuần này của bạn" (tuỳ chọn)
Từ khoá "tử vi tuần mới" 50.000/tháng (nhu cầu chung, `05`). An kiểm xem gộp lưu nhật theo tuần có hợp lý và đúng ranh giới tháng/Tết không; nếu hợp, SKU mới giá giữa Hôm nay (60) và Tháng (300). **Ưu tiên:** P2, chỉ làm khi anh gật sau khi xem đề xuất.

### BE-P2-6 — "Hôm nay của bạn": kiểm ranh giới ngày và liên kết công cụ
Món đang bán; kiểm lưu nhật quanh nửa đêm (múi giờ Việt Nam), tháng nhuận, ranh giới Tết; chuẩn bị điểm nối cho công cụ "Chọn ngày theo lá số" của BE-P1-14. **Nghiệm thu:** [ ] test ngày 2027-02-05/06 và cuối tháng nhuận; [ ] 2–3 lần thử tay. **Phụ thuộc:** BE-P0-3.

### Ghi chú về Tây phương
Anh trả lời R11 chỉ cho Hợp đôi và Bát Tự. **Bản đồ sao Tây phương không có trong câu trả lời → vẫn hoãn** (giấy phép engine cần duyệt; `Product Scope` ghi "License gate").

---

## Việc của anh (không phải ticket backend)

1. **Kiểm tra pháp lý dữ liệu người thứ hai (Hợp đôi):** Nghị định 13/2023/NĐ-CP — dữ liệu tối thiểu, thời hạn lưu, chữ chính sách bảo mật, có cần thông báo/đồng ý hay không. Kết quả ghi vào tracker (cập nhật OD-005) rồi An đặt `compat.counterpartyConsent`.
2. **Kiểm tra pháp lý nội dung:** liệt kê điều luật Việt Nam cấm thực sự áp dụng cho luận giải (ví dụ các chủ đề FD-075) để cổng cứng chỉ chặn đúng những điều đó (quy tắc chung số 5).
3. Duyệt thẻ nghĩa và giọng văn (GĐ3); duyệt quy tắc tháng cần chú ý sau báo cáo phân bố (BE-P0-4).
4. Thử tay 2–3 bài mỗi món cùng đồng nghiệp; gửi ảnh chụp cho Claude.

## Ghi chú cho người tạo ticket
- Ticket P0 tạo ngay (không cần quyết định nào nữa). P1 tạo theo thứ tự đường găng ở trên; BE-P1-14…17 có thể tạo khi An sẵn sàng nhận.
- Mỗi ticket ghi rõ file, tiêu chí nghiệm thu, dòng "Phụ thuộc" như trên.
- FD-116 "không hỏi lại API/mô hình/giá": R1/R2 đã trả lời nên không còn câu mở về tiền AI; trần và cảnh báo ở BE-P1-5 là cấu hình chốt.
