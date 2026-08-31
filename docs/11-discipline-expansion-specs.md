# 11 — Discipline Expansion & Build Specs

Nguồn: `data/divination_repo_coverage.xlsx` (27 bộ môn, coverage repo/license) đối chiếu với `data/lasoviet_research_master.xlsx` (571 keyword, cluster theo bộ môn). Tài liệu này chốt **bộ môn nào build, theo batch nào, spec ra sao** — kế tiếp `docs/04-phase-1-product-spec.md` và `docs/06-technical-architecture.md`.

## 1. Mục đích & phạm vi

Từ 27 bộ môn trong workbook coverage, tài liệu này chọn ra **12 bộ môn** thực sự phù hợp và phổ biến với thị trường Việt Nam, tổ chức theo **Batch** (nhóm theo engine sẵn có, không phải thuần theo volume) để tối đa hoá đòn bẩy kỹ thuật: tích hợp một engine MIT (`Brhiza/mingyu`) một lần có thể mở khóa nhiều bộ môn cùng lúc.

Không đổi các quyết định đã "Chốt" trong `docs/10-decision-log.md` (Tử Vi = P0, Bát Tự/Bản đồ sao = P1, Kinh Dịch sau, không bán vật phẩm phong thủy Phase 1). Tài liệu này **bổ sung** phạm vi cho các bộ môn chưa có quyết định, và nêu 2 đề xuất xét lại có căn cứ dữ liệu (đánh dấu rõ, cần founder confirm — xem §7).

## 2. Tại sao 12/27 bộ môn

Workbook liệt kê 27 bộ môn với repo coverage, nhưng coverage kỹ thuật không đồng nghĩa nhu cầu thị trường. Đối chiếu keyword data, 15 bộ môn bị loại vì gần như không có tín hiệu tìm kiếm tiếng Việt và/hoặc là nhánh chuyên sâu ít người biết đến ở VN (dù có repo MIT sẵn): **Kỳ Môn Độn Giáp, Mai Hoa Dịch Số, Lục Hào, Bài Lenormand, Chiêm Tinh Vệ Đà, Chiêm Tinh Vấn Sự (Horary), Bài Oracle, Bói Rune, Bói Con Lắc, Bói Cầu Pha Lê, Scrying**. Ngoài ra 2 hệ chỉ xuất hiện trong mô tả text của `mingyu` chứ không nằm trong taxonomy 27 bộ môn — **Liuren (Đại Lục Nhâm), Taiyi (Thái Ất)** — cũng bị loại vì cùng lý do.

Chi tiết từng bộ môn bị loại: §5.

## 3. Bản đồ 12 bộ môn theo Batch

| # | Bộ môn | Volume (bucket) | Batch | Engine | Hình thức |
|---|---|---|---|---|---|
| 1 | Tử Vi Đẩu Số | 100K–1M | Batch 0 (đã build) | iztro (MIT) | Paid SKU — P0, chốt |
| 2 | Bát Tự / Tứ Trụ | 10K–100K | Batch 1 (mingyu) | mingyu (MIT) | Paid SKU — P1, chốt |
| 3 | Bản Đồ Sao / Chiêm Tinh Tây Phương | 100K–1M | Batch 2 (license-gated) | TBD — xem §4.1 | Paid SKU — P1, chốt vị trí, chưa chốt engine |
| 4 | Kinh Dịch / Chu Dịch | 10K–100K | Batch 1 (mingyu) | mingyu (MIT) | Paid SKU (câu hỏi tình huống) — P1, chốt |
| 5 | Thần Số Học | 100K–1M | Batch 3 (tự xây) | native, không dependency | Free ngay, paid sau — **đề xuất nâng ưu tiên** |
| 6 | Xem Ngày / Chọn Ngày Tốt | 10K–100K | Batch 1 (mingyu) | mingyu (MIT) | Free utility |
| 7 | 12 Con Giáp | 10K–100K | Batch 1 (mingyu, partial) | mingyu (MIT, partial) / native | Free content |
| 8 | Phong Thủy (tính toán) | 10K–100K | Batch 1 (mingyu) | mingyu (MIT) | Free content/calculator — **không bán vật phẩm** |
| 9 | Giải Mã Giấc Mơ / Điềm Báo | 1K–10K + long-tail | Content-only | Không cần engine | Free content hub |
| 10 | Tarot / Bói Bài (gồm Bài Tây) | 10K–100K (cụm) | Batch 1 (mingyu) | mingyu (MIT) + tarot-api (MIT, ref) | Free content + rút bài mỗi ngày |
| 11 | Xem Chỉ Tay | 1K–10K | Batch 4 (pilot ảnh) | yeonsumia/palmistry (license cần audit) hoặc MediaPipe (Apache-2.0) | Pilot thử nghiệm, không thu phí |
| 12 | Nhân Tướng / Xem Mặt | 1K–10K | Batch 4 (hoãn) | darktaoist/aura (license chưa rõ) | Hoãn tới khi đủ uy tín — điều kiện ở §4.3 |

## 4. Specs chi tiết theo nhóm

### 4.1 Nhóm A — Paid chart-system

**Bát Tự / Tứ Trụ**
- Engine: `Brhiza/mingyu` (MIT) primary, cross-check `Zijian-Ni/tianji` (MIT) — theo `docs/06`.
- SKU: launch **1 báo cáo tổng hợp** ("Luận giải Bát Tự") thay vì nhân bản 4 SKU như Tử Vi ngay từ đầu — giảm effort QA/evidence review; mở rộng theo topic khi có traffic thật đo được (đúng nguyên tắc rubric ở `docs/05`).
- Trang mới cần thêm vào sitemap: `/luan-giai-bat-tu` (commercial — hiện chưa có trong `docs/03`).

**Bản Đồ Sao / Chiêm Tinh Tây Phương** — license gate, thử theo thứ tự:
1. Đánh giá `VedAstro` (MIT) — Vedic-first nhưng dùng Swiss Ephemeris qua API, kiểm tra có hỗ trợ tropical zodiac/Placidus house (chuẩn Tây phương) không. Rủi ro thấp nhất vì đã MIT.
2. Mua license thương mại Swiss Ephemeris (Astrodienst), tự viết lớp tính toán house/aspect mỏng trên ephemeris đã licensed — không đụng code AGPL.
3. Cô lập `g-battaglia/kerykeion` (AGPL) như microservice network-only, chỉ sau khi legal review boundary AGPL (theo D-015). Rủi ro cao nhất, làm cuối cùng.
- Không viết code tính toán nào trước khi chốt 1 trong 3 hướng trên.

**Kinh Dịch / Chu Dịch**
- Engine: `mingyu` (MIT) module Liuyao.
- UX khác biệt: input là **câu hỏi + thời điểm gieo quẻ**, không phải birth profile → nhập câu hỏi → gieo quẻ ảo → quẻ chủ/biến/hào động → diễn giải.
- Free: 1 lượt gieo + tóm tắt ý nghĩa quẻ. Paid: diễn giải sâu theo câu hỏi cụ thể.
- Bắt buộc rate-limit/cooldown theo user/câu hỏi để tránh gieo lặp lại "săn" kết quả tốt (rủi ro đã nêu ở `docs/07 §4`).

**Thần Số Học — đề xuất nâng ưu tiên** (xem căn cứ đầy đủ ở §7-D)
- Build song song, không chờ Bát Tự/Kinh Dịch. Launch ngay sau Tử Vi P0 như nhánh free acquisition độc lập tại `/than-so-hoc`.
- Engine: tự xây (Pythagorean numerology thuần công thức) — `Brij-star/numerology-calculator` (MIT) chỉ dùng làm formula reference, không phải dependency.
- Dùng chung Birth Profile data model với Tử Vi; cross-link 2 chiều ("Bạn cũng có thể xem Lá số Tử Vi đầy đủ").
- Paid tier "Thần Số Học chuyên sâu" chỉ mở khi có tín hiệu WTP rõ qua traffic thật — **không paid ngay khi launch**.

### 4.2 Nhóm B — Free content/utility

| Bộ môn | Input | Output | Trang | Vai trò chuyển đổi |
|---|---|---|---|---|
| Xem Ngày/Ngày tốt | Loại việc (cưới hỏi, khai trương, xuất hành...) + khoảng thời gian | Danh sách ngày tốt/xấu kèm lý do (Hoàng Đạo/Hắc Đạo, Tam Nương) | `/ngay-tot` (đã có, đẩy vào Batch 1) | Traffic lặp lại, internal link sang calculator chính |
| 12 Con Giáp | Năm sinh | Trang tổng quan + trang riêng từng con giáp | `/12-con-giap` (đã có, đẩy sớm vì rẻ + mùa vụ Tết) | Top-of-funnel theo mùa vụ, CTA vào Tử Vi |
| Phong Thủy | Tuổi/mệnh + hạng mục (hướng nhà/bếp/bàn làm việc) | Hướng/màu hợp mệnh, dùng module Bát Trạch của mingyu | `/kien-thuc/phong-thuy` (content) + `/phong-thuy/huong-nha` (calculator nhỏ) — **cả hai đều mới, chưa có trong sitemap** | Retention (chuyển nhà, sửa nhà, mở văn phòng), chuẩn bị data cho Giai đoạn 2 |
| Giải Mã Giấc Mơ/Điềm Báo | Từ khóa biểu tượng giấc mơ | Bài biên tập ngắn: ý nghĩa dân gian + góc nhìn biểu tượng | `/giai-ma-giac-mo` (mới, content-only, không cần engine) | SEO long-tail rẻ nhất toàn danh sách |
| Tarot/Bói Bài | Không cần dữ liệu sinh | Rút 1 lá/ngày (habit loop) + rút 3 lá theo câu hỏi | `/boi-bai` hoặc `/tarot` (mới, chưa có trong sitemap) | Retention loop, không phải doanh thu trực tiếp |

**Lưu ý an toàn bắt buộc — Giải Mã Giấc Mơ**: văn hoá VN hay gắn giấc mơ với số đánh đề. Mọi trang phải có disclaimer rõ "góc nhìn dân gian/biểu tượng, không phải dự đoán số" và **không được** gợi ý, liên kết hay nhắc tới số lô đề dưới bất kỳ hình thức nào — theo đúng nguyên tắc an toàn ở `MASTER_CONCEPT.md §8`.

**Làm rõ phạm vi D-010 (Phong Thủy)**: D-010 chặn **bán vật phẩm** phong thủy (vòng tay, đá, sim phong thủy), không chặn **tính toán/nội dung** phong thủy. Mục này bổ sung phạm vi content/calculator miễn phí, không chạm ranh giới D-010 — cần founder xác nhận đây là làm rõ, không phải huỷ D-010 (xem §7-E).

### 4.3 Nhóm C — Thử nghiệm ảnh sinh trắc học

**Xem Chỉ Tay (pilot)**
- Trước khi dùng `yeonsumia/palmistry` production: audit license thực tế (đang để trống trong workbook). Nếu không đủ rõ ràng cho dùng thương mại, thay bằng tự dựng landmark detection trên MediaPipe (Apache-2.0) + rule diễn giải tự viết.
- Upload ảnh là hành động chủ động của user (không bắt buộc để dùng các chart khác), có consent riêng biệt cho ảnh sinh trắc học, **xoá ảnh ngay sau xử lý** hoặc theo retention policy ngắn có công bố, disclaimer "giải trí/tự chiêm nghiệm, không phải khoa học chính xác".
- Không thu phí ở giai đoạn pilot — đo engagement/complaint rate trước khi cân nhắc mở rộng hoặc monetize.

**Nhân Tướng / Xem Mặt (deferred)**
- Giữ nguyên hoãn theo quyết định của founder trong phiên brainstorm này.
- Điều kiện mở lại (đề xuất, không gắn ngày cụ thể): sau khi platform qua Gate 3 (`docs/09`) — đã có traffic ổn định và bằng chứng trust rõ ràng (ví dụ: đã qua ít nhất 1 chu kỳ Tết với retention/review tốt).
- Ghi nhận trong decision log là "future, condition-gated", không đưa vào roadmap gần hạn nào.

## 5. Bộ môn bị loại (không đưa vào roadmap gần hạn)

| Bộ môn | Lý do loại |
|---|---|
| Kỳ Môn Độn Giáp | Có repo (mingyu) nhưng volume thấp (1K–10K), nhánh chuyên sâu ít người VN biết |
| Mai Hoa Dịch Số | Tương tự — volume thấp, chuyên sâu |
| Lục Hào | Volume rất thấp (100–1K), trùng lặp kỹ thuật với Kinh Dịch nhưng không đủ demand riêng |
| Bài Lenormand | Volume rất thấp (100–1K), gần như không có dấu ấn văn hoá VN |
| Chiêm Tinh Vệ Đà (Vedic/Jyotish) | Engine sẵn sàng (VedAstro, MIT) nhưng không có tín hiệu tìm kiếm VN nào |
| Chiêm Tinh Vấn Sự (Horary) | Không có tín hiệu tìm kiếm VN |
| Bài Oracle | Volume thấp (100–1K), không có repo |
| Bói Rune | Không có tín hiệu tìm kiếm VN, không có repo |
| Bói Con Lắc | Không có tín hiệu tìm kiếm VN, không có repo |
| Bói Cầu Pha Lê | Không có tín hiệu tìm kiếm VN, không có repo |
| Scrying/Soi Gương Tiên Tri | Không có tín hiệu tìm kiếm VN, không có repo |
| Liuren (Đại Lục Nhâm) | Không nằm trong taxonomy 27 bộ môn của workbook, chỉ xuất hiện trong mô tả text của mingyu; không có tín hiệu tìm kiếm VN |
| Taiyi (Thái Ất) | Tương tự Liuren |

Không loại vĩnh viễn — nếu Search Console sau launch phát hiện cụm từ khóa mới đáng kể cho bất kỳ mục nào ở trên, xem lại theo đúng tinh thần D-016.

## 6. Việc cần cập nhật ở các file khác trong repo

- `config/discipline-roadmap.json` — cập nhật theo bảng batch ở §3 (đã cập nhật trong commit này).
- `docs/03-sitemap-and-seo.md` — thêm các trang mới: `/luan-giai-bat-tu`, `/kien-thuc/phong-thuy`, `/phong-thuy/huong-nha`, `/giai-ma-giac-mo`, `/boi-bai`; điều chỉnh phase của `/than-so-hoc`, `/12-con-giap`, `/ngay-tot` từ "sau P0" thành Batch 1 (đã cập nhật trong commit này).
- `docs/10-decision-log.md` — thêm các quyết định mới D-017 → D-021 (đã cập nhật trong commit này).
- `docs/07-content-and-growth.md` và `config/product-catalog.json` — **chưa cập nhật trong lượt này**; cần content/growth team bổ sung content pillar cho Thần Số Học/12 Con Giáp/Giấc Mơ/Phong Thủy, và chỉ thêm SKU Bát Tự vào `product-catalog.json` khi giá đã được quyết định (hiện vẫn là hypothesis theo `docs/05 §7`). Không block việc An tích hợp phần calculator/content.

## 7. Quyết định mới cần founder confirm

Các điểm dưới đây là đề xuất từ phiên brainstorm này, có căn cứ dữ liệu, nhưng đụng vào phạm vi các quyết định đã "Chốt" — cần xác nhận trước khi coi là final:

**D — Thần Số Học nâng ưu tiên xây song song với Bát Tự.**
Căn cứ: volume 500K (dù YoY –90% nhưng base tuyệt đối vẫn rất lớn theo bucket Planner), long-tail rộng (tra cứu, pitago, theo tên, tình yêu, ngày sinh, online, miễn phí — 12 keyword có volume trong cluster), zero rủi ro license (công thức thuần, không phụ thuộc repo ngoài), zero rủi ro kỹ thuật (không cần chuyển đổi âm-dương lịch như Tử Vi/Bát Tự). Không đổi thứ tự SKU trả phí (Bát Tự/Bản đồ sao vẫn theo D-008); chỉ thêm 1 nhánh free chạy sớm hơn dự kiến ban đầu.

**E — Làm rõ phạm vi D-010: tính toán phong thủy (miễn phí) khác bán vật phẩm phong thủy (vẫn cấm).**
Căn cứ: "hướng nhà hợp tuổi" và cụm Phong Thủy có volume thật (10K–100K cho từ khóa gốc) nhưng tách biệt rõ khỏi các từ khóa commerce (`vật phẩm phong thủy`, `vòng phong thủy`, `đá phong thủy` — vẫn giữ nguyên excluded theo D-010). Đề xuất này không mở lại việc bán hàng, chỉ mở content/calculator.

Nếu founder không phản hồi gì khác, 2 đề xuất trên coi là chấp nhận theo mặc định của tài liệu này và sẽ được ghi "Chốt" trong lần cập nhật decision log kế tiếp.
