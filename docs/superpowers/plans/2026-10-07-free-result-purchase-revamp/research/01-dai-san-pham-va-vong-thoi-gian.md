# Rà soát dải sản phẩm và vòng thời gian Tử Vi (nghiên cứu cho Q1 và Q5)

Ngày: 07/10/2026. Nhánh: `plan/free-result-purchase-revamp`. Đây là **nghiên cứu**, không phải mã sản xuất. Không có file nào khác bị sửa.

Viết cho Lãm đọc (tiếng Việt thường). Phần kỹ thuật cho An nằm trong các khung có ghi **[Cho An]**.

## Cách đọc nhãn bằng chứng

| Nhãn | Nghĩa |
|---|---|
| **[Mã: đường dẫn:dòng]** | Đã đọc trực tiếp trong mã nguồn của nhánh này. |
| **[Chạy thử]** | Em chạy engine thật (iztro 2.6.0 có sẵn trong repo) với lá số tổng hợp để xem kết quả. Không dùng dữ liệu thật của ai. Script nháp nằm ngoài repo. |
| **[Kaneo #N]** | Đọc từ ticket/bình luận Kaneo (dự án La so viet). |
| **[Tài liệu]** | Đọc từ file trong `docs/` hoặc `plan/`. |
| **[Web: URL]** | Lấy từ trang web, đã tóm tắt lại bằng lời của em. |
| **[Lãm quan sát]** | Do chính Lãm mô tả trong yêu cầu (ảnh AiTuvi anh đã xem). Em không tự kiểm lại. |
| **[Suy luận]** | Em suy ra từ các dữ kiện trên. Chưa được kiểm chứng. |

---

## 1. Tóm tắt

**Trả lời ngắn cho hai câu hỏi của Lãm.**

1. **"Engine đã đủ để làm mọi luận giải chưa?"** Đúng với **Tử Vi**, sai với **các môn khác**.
   - Engine Tử Vi (iztro) tính được mọi tầng thời gian cho **bất kỳ năm/tháng nào** của một lá số: chặng 10 năm (đại vận), tiểu hạn, lưu niên, lưu nguyệt, lưu nhật, lưu giờ. [Mã] `iztro-horoscope.ts:184,196,406`; [Chạy thử] 2026, 2027, 2030, 2035 đều ra đúng cung. Lưu ý: engine có tầng tiểu hạn nhưng **ta chưa dùng** nó ở đâu cả (em không tìm thấy chỗ nào dùng).
   - Phần **code backend của cả 4 món đang "Sắp mở"** (Tình duyên, Công việc, Tháng này, Vận hạn 2026) **đã viết xong, đã triển khai**, kèm cả mua/đọc/hoàn Lá. [Kaneo #58, #63] bình luận An ngày 01/10: "deployed via PR237/240".
   - **Không đủ** cho: Hợp đôi (chưa có engine Bát Tự, chưa có bảng dữ liệu, chưa có đồng ý của người thứ hai), Bát Tự, Tây phương. [Kaneo #66] bình luận 30/09, 01/10; [Mã] `packages/engine-adapters/src` chỉ có thư mục `ziwei`.

2. **"4 món Sắp mở bị giữ vì UI hay vì BE?"** **Không phải UI, cũng không phải thiếu BE.** Mỗi món bị giữ vì:
   - **(b) cổng chất lượng nội dung**: luật FD-082 / ticket yêu cầu **20 bản viết thật đạt liên tiếp** cho từng loại (Tình duyên, Công việc, Tháng, Năm = 4 đợt × 20) rồi mới được bán. Chưa chạy đợt nào.
   - **(a) quyết định của chủ**: ngân sách chạy các đợt này **chưa được duyệt**. FD-112 chỉ duyệt đợt Trọn đời; FD-116 ghi "writer campaigns held". Riêng Hội viên/Combo/Hợp đôi bị giữ do quyết định ngày 30/09 và 07/10.
   - Hội viên còn thiếu thêm (c) công cụ trả phí đã hứa chưa có đặc tả. Hợp đôi thiếu (c) engine Bát Tự.

3. **Phát hiện mới em thấy khi rà (Lãm chưa hỏi nhưng quan trọng):**
   - **Sản phẩm "Vận hạn năm 2026" bị cứng theo năm 2026** ở tên SKU, ở backend (4 chỗ), ở một bộ kích hoạt cơ sở dữ liệu (migration 0054) và ở thẻ trên trang chọn. Sang năm 2027 sản phẩm này **không bán được nữa dù mở khóa**. Hôm nay là 27/8 âm lịch; năm Bính Ngọ **còn khoảng 4 tháng** (Tết Đinh Mùi là 06/02/2027). [Mã] mục 3.3; [Chạy thử] ngày Tết.
   - Đúng như Lãm nghĩ: **đại vận của mỗi người khác nhau**. Chạy thử 7 lá số: năm 2026 rơi vào chặng khác nhau, cung khác nhau, và số năm còn lại của chặng từ 2 đến 8 năm. [Chạy thử] mục 4.2.
   - **Trọn đời (960 Lá) hiện chỉ có đúng một đoạn "đại vận hiện tại", một đoạn "năm hiện tại" và các đoạn mồi ngắn cho tối đa 7 chặng khác.** Không có mười hai tháng, không có năm sau, không có chặng kế tiếp đầy đủ. [Mã] `ziwei-comprehensive-report-v2.ts:127-134`, `ziwei-comprehensive-report-v4-1.ts:5-17`. Vì vậy câu "phần năm 2026 và đại vận hiện tại nằm trong Trọn đời" **đúng nhưng mỏng**. Cần nói thật khi dùng câu này.
   - **Hai khái niệm "tháng hạn" khác nhau** trong mã: số "N tháng cần chú ý" ở trang miễn phí dùng luật riêng (có đoạn **ép tối thiểu 1 tháng hạn** nếu lá số không có), còn bản trả phí dùng dữ kiện Hóa Kỵ lưu nguyệt. Hai nơi có thể nói khác nhau. Việc này đụng nguyên tắc "claim phải bám engine". [Mã] `iztro-horoscope.ts:315-330` so với `period-reading-facts.ts:41-46`. Chuyển cho An ở mục 7.
   - Hàm tính hạn cũng **không an toàn khi hỏi năm tương lai**: `targetYear` chỉ đổi 12 tháng, còn "cung lưu niên" vẫn lấy theo ngày hiện tại. [Mã] `iztro-horoscope.ts:184,196`. Cần sửa trước khi bán "năm sau".
   - Backend lấy "năm" theo **lịch dương** (1/1), còn engine đổi năm ở **Tết**. Từ 1/1 đến 5/2/2027 hai bên lệch nhau. [Mã] `identity-report-config.ts:366-381`; [Chạy thử] `2027-01-15` vẫn ra Bính Ngọ, `2027-02-06` mới ra Đinh Mùi.

**Đề xuất tổng (chi tiết ở mục 6 và 8):**
- Bán theo **hành trình đọc của khách**, theo từng tầng thời gian của **chính người đó**, không bán theo "năm 2026" cố định.
- Tạo **một sản phẩm "Chặng 10 năm của bạn"** (đại vận hiện tại hoặc kế tiếp, tự chọn theo người) và **biến "Vận hạn năm 2026" thành "Vận hạn năm [Y]"** có tham số năm. Hai món này là thứ khách hỏi nhiều nhất mà ta đang thiếu.
- Trước hết sửa độ trung thực của số liệu năm/tháng (mục 7, B1), rồi mới chạy đợt 20 bản.
- Giá giữ theo FD-105 khi có thể; món mới (Chặng 10 năm) đề xuất **360 Lá**, cần Lãm duyệt.

---

## 2. Kiểm kê sản phẩm

Nguồn chính: danh mục Lá trong `packages/contracts/src/la-catalog.ts` (là nguồn bán thật; ví/mua đều đọc từ đây). Danh mục VND cũ `config/product-catalog.json` vẫn còn (xem ghi chú dưới bảng).

**Loại lý do giữ:** (a) quyết định/giữ của chủ; (b) cổng chất lượng nội dung; (c) thiếu backend/engine; (d) chỉ thiếu giao diện.

### 2.1 Bảng sản phẩm

| SKU | Tên khách thấy | Giá | Bán được? | Lý do giữ (loại) và bằng chứng |
|---|---|---|---|---|
| `ZIWEI-IDENTITY-P0` | Tử Vi trọn đời | 960 Lá | **Bán** | Không giữ. [Mã] `la-catalog.ts:61-68` (`availability: "active"`). Chuỗi 20 bản v4.2 + 5 bản Lãm xem: FD-112 duyệt chạy; FD-115 (06/10) Lãm nhận bản đã triển khai và đóng LSV68, miễn phần chạy chiến dịch thật còn lại. [Tài liệu] tracker FD-112, FD-115. |
| `ZIWEI-NATAL-EXCERPT-P0` | Bản mệnh và tiềm năng | 240 Lá | **Bán** (chỉ tiếng Việt) | [Mã] `la-catalog.ts:70-77`. |
| 12 × `ZIWEI-PALACE-*-P0` | Một cung (Mệnh, Huynh Đệ, Phu Thê, Tử Tức, Tài Bạch, Tật Ách, Thiên Di, Nô Bộc, Quan Lộc, Điền Trạch, Phúc Đức, Phụ Mẫu) | 120 Lá mỗi cung | **Bán** | [Mã] `la-catalog.ts:97-215`. Dùng chung lượt viết của báo cáo bản mệnh. [Mã] `natal-report-reservation.ts:10`. |
| `ZIWEI-TODAY-P0` | Hôm nay của bạn | 60 Lá | **Bán** | [Mã] `la-catalog.ts:217-224`. LSV62 đã Done. [Kaneo #62] Trọn đời kèm 7 ngày Hôm nay (FD-105). |
| `ZIWEI-RELATIONSHIP-P0` | Tình duyên và hôn nhân | 480 Lá | **Giữ** | **(b) + (a)**. Code đã xong: writer, đọc, hoàn Lá, chỉ chờ "20 bản thật đạt liên tiếp mỗi chủ đề". [Mã] `la-catalog.ts:79-86`, `topic-deep-dive-writer-v4.ts`, `wallet-unlock.service.ts:339,572`. [Kaneo #58] 01/10: "20 consecutive real passing generations PER topic"; xin chủ duyệt trần chi phí và model; chưa duyệt. FD-112: "Other writer campaigns default to deferred". |
| `ZIWEI-CAREER-P0` | Công việc và tài lộc | 480 Lá | **Giữ** | Như trên. [Mã] `la-catalog.ts:88-95`. |
| `ZIWEI-MONTHLY-P0` | Tháng này của bạn | 300 Lá | **Giữ** (và **không có thẻ** trên trang chọn) | **(b) + (a)**. Code xong (PR232/237/240). Chờ 20 bản thật. [Mã] `la-catalog.ts:226-233`, `period-reading-writer.ts`, `period-reading-facts.ts`. [Kaneo #63] 01/10. Thẻ không có trong `FIXED_SKUS`. [Mã] `offer-ladder.tsx:15`. |
| `ZIWEI-YEAR-2026-P0` | Vận hạn năm 2026 | 480 Lá | **Giữ** | **(b) + (a)** như Tháng. **Thêm vấn đề (c)**: SKU và backend cứng năm 2026, xem 3.3. [Mã] `la-catalog.ts:235-242`; `wallet-unlock.service.ts:581,648,814,1002`. |
| `ZIWEI-COMBO-2026-P0` | Combo Trọn đời + Vận hạn 2026 | 1.300 Lá | **Giữ** | **(b)**: chờ Năm 2026 đạt. Code xong. [Kaneo #65] 01/10: "release only after both constituents pass acceptance". Cũng cứng 2026 ở **cơ sở dữ liệu**: `0054_combo_entitlement_authority.sql:19-23`. |
| `MEMBERSHIP-MONTHLY-P0` (+ bản trùng `-1500`) | Hội viên tháng | 1.500 Lá / 30 ngày | **Giữ** | **(a) + (c)**. Code mua/hết hạn đã có. Lãm chọn A ngày 30/09: giữ bán cho đến khi quyền lợi đã hứa có thật. Quyền lợi "công cụ trả phí theo lá số" **chưa có đặc tả** (đầu vào, đầu ra, giới hạn, đồng ý dữ liệu). Quyền lợi "Nguyệt vận" phụ thuộc Tháng này. [Kaneo #64] 30/09, 01/10. [Mã] `la-catalog.ts:253-287`, `membership.service.ts:79`, `la-packs.ts:95,125` (`comingSoon: true`). |
| `MEMBERSHIP-YEARLY-P0` (+ `-8000`) | Hội viên năm | 8.000 Lá / 365 ngày | **Giữ** | Như trên. |
| *(chưa có SKU)* | Hợp đôi (hai lá số) | 600 Lá (FD-105) | **Chưa tồn tại** | **(c) + (a)**. Không có trong `la-catalog.ts`. OD-005 chọn phương án C: Tử Vi **cộng** Bát Tự cùng lúc. Chưa có engine Bát Tự, chưa có bảng dữ liệu hợp đôi. Chưa có luật đồng ý của người thứ hai. [Kaneo #66] 30/09, 01/10, 03/10. [Tài liệu] tracker OD-005. |
| `BAZI-COMPREHENSIVE-P0` | Luận giải Bát Tự toàn diện | (VND 79.000 cũ) | **Giữ, chưa có engine** | **(c)**. [Mã] `config/product-catalog.json:72-90`. Không có engine Bát Tự trong `packages/engine-adapters/src`. |
| `WESTERN-NATAL-P0` | Bản đồ sao Tây phương | (VND 79.000 cũ) | **Giữ, chưa có engine** | **(c)**. `config/product-catalog.json:91-110`. |

**Chú ý:**
- Trang chọn luận giải hiện có đúng **8 thẻ**: Một cung, Hôm nay, Bản mệnh, Tình duyên, Công việc, Trọn đời, Vận hạn 2026, Combo. 4 thẻ "Sắp mở" = Tình duyên, Công việc, Vận hạn 2026, Combo. Hội viên nằm ở tab khác và toàn "Sắp có". [Mã] `offer-ladder.tsx:15,87`, `la-packs.ts:95,125`.
- **Hai danh mục song song.** `config/product-catalog.json` còn ghi giá VND cũ (Trọn đời 79.000đ, Bản mệnh 19.000đ, Tình duyên 79.000đ…) và có mã bán VND cũ (`purchase-offer-presentation.ts:143` vẫn có chữ "79.000 ₫"). Giá thật đang dùng là giá Lá trong `la-catalog.ts`. Dễ gây nhầm cho người mới đọc mã. Gợi ý An dọn (mục 7, B9).
- Giá FD-105 khớp mã: palace 120, Hôm nay 60, Tháng 300, topic 480, Năm 480, Combo 1.300, Trọn đời 960, Hội viên 1.500/8.000. [Mã] `la-catalog.ts:7-17`.
- Hợp đôi 600 Lá có trong tracker nhưng **không có trong danh mục mã**.

### 2.2 Phân loại lý do giữ (tóm lại)

| Loại | Sản phẩm | Nghĩa với Lãm |
|---|---|---|
| (a) Chủ giữ | Hội viên, Combo, Hợp đôi, và ngân sách các đợt 20 bản của Tình duyên/Công việc/Tháng/Năm | Chỉ cần Lãm quyết là có thể mở đường, không cần dev. |
| (b) Cổng chất lượng 20 bản | Tình duyên, Công việc, Tháng, Năm (và Combo phụ thuộc Năm) | Tiền AI + thời gian chạy + Lãm/An duyệt mẫu. Không phải việc giao diện. |
| (c) Thiếu BE/engine | Hợp đôi, Bát Tự, Tây phương; công cụ trả phí của Hội viên; **sản phẩm Chặng 10 năm (chưa có SKU/writer)**; **năm có tham số** | An cần xây. |
| (d) Chỉ thiếu UI | **Không có sản phẩm nào chỉ thiếu UI.** | Giao diện không phải điểm nghẽn. |

> Điều này trả lời đúng điều Lãm muốn biết: các món "Sắp mở" **không** chờ giao diện. Lãm + Claude làm UI xong vẫn không bán được nếu chưa qua cổng (b)/(a).

### 2.3 Ngoài các SKU trên: chủ đề

Mới có **2 chủ đề** (Tình duyên, Công việc). [Mã] `ziwei-topic-deep-dive-v1.ts:5-10`. AiTuvi có 15 chuyên đề [Lãm quan sát]. Thêm chủ đề mới = thêm cấu hình cung chính/cung phụ như `TOPIC_PALACE_SCOPES` (dòng 28-62), prompt, bộ kiểm tra chất lượng và 20 bản thật. [Suy luận] đây là việc vừa phải, không phải làm engine mới.

---

## 3. Engine đã có gì, thiếu gì

### 3.1 Các tầng thời gian: engine tính được gì

| Tầng (tên thường) | Thuật ngữ | Engine tính? | Chỗ dùng trong mã | Hiện đã dùng cho sản phẩm nào |
|---|---|---|---|---|
| Chặng 10 năm | Đại vận / đại hạn | **Có**, cả 12 chặng và các cung của chặng, tứ hóa của chặng | `astrolabe.decadalList()` [Mã] `iztro-horoscope.ts:406`, `iztro-report-snapshot.ts:316` | Trọn đời (1 đoạn "đại vận hiện tại" + đoạn mồi tối đa 7 chặng). Hai chủ đề (đoạn timing). Trang miễn phí (1 câu). |
| Mỗi năm theo tuổi | Tiểu hạn / tiểu vận (tầng `age` của iztro) | **Có** (iztro trả `age`), nhưng **ta không dùng** | [Web: https://docs.iztro.com/posts/horoscope.html] iztro có `decadal, age, yearly, monthly, daily, hourly`. [Chạy thử] `h.age` trả tuổi 37→38 và cung. Em không tìm thấy chỗ nào trong repo đọc `age`. | Chưa dùng. |
| Năm | Lưu niên / Thái Tuế | **Có**, cho bất kỳ ngày nào | `hs.yearly` [Mã] `iztro-horoscope.ts:184-195`; `period-reading-facts.ts:29` | Trang miễn phí (câu năm + số tháng). Trọn đời (1 đoạn). Bản Năm (đã code). |
| Tháng âm lịch | Lưu nguyệt (kể cả tháng nhuận, 2 nửa) | **Có**, 12 hoặc 13 kỳ, cho bất kỳ năm nào | `monthlyList(year, true)` [Mã] `period-reading-facts.ts:25`; [Chạy thử] 2027 ra 12 tháng | Bản Tháng và Năm (đã code, đang giữ). |
| Ngày | Lưu nhật | **Có** | `hs.daily` [Mã] `iztro-horoscope.ts:383` | Hôm nay (60 Lá, đã bán). Viết bằng bảng luật cố định, không gọi AI. [Mã] `daily-reading-grounding.ts:1-2` |
| Giờ | Lưu giờ | Có (iztro) | Không dùng. [Mã] `personal-daily-reading-writer.ts:315` ghi "không tính dự đoán theo giờ" | Không cần bán. |

**Năm bất kỳ có tính được không?** Có, với hai điều kiện:
- `period-reading-facts.ts` nhận `targetYear` từ 1900 đến 2100 và lấy cung lưu niên bằng ngày `targetYear-07-01`. [Mã] dòng 19, 29. Đây là cách làm **đúng**.
- `iztro-report-snapshot.ts` **bắt buộc** `targetYear` bằng năm của `asOfDate`; muốn năm khác phải đổi `asOfDate`. [Mã] dòng 262-264. Chặng (đại vận) lấy theo `targetYear`; nếu năm trước khi chặng đầu bắt đầu thì trả "not_started". [Mã] dòng 316, 358-362.
- **Cẩn thận:** `calculateZiweiHoroscope` (hàm của trang miễn phí) **không** làm đúng cho năm khác năm hiện tại, xem 3.3.

### 3.2 Các writer (máy viết chữ) đã có

| Writer | Dùng cho | Gọi AI? | File | Trạng thái |
|---|---|---|---|---|
| Tổng quan miễn phí | Trang lá số miễn phí | Không (ghép câu mẫu) | `free-structural-overview.ts` (mô tả ở ticket #82) | Đang chạy; LSV-82 yêu cầu viết lại v2. |
| Quà một cung | Cung khớp mối quan tâm | Có, trần 3.000đ/lá số, 50.000đ/ngày | LSV-71 | Đã Done; tắt cho tới khi đủ điều kiện (FD-109a, FD-116). |
| Trọn đời v4.x | Trọn đời, Bản mệnh, Một cung | Có | `comprehensive-report-writer-v4.ts`, `comprehensive-report-section-writer-v4.ts` | **Bán**. |
| Chủ đề | Tình duyên, Công việc | Có | `topic-deep-dive-writer-v4.ts` (393 dòng) | Code xong; giữ. |
| Kỳ (tháng/năm) | Tháng này, Vận hạn năm | Có | `period-reading-writer.ts` (73 dòng) | Code xong; giữ. |
| Hôm nay | Hôm nay | Không (bảng luật) | `personal-daily-reading-writer.ts` | **Bán**. |
| Chặng 10 năm riêng | (chưa có) | – | – | **Chưa có writer.** Chỉ có đoạn trong Trọn đời. |
| Hợp đôi | (chưa có) | – | – | **Chưa có.** |

### 3.3 Điều đang thiếu hoặc lệch (kết luận về lời Lãm "BE và engine đã rất đầy đủ")

**Đúng:** nền tảng Zi Wei đủ để tính chặng/năm/tháng/ngày cho mọi lá số và mọi năm; mua-đọc-hoàn Lá cho Tháng/Năm/Chủ đề đã xây.

**Chưa đúng ở các điểm sau (cụ thể):**

| # | Thiếu / lệch | Bằng chứng | Loại |
|---|---|---|---|
| 1 | **SKU, backend, DB cứng năm 2026.** Tên SKU `ZIWEI-YEAR-2026-P0`. Mã kiểm tra `deriveReportTimingLineage(now).targetYear !== 2026` ở 4 chỗ. `purchasePeriodKey` trả cố định "2026". Combo bị chặn bằng trigger DB. Nhắc hạn tháng cũng kiểm tra đúng SKU 2026. Thẻ trang chọn cố định `ZIWEI-YEAR-2026-P0`. | `wallet-unlock.service.ts:581,648,814,1002`; `period-report-config.ts:4-9`; `0054_combo_entitlement_authority.sql:19-23`; `han-month-reminder.service.ts:26,79`; `offer-ladder.tsx:15` | (c) |
| 2 | **Trang miễn phí đã tự suy ra SKU năm theo năm động** nhưng danh mục không có `ZIWEI-YEAR-2027-P0` nên **rơi về Trọn đời** | `ziwei-free-result-model.ts:141` | (c) |
| 3 | **"Hạn" ở trang miễn phí là luật riêng**: gắn "warn" theo sao Kỵ/sát tinh, và nếu 0 tháng hạn thì **ép tháng thứ 7 thành hạn "tiền bạc"**. Câu "N tháng cần chú ý, M tháng thuận" lấy từ đây. | `iztro-horoscope.ts:221-295, 315-330, 341` | Chất lượng/độ trung thực. Đụng FD-089 ("chỉ nêu tháng hạn khi engine đã tính") và yêu cầu "bám engine". |
| 4 | Bản trả phí dùng định nghĩa khác: tháng "hạn" khi sao Hóa Kỵ lưu nguyệt rơi vào sao của cung. Có kiểm tra để không tự bịa tháng. | `period-reading-facts.ts:41-46`, `period-reading-writer.ts:27-41` | Hai định nghĩa → có thể trang miễn phí và bản mua nói khác. |
| 5 | `calculateZiweiHoroscope` với `targetYear` khác năm của `asOfDate`: 12 tháng tính theo `targetYear`, nhưng **cung lưu niên, can chi, chặng** lấy theo `asOfDate`. Nhãn nói năm khác mà cung vẫn của năm này. | `iztro-horoscope.ts:184-199` (lấy `hs` theo `asOfDate`, `monthlyList(targetYear)` theo `targetYear`) | Lỗi tiềm ẩn khi bán năm sau. [Suy luận] từ đọc mã, chưa chạy riêng. |
| 6 | **Lệch ranh giới năm**: backend lấy năm theo lịch dương (`targetYear = năm của ngày Việt Nam`), engine đổi năm ở Tết. Từ 01/01 đến 05/02/2027 báo cáo "năm 2027" sẽ dùng lưu niên Bính Ngọ. | `identity-report-config.ts:366-381`; [Chạy thử] 15/01/2027 → Bính Ngọ; 06/02/2027 → Đinh Mùi | Lỗi tiềm ẩn từ 01/01/2027. [Suy luận] về tác động. |
| 7 | **Tháng này chỉ mua được cho tháng hiện tại.** Writer tháng lọc đúng tháng âm lịch của `asOfDate`. | `period-reading-facts.ts:26-27`; `period-report-config.ts:6-8` | Muốn bán "tháng sau" cần mở rộng. |
| 8 | **Không có sản phẩm cho đại vận** ngoài đoạn trong Trọn đời và trong chủ đề. Không có writer chặng, không có SKU, không có thẻ. | Mục 2, 3.2 | (c) |
| 9 | **Tiểu hạn chưa được dùng.** | Mục 3.1 | Tùy Lãm có muốn bán hay không. |
| 10 | **Hợp đôi, Bát Tự, Tây phương: chưa có engine.** | `packages/engine-adapters/src` chỉ có `ziwei/`; [Kaneo #66] 30/09, 01/10 (không có bảng `bazi_*`, `compatibility_*`) | (c) |

> **[Cho An]** Mục 3.3 dòng 1, 3, 5, 6 nên sửa **trước** khi chạy đợt 20 bản của Năm, vì nếu không đợt 20 bản sẽ kiểm chứng trên dữ kiện chưa chắc.

---

## 4. Logic vòng thời gian trong Tử Vi (giải thích dễ hiểu)

### 4.1 Các tầng quan hệ với nhau thế nào

Hình dung cuộc đời như một chuyến đi dài:

| Tầng | Ví dụ đời thường | Dài bao lâu | Cố định hay đổi |
|---|---|---|---|
| **Lá số gốc** (12 cung) | Tấm **bản đồ** của cả vùng đất | Cả đời | Cố định |
| **Đại vận** | Một **chặng đường 10 năm** trên bản đồ; mỗi chặng "dừng" ở một cung, kéo chủ đề của cung đó lên phía trước | 10 năm | Mỗi 10 năm đổi cung |
| **Tiểu hạn** | Nhịp từng tuổi trong chặng (tầng thứ hai theo tuổi) | 1 năm | Đổi mỗi năm |
| **Lưu niên** | **Thời tiết của một năm** (năm Bính Ngọ, Đinh Mùi…), đặt vào một cung cụ thể của người đó | 1 năm âm lịch | Đổi mỗi năm; cùng năm nhưng **khác cung với mỗi người** |
| **Lưu nguyệt** | Thời tiết của một tháng âm lịch | 1 tháng (tháng nhuận chia 2 nửa) | Đổi mỗi tháng |
| **Lưu nhật** | Thời tiết của một ngày | 1 ngày | Đổi mỗi ngày |

Cách đọc chung (theo cách Tử Vi thường dạy, [Suy luận] từ kiến thức nền; tiêu chí cụ thể do chủ đề của cung quyết định): **lấy chặng 10 năm làm nền, rồi đặt năm lên trên, rồi đến tháng**. Chủ đề của cung chặng + chủ đề của cung năm cùng xuất hiện thì đó là việc nổi bật trong năm đó. Đây cũng là cách trang miễn phí đang viết ("khi đặt hai lớp cạnh nhau, điều cần xem kỹ là…"). [Mã] `ziwei-free-result-model.ts:141-145`.

### 4.2 Năm hiện tại nằm trong đúng MỘT đại vận, nhưng khác nhau với mỗi người

**Quy tắc chung** (kiến thức phổ biến của Tử Vi, em không lấy được một trang web trích dẫn được trong phiên này; engine iztro xác nhận kết quả): chặng đầu bắt đầu từ tuổi bằng **số Cục** (2 đến 6: Thủy 2, Mộc 3, Kim 4, Thổ 5, Hỏa 6); mỗi chặng 10 năm; **chiều đi qua các cung phụ thuộc năm sinh âm/dương và giới tính**. [Chạy thử] Hỏa lục cục → chặng đầu 6–15 tuổi; Kim tứ cục → 4–13; Mộc tam cục → 3–12. Cùng giờ sinh, **nam và nữ ra chặng khác nhau**: nam 1990 chặng 2026 ở Điền Trạch, nữ 1990 chặng 2026 ở Tử Tức.

**Kết quả chạy thử với 7 lá số tổng hợp** (không phải người thật). Mốc xem: 2026.

| Lá số (tổng hợp) | Số Cục | Chặng chứa 2026 (tuổi âm, năm) | Cung của chặng | Còn mấy năm trong chặng sau 2026 | Cung lưu niên 2026 → 2027 → 2028 |
|---|---|---|---|---|---|
| Nam 1990-03-15 | Hỏa 6 | 36–45 (2025–2034) | Điền Trạch | 8 | Thiên Di → Tật Ách → Tài Bạch |
| Nữ 1990-03-15 | Hỏa 6 | 36–45 (2025–2034) | Tử Tức | 8 | (như trên, cùng vị trí Mệnh) |
| Nam 1985-07-20 | Hỏa 6 | 36–45 (2020–2029) | Tử Tức | 3 | Nô Bộc → Thiên Di → Tật Ách |
| Nữ 1998-11-02 | Kim 4 | 24–33 (2021–2030) | Phu Thê | 4 | Thiên Di → Tật Ách → Tài Bạch |
| Nam 1975-01-09 | Hỏa 6 | 46–55 (2019–2028) | Quan Lộc | **2** | Tật Ách → Tài Bạch → Tử Tức; **chặng mới bắt đầu 2029** |
| Nữ 2002-05-30 | Mộc 3 | 23–32 (2024–2033) | Phu Thê | 7 | Nô Bộc → Thiên Di → Tật Ách |
| Nam 1960-09-09 | Hỏa 6 | 66–75 (2025–2034) | Thiên Di | 8 | Thiên Di → Tật Ách → Tài Bạch |

Bài học để thiết kế (đều đúng theo bảng):
- **Không thể nói chung "2026 nằm trong đại vận".** Người 1985 nam đang ở **năm thứ 7** của chặng, còn 3 năm; người 1975 nam đang ở **năm thứ 8**, chỉ còn 2 năm, sắp sang chặng mới; người 1990 mới ở **năm thứ 2**.
- **Cung lưu niên khác nhau theo người** (vì vị trí Mệnh khác nhau). Cùng năm Bính Ngọ nhưng người này vào Thiên Di, người kia vào Nô Bộc.
- "**Cụm 3–5 năm**" cắt qua **ranh giới chặng** với nhiều người: 1985 nam đổi chặng giữa 2029 và 2030; 1975 nam đổi giữa 2028 và 2029. Chỗ này rất đáng bán vì khách hay quan tâm "chặng sắp tới".
- Người rất trẻ (chưa đến tuổi chặng đầu) có trạng thái "chưa bắt đầu". [Mã] `iztro-report-snapshot.ts:358-362`.
- Giờ sinh không rõ (lá số tạm tính, FD-103): **cung Mệnh, số Cục và chặng đều phụ thuộc giờ sinh**, nên phần này phải ghi "tạm tính". [Tài liệu] tracker FD-103.

### 4.3 Khách thường muốn đọc gì (theo thời gian)

[Suy luận] từ cách AiTuvi dựng tab (Lãm quan sát), từ các app Tử Vi bán gói "dự báo 2 năm" [Web: https://apps.apple.com/app/id1150954869] và từ cách người dùng nhờ ChatGPT "dự đoán 5 năm tới" theo lá số [Web: https://phongvu.vn/cong-nghe/xem-tu-vi-bang-chatgpt/]:

| Câu khách hỏi | Tầng thời gian | Mức khẩn |
|---|---|---|
| "Năm nay tôi thế nào?" | Lưu niên (+ nền là chặng) | Rất cao, lúc nào cũng hỏi |
| "Năm sau thế nào?" | Lưu niên năm kế | Cao, **đặc biệt cuối năm âm lịch** gần Tết [Suy luận] |
| "Giai đoạn 10 năm này của tôi là gì?" | Đại vận hiện tại | Cao, mang tính "hiểu cuộc đời" |
| "Chặng sau của tôi ra sao, bao giờ đổi?" | Đại vận kế | Trung bình; cao khi chặng sắp đổi |
| "3–5 năm tới nên làm gì?" | Dải năm (cắt qua ranh giới chặng) | Trung bình |
| "Tháng này / tháng sau" | Lưu nguyệt | Hay quay lại |
| "Hôm nay" | Lưu nhật | Thói quen hằng ngày |
| "Tình duyên / công việc / tiền" | Cung (không gắn thời gian cố định, nhưng thường kèm "khi nào") | Rất cao |

### 4.4 Logic đúng: khi khách tò mò "năm nay" so với "tương lai", bán gì cho từng người

Nguyên tắc: **dùng dữ kiện của chính người đó** (đã có trong engine), không dùng năm cố định.

Dữ kiện cần tính cho mỗi lá số, lúc người đó mở tab "Năm nay" (đều có sẵn từ `decadalList()`/`yearly`):
- `Y`: năm âm lịch hiện tại; `L`: số tháng âm lịch còn lại của năm (hôm nay: còn khoảng 4 tháng; Tết 06/02/2027).
- Chặng hiện tại `[a–b] tuổi`, cung chặng, `k` = năm thứ mấy trong chặng (1..10), `R = 10 − k` = số năm còn lại.
- Cung lưu niên của `Y` và `Y+1`.

| Tình huống của người đó | Thẻ hàng đầu (đúng thứ họ hỏi) | Thẻ thứ hai | Câu mở bằng dữ kiện thật (ví dụ) |
|---|---|---|---|
| Bấm "Năm nay", `L` còn nhiều | **Vận hạn năm Y** (480) | Chặng hiện tại (360, mới) | "Năm Y của bạn là năm thứ k trong chặng [a–b] tuổi, cung X. Lưu niên vào cung Z." |
| Bấm "Năm nay", `L` còn ít (vài tháng cuối) | **Vận hạn năm Y+1** (480) hoặc **cặp Y và Y+1** | Chặng hiện tại | "Năm Y còn vài tháng. Năm Y+1 vào cung Z của bạn." Sự thật về thời gian là thông tin, không phải đếm ngược giả |
| `R ≤ 2` (chặng sắp khép) | Giữ thẻ theo ý khách | **Chặng kế tiếp** (360) | "Chặng [a–b] của bạn kết thúc năm B. Chặng kế bắt đầu năm B+1 ở cung X'." |
| `k ≤ 2` (vừa vào chặng) | Giữ thẻ theo ý khách | **Chặng hiện tại** | "Bạn mới bước vào chặng [a–b] tuổi." |
| Chưa đến tuổi chặng đầu | Chỉ Năm | (ẩn Chặng) | "Chặng đầu tiên của bạn bắt đầu năm …" |
| Giờ sinh không rõ | Như trên | | Ghi nhãn "tạm tính" (FD-103) |
| Đã có Trọn đời | Mở lại báo cáo (đã có đoạn chặng + năm) | Năm Y (12 tháng) là phần **thêm** | Nói thật: Trọn đời có 1 đoạn năm, bản Năm có 12 tháng |

**Một dải 5 năm miễn phí** (đề xuất, không điểm số): mỗi năm hiện tên cung lưu niên của người đó và vạch ranh giới chặng. Chỉ hiện **tên cung**, không điểm, nên không đụng FD-063. Từng năm có "Mở" riêng.

---

## 5. Đối thủ

Giới hạn nghiên cứu: nhiều trang không tải được hoặc không công khai giá. Phần giá dưới đây chỉ từ trang đã đọc được. Không suy ra thêm.

| Đối thủ | Sản phẩm / ranh giới miễn phí – trả phí | Giá / mô hình | Nguồn |
|---|---|---|---|
| **AiTuvi** (web) | Tab Lá số, Luận cung, Đại vận (cột theo từng chặng, có "Chính vận"), Tiểu vận (sóng theo năm, năm nay giá cao), Nguyệt vận, Nhật vận (thuê bao), Chuyên đề 15. Tổng quan miễn phí ~1.150 chữ rồi mờ giữa câu. | Cung 60–150 Xu; mỗi chặng 40–120 Xu; mỗi năm 40 Xu, năm nay 160; tháng 20–80 Xu; Nhật vận 59k/tuần, 219k/tháng, 2.099k/năm; "Luận giải toàn bộ 219k" | [Lãm quan sát] (ảnh) |
| AiTuvi (trang chủ) | Miễn phí: lập lá số, nhận định tổng quan. Trả phí: luận cung, dự báo vận chi tiết, hỏi trợ lý. Trang không hiện giá cụ thể | – | [Web: https://aituvi.com] |
| **AI Tử Vi – Vận Hạn 2026** (app của AiTuvi) | Xem theo ngày/tháng/năm; đại vận 10 năm; tiểu vận; nguyệt vận; chat chuyên gia | Gói lẻ $5,99–$19,99; thuê bao tuần $1,99, tháng $7,99, năm $79,99 | [Web: https://apps.apple.com/us/app/id6449532445] |
| **Thái Âm – Tử Vi 2026** (app) | Trọn đời, dự báo năm 2026, tháng, ngày, chat cố vấn AI | Gói $1,99–$7,99; **"dự báo 2 năm" $6,99**; trọn đời $19,99 | [Web: https://apps.apple.com/app/id1150954869] |
| **tuvi.vn** | Lập lá số; tử vi ngày, năm, trọn đời; 12 con giáp; lịch; xem tuổi… Không thấy giá. | Có vẻ miễn phí | [Web: https://tuvi.vn] |
| **lichvannien365.com** | Tử vi ngày/tuần/tháng/năm theo con giáp, lá số theo ngày sinh. Không thấy giá. | Có vẻ miễn phí | [Web: https://www.lichvannien365.com] |
| **lasotuvi.com** | Miễn phí: lập lá số, mô tả sơ 12 cung, PDF mẫu. **Trả phí: bản luận giải chi tiết 12 cung gửi qua email.** Không thấy dự báo theo đại hạn/năm/tháng. | Không công khai giá | [Web: https://lasotuvi.com] |
| **tuvilyso.vn** | Công cụ miễn phí gồm lập lá số Tử Vi, Quỷ Cốc, Mai Hoa, Bát Tự, lịch; có tùy chọn lưu đại vận, tiểu hạn Thái Tuế, lưu sao | Không thấy giá | [Web: https://tuvilyso.vn] |
| **tuvi.cohoc.net** | Lập lá số trọn đời, nhiều phái, học Tử Vi. Không thấy dự báo theo thời gian, không thấy giá | Có vẻ miễn phí | [Web: https://tuvi.cohoc.net] |

Không đọc được: tracuutuvi.com (đứt kết nối), tuvi.com.vn, vansu.net (không tồn tại), lichngaytot.com/tu-vi (404), tuvi.app (lỗi SSL).

**Rút ra** ([Suy luận], dựa trên các nguồn trên):
1. Các trang Việt miễn phí cho **dự báo chung theo con giáp** theo ngày/tháng/năm. Cái họ **không** cho là đọc **theo chính lá số** của khách, đặc biệt đại vận/năm theo cung. Đó là chỗ trả phí hợp lý.
2. AiTuvi chia sản phẩm theo **tầng thời gian**, mỗi dòng có giá riêng và dòng "hiện tại" được định giá cao hơn nhiều dòng khác. Chặng/năm/tháng đều là món bán riêng.
3. Có app bán sẵn **gói nhiều năm** (dự báo 2 năm) cạnh gói năm nay. Điều này ủng hộ một món "năm tới" hoặc "cụm vài năm".
4. Thuê bao (tuần/tháng/năm) là mô hình chính của app, trong khi Lá Số Việt dùng ví Lá + Hội viên không tự gia hạn. Khác biệt về mô hình, không bàn trong tài liệu này.

---

## 6. Dải sản phẩm đề xuất

### 6.1 Áp dụng Hormozi với sự tiết chế

Áp dụng `hormozi-offer` và `hormozi-pitch`, bỏ phần hứa hẹn và khan hiếm giả (Lãm: chỉ luật Việt Nam là giới hạn; ta thêm nguyên tắc "claim phải bám engine").

**Phương trình giá trị (Hormozi):** Giá trị = (Kết quả mong muốn × Mức tin) ÷ (Độ trễ × Công sức).

| Yếu tố | Hiện tại ở "Năm 2026 và đại vận" | Cách cải thiện (đều trung thực) |
|---|---|---|
| Kết quả mong muốn | Mơ hồ ("đọc sâu") | Nói đúng điều khách hỏi: "năm Y của bạn vào cung Z; 12 tháng; nên làm gì" |
| Mức tin | Chữ chung, bán nhầm sản phẩm | Dẫn **dữ kiện của chính người đó** (cung chặng, cung năm, năm thứ k của chặng). Mỗi nhận định ghi sao/cung căn cứ. Hoàn Lá "Không đúng" cho món dưới 500 Lá (đã có, FD-105) |
| Độ trễ | Mở xong đọc ngay | Giữ. Phòng chờ (LSV-78) |
| Công sức | Khách không biết đại vận của mình | **Máy tự chọn đúng chặng/năm cho từng người** (khách không cần tự biết) |

**Điều không làm:** đếm ngược giả, "giải mã vận mệnh", nói số người mua, tự bịa tháng hạn. Có thể nói **sự thật về thời gian** (năm Bính Ngọ đến 06/02/2027) như thông tin.

### 6.2 Dải sản phẩm theo luồng đọc tự nhiên

| Bước trong luồng đọc | Món | Giá (Lá) | Tình trạng | Ghi chú |
|---|---|---|---|---|
| 0. Xem miễn phí | Lá số + tổng quan + 1 cung quà + câu năm/chặng | 0 | Có | Thêm **dải 5 năm** (chỉ tên cung) |
| 1. Hôm nay | Hôm nay của bạn | 60 | **Bán** | Thói quen hằng ngày |
| 2. Một cung / bản mệnh | Một cung (120), Bản mệnh (240) | 120 / 240 | **Bán** | Rollover 7 ngày về Trọn đời giữ nguyên |
| 3. Tháng | Tháng này của bạn | 300 | Code xong, **chờ 20 bản** | Mở rộng tháng sau về sau |
| 4. **Năm** | **Vận hạn năm [Y]** (năm nay hoặc năm sau) | 480 | Code xong cho 2026, **chờ 20 bản** + cần **làm có tham số năm** | Món số 1 cần mở |
| 5. **Chặng 10 năm** | **Chặng [a–b] tuổi của bạn** (hiện tại hoặc kế tiếp) | **360 (đề xuất)** | **Cần xây** (chưa có SKU/writer) | Món số 2 cần có |
| 6. Chủ đề | Tình duyên (480), Công việc (480) | 480 | Code xong, **chờ 20 bản mỗi loại** | |
| 7. Trọn đời | Tử Vi trọn đời | 960 | **Bán** | Có 1 đoạn chặng + 1 đoạn năm + mồi chặng khác. **Nói thật điều này.** |
| 8. Gói gộp | Trọn đời + Năm [Y] (Combo) | 1.300 | Code xong, chờ Năm | Sửa "2026" thành tham số |
| 9. Hội viên | Hôm nay mỗi sáng, Tháng, giảm 20% | 1.500 / 8.000 | Giữ | Chỉ mở khi quyền lợi có thật |
| (Sau) Hợp đôi | Hai lá số | 600 | **Chưa tồn tại** | Chờ engine Bát Tự (OD-005) |

**Món mới / sửa đề xuất:**
1. **Vận hạn năm [Y]** (480): đổi từ cố định 2026 sang tham số. Cho phép mua năm hiện tại **và** năm kế tiếp. Khoảng cho phép mua (ví dụ chỉ năm nay và năm sau) là một quyết định (D4).
2. **Chặng [a–b] tuổi của bạn** (360 đề xuất, khoảng thử 240–480): đọc chặng hiện tại hoặc chặng kế tiếp của chính người đó. Có thể dựa trên các khối đã có trong Trọn đời và chủ đề (đoạn timing), nên **chi phí viết thêm vừa phải** [Suy luận]. Giá 360 nằm giữa Tháng (300) và Năm (480) vì chặng ít chi tiết theo tháng nhưng phủ 10 năm. Quy đổi tiền đồng: 360 Lá ≈ 27–35 nghìn đồng (theo gói nạp rẻ nhất tới đắt nhất: 96,7 → 74,9 đồng/Lá). **Giá là giả thuyết, cần Lãm duyệt (D3).**
3. **Cụm vài năm** (tùy chọn, làm sau): "Năm nay + năm sau" (đề xuất **780**, so với 960 mua lẻ, tiết kiệm thật 180 Lá). Chỉ làm sau khi bản Năm đạt. Quyết định D5.
4. Dải 5 năm miễn phí, đường 10 năm ở dạng **tên cung + mốc chặng, không điểm** (không cần nới FD-063/107). Nếu Lãm muốn điểm cho từng chặng như "độ mạnh cấu trúc" thì phải có công thức công bố cho chặng (Q8), việc của An.

Quy đổi nhanh để so với AiTuvi: giá Lá của ta đang thấp hơn nhiều so với mức "Luận giải toàn bộ 219k" mà Lãm quan sát (960 Lá ≈ 72–93 nghìn đồng). Em không so từng dòng vì AiTuvi tính bằng Xu.

### 6.3 Câu mời mua mẫu (tiết chế, dựa trên dữ kiện engine)

Thay cho "Mở Tử Vi trọn đời 960 Lá" khi khách tò mò năm:

- **Thẻ năm:** "Năm Bính Ngọ của bạn rơi vào cung Thiên Di, năm thứ 2 trong chặng 36–45 tuổi. Mở để đọc 12 tháng và việc nên chuẩn bị. 480 Lá." (số liệu lấy từ engine, như bảng 4.2)
- **Thẻ chặng sắp đổi:** "Chặng 46–55 tuổi của bạn kết thúc năm 2028. Chặng 56–65 bắt đầu năm 2029 ở cung Nô Bộc. Mở để biết chặng sau mang chủ đề gì. 360 Lá."
- **Giảm rủi ro** (đúng điều kiện thật): "Phần nào bạn thấy không đúng, đánh dấu trong 24 giờ để được hoàn Lá (món dưới 500 Lá, mỗi tài khoản một lần)." [Tài liệu] FD-105.
- Khi bán Trọn đời cho người chỉ tò mò năm: nói rõ "Trọn đời có phần chặng hiện tại và năm hiện tại ở dạng tóm tắt; muốn 12 tháng của năm thì có bản Vận hạn năm". Không nói Trọn đời "là phần năm" khi nó chỉ là một đoạn.

### 6.4 Trước khi chạy đợt 20 bản của Năm: việc đã đúng và chưa đúng

- Tên khách thấy: "Vận hạn năm 2026" nên đổi thành "Vận hạn năm [Y] của bạn" để không chết sau Tết.
- Khung giờ: nếu tung bản Năm trước ranh giới Tết 06/02/2027, ưu tiên bán **năm kế tiếp** vì năm hiện tại còn rất ít thời gian. [Suy luận] về hành vi mua; D3.

---

## 7. Việc cần làm

### 7.1 Backend / engine, giao An

> **[Cho An]** Mỗi dòng ghi file. Thứ tự theo ưu tiên. Mục B1 đến B3 không cần quyết định kinh doanh.

| # | Việc | File / chỗ chạm | Cổng chất lượng |
|---|---|---|---|
| B1 | **Sửa độ trung thực số "hạn" ở trang miễn phí**: bỏ đoạn ép tối thiểu 1 tháng hạn; dùng chung định nghĩa "tháng hạn" với `period-reading-facts.ts` (Hóa Kỵ lưu nguyệt / `obstacleStarIds`), để trang miễn phí và bản mua không nói khác nhau. Nếu 0 tháng hạn thì nói "0 tháng" hoặc bỏ câu số. | `iztro-horoscope.ts:315-330, 341`; `ziwei-free-result-model.ts:141-145` | Test cùng đầu vào ra cùng chữ; 200 lá số tổng hợp kiểm tra tỉ lệ tháng hạn |
| B2 | **Sửa `calculateZiweiHoroscope` cho năm khác năm hiện tại**: tính cung/can chi/chặng theo `targetYear` (ví dụ `horoscope("${targetYear}-07-01")` như `period-reading-facts.ts:29`), không theo `asOfDate`. | `iztro-horoscope.ts:184-199` | Test: nam/nữ, 2027, 2030, 2035 so khớp [Chạy thử] ở mục 4.2 |
| B3 | **Thống nhất ranh giới năm**: dùng năm âm lịch (Tết) làm khóa năm thay vì năm dương, hoặc ghi rõ và xử lý 01/01–05/02. Kiểm tra `deriveReportTimingLineage`, khóa mua, nhãn, báo cáo. | `identity-report-config.ts:366-381`; `period-reading-facts.ts:16-19`; `period-purchase-key.ts` | Test ngày 2027-01-15, 2027-02-05, 2027-02-06 |
| B4 | **Làm "Vận hạn năm [Y]" có tham số năm.** Chọn một trong: (i) sinh SKU `ZIWEI-YEAR-{Y}-P0` theo năm, hoặc (ii) một SKU `ZIWEI-YEAR-P0` + `period_key = Y`. Sửa 4 chỗ kiểm tra `!== 2026`, khóa kỳ, trigger DB combo, nhắc hạn tháng, enum SKU, thẻ trang chọn, báo giá, hoàn Lá. Giới hạn năm được phép mua (năm hiện tại và kế tiếp) do D4. Cần **migration mới** (không sửa 0054 đã chạy). | `la-catalog.ts:235-251, 320-345`; `period-report-config.ts:4-9`; `wallet-unlock.service.ts:581,648,814,1002`; `0054_combo_entitlement_authority.sql:19-23`; `han-month-reminder.service.ts:26,79`; `commerce.ts:157-158,246-250` | Test mua/đọc/hoàn Lá cho năm Y và Y+1; test qua ranh giới Tết |
| B5 | **Chặng 10 năm (đại vận) làm sản phẩm riêng:** SKU mới (ví dụ `ZIWEI-DECADE-P0`, `period_key` = chặng hiện tại hoặc kế tiếp); contract nội dung (tái dùng `ZiweiTopicDecadalTiming*` và đoạn "currentDecadal" nếu hợp); writer + bộ kiểm tra theo mẫu `period-reading-writer.ts` và `topic-deep-dive-quality-v4.ts`; facts từ `decadalList()` (có sẵn). Trạng thái "chưa bắt đầu" (không bán). | Mới: `reports/decadal-reading-writer.ts`, `decadal-report-config.ts`; contract `ziwei-decadal-reading-v1.ts`; `la-catalog.ts`; `wallet-unlock.service.ts` | FD-077 + FD-089; **20 bản thật đạt liên tiếp** (cùng chuẩn các món khác); Lãm xem 5 bản |
| B6 | **Khóa mua theo người**: API trả cho từng lá số "chặng hiện tại, k, R, cung lưu niên Y và Y+1" để UI chọn thẻ đúng (bảng 4.4). Chỉ đọc, không đổi luồng tiền. | Mới trong `ziwei-query.service.ts` hoặc facts API | Test 7 lá số ở mục 4.2 |
| B7 | **Mở rộng Tháng**: cho mua "tháng sau" (tuỳ D5). Hiện chỉ tháng của `asOfDate`. | `period-reading-facts.ts:26-27`; `period-report-config.ts:6-8` | Như Tháng |
| B8 | (Tuỳ chọn) dùng tầng **tiểu hạn** (`age`) làm dữ kiện thêm cho Năm/Chặng nếu Lãm muốn. | `iztro-horoscope.ts`; facts | Cùng cổng |
| B9 | Dọn hai danh mục: quyết giá VND cũ trong `config/product-catalog.json` và `purchase-offer-presentation.ts:143` còn dùng hay bỏ. | Hai file đó | – |
| B10 | **Chạy đợt chất lượng 20 bản** (cần Lãm duyệt ngân sách): Tình duyên, Công việc, Tháng, Năm (sau B1 đến B4), rồi Chặng. Script đã có: `scripts/verify-topic-deep-dive-real-generations.mjs`, `verify-period-reading-real-generations.mjs`; hạ tầng ngân sách `native-campaign-*`. Dừng ở lần lỗi đầu. | Scripts có sẵn | Thứ tự đề xuất: Năm trước (bán được nhiều nhất), rồi Chặng, rồi Tình duyên/Công việc, rồi Tháng |
| B11 | Hợp đôi: cần engine Bát Tự (chuẩn hoá, adapter, lưu, evidence), luật đồng ý của người thứ hai, writer hợp đôi. **Không làm bản Tử Vi-only** (OD-005). | Chưa có | Cổng ổn định của cả hai hệ |
| B12 | Hội viên: viết đặc tả **một** công cụ trả phí (đầu vào → dữ kiện từ engine → đầu ra → giới hạn/hạn dùng → đồng ý/xóa dữ liệu). Chỉ mở khi có. | – | – |

### 7.2 Giao diện, Lãm + Claude (Sonnet viết, Opus review; mobile-first; báo Lãm trước khi viết UI thật)

| # | Việc | File gợi ý | Phụ thuộc |
|---|---|---|---|
| F1 | **Trang chọn luận giải chỉ hiện món bán được** (ẩn "Sắp mở"); tự hiện lại khi món vào danh mục (đã nằm trong GĐ5 kế hoạch). | `offer-ladder.tsx`, `paid-topic-selector*.tsx` | Q1 của Lãm |
| F2 | **Thẻ theo người**: hiện thẻ Năm Y / Chặng / Chặng kế theo dữ kiện B6. Câu mở bằng số thật (mục 6.3). | `offer-ladder.tsx`, `contextual-unlock.tsx` | B4, B5, B6 (khi chưa có thì ẩn) |
| F3 | **Tab "Năm nay" của trang miễn phí**: thay "Năm 2026 và đại vận" bằng dữ kiện theo người (năm thứ k của chặng, cung lưu niên); nút "Xem phần đọc sâu" mở đúng thẻ (Năm Y hoặc Chặng), **không** mở Trọn đời trừ khi Năm chưa có. | `ziwei-free-result-model.ts`, `personal-*`, tấm mở khóa | B2, B6 |
| F4 | **Dải 5 năm** và **đường 10 năm** (tên cung + vạch ranh giới chặng; không điểm). Mỗi chặng khóa có 1 dòng đọc thử lấy từ thư viện miễn phí. | Tab mới theo Q3 (Tổng quan → Năm nay → Đại vận → 12 cung → Chủ đề) | Q8, GĐ3 (thư viện câu) |
| F5 | **Câu chữ mời mua theo mục 6.3**; hai bộ A/B để Lãm chọn; giá tiền đồng chỉ trong tấm mở khóa (Q6). | `purchase-offer-presentation.ts` (phần Lá), messages | GĐ5 |
| F6 | Thẻ **Tháng này** vào trang chọn khi bán được. | `offer-ladder.tsx` | Tháng đạt 20 bản |
| F7 | **Tab Hội viên**: ẩn khi còn giữ; hiện khi mở. | `membership-panel.tsx`, `la-packs.ts` | Hội viên mở |
| F8 | So sánh ngắn Một cung / Bản mệnh / Chặng / Năm / Trọn đời (mỗi gói có gì, "đã trả được trừ khi nâng cấp"). | trang chọn | Chặng/Năm có |
| F9 | Hợp đôi: màn nhập hai người + đồng ý của người thứ hai (UX mẫu), chỉ dựng sau B11. | – | B11 |

### 7.3 Cổng chất lượng áp dụng cho từng món mới

| Món | Cổng |
|---|---|
| Vận hạn năm [Y] | FD-077 (số chữ tối thiểu, từ cấm, bám chứng cứ) + FD-089 (nói hạn như chuẩn bị, chỉ nêu tháng hạn khi engine tính) + **20 bản thật liên tiếp** + Lãm xem mẫu |
| Chặng 10 năm | Như trên; thêm kiểm tra "không bịa năm/tuổi ngoài khoảng chặng" (giống `UNCOMPUTED_YEAR` trong `period-reading-writer.ts:27`) |
| Tháng này | Như Năm |
| Tình duyên, Công việc | Như Năm; mỗi chủ đề 20 bản |
| Combo | Sau khi Trọn đời và Năm đều đạt; thử một lần mua-hai-quyền lợi, phát lại, hoàn |
| Hội viên | Quyền lợi đã hứa có thật + đặc tả công cụ |
| Hợp đôi | Cả hai hệ ổn định + luật đồng ý |

---

## 8. Quyết định cần Lãm duyệt

Mỗi dòng có đề xuất. Mục có nhãn **[đổi giá/đổi quyết định cũ]** là điều chỉnh so với bản đã duyệt.

| Mã | Câu hỏi | Đề xuất của em | Vì sao |
|---|---|---|---|
| D1 | Có duyệt **ngân sách chạy đợt 20 bản** cho Năm, Chặng, Tình duyên, Công việc, Tháng (hiện chỉ Trọn đời được duyệt)? Cần con số trần và model. | Duyệt theo thứ tự **Năm → Chặng → Tình duyên/Công việc → Tháng**, mỗi đợt trần riêng, dừng ở lỗi đầu | Đây là điểm nghẽn thật để mở 4 món "Sắp mở". Không phải UI. |
| D2 | Có cho An **sửa độ trung thực số "hạn"** (B1–B3) trước khi chạy đợt Năm? | Có | Tránh chạy đợt 20 bản trên dữ kiện lệch; tránh nói "N tháng cần chú ý" mà bản mua nói khác |
| D3 | **Mở sản phẩm mới "Chặng 10 năm của bạn"** với giá **360 Lá** (thử 240–480)? **[món mới / giá mới]** | Có, 360 | AiTuvi bán từng chặng; khách hay hỏi; Trọn đời chỉ có 1 đoạn chặng |
| D4 | **Đổi "Vận hạn năm 2026" thành "Vận hạn năm [Y]"** (480, giữ giá FD-105) và cho phép mua **năm hiện tại và năm kế tiếp**? **[đổi tên/đổi quyết định cũ FD-105]** | Có | Nếu không, sản phẩm chết sau Tết 06/02/2027 |
| D5 | Khi năm sắp hết (vài tháng cuối năm âm lịch), thẻ hàng đầu là: (A) vẫn "Năm nay"; (B) chuyển sang "Năm sau"; (C) bán cặp "Năm nay + năm sau" ở **780** Lá? | B, và thêm C sau khi bản Năm đạt | Bán thứ còn giá trị; 780 so với 960 là tiết kiệm thật |
| D6 | Tạm thời (khi Năm chưa mở) tiếp tục bán **Trọn đời** cho người tò mò năm (FD-116), nhưng sửa câu mời **nói đúng** Trọn đời có gì về năm/chặng? | Có | Không đổi giá; chỉ nói thật hơn |
| D7 | **Combo**: đổi nghĩa thành "Trọn đời + Năm [Y]" (tham số), giữ 1.300? Lưu ý Trọn đời đã có 1 đoạn năm nên phần cộng thêm là 12 tháng | Có, giữ 1.300 | Giữ giá đã duyệt |
| D8 | **7 ngày khấu trừ** (FD-105) có mở rộng cho Năm/Chặng không? | **Không** lúc đầu, đo trước | Tránh làm Trọn đời rẻ quá khi mới có dữ liệu |
| D9 | **Đường đời 10 năm / dải 5 năm** chỉ hiện **tên cung + mốc chặng, không điểm**? Hay nới FD-063/107 để có điểm cho chặng (cần công thức công bố, An làm)? **[đổi quyết định cũ nếu chọn điểm]** | Không điểm trước | Không cần công thức mới, đi nhanh, hợp FD-063 |
| D10 | **Tiểu hạn** có làm thành dữ kiện/sản phẩm không? | Chưa, để sau | Engine có sẵn nhưng chưa có nhu cầu đã đo |
| D11 | **Hợp đôi**: giữ hoãn (OD-005 cần Bát Tự), ưu tiên engine Bát Tự không? | Giữ hoãn; chỉ bắt đầu khi Lãm muốn mở Bát Tự | Cần cả Bát Tự, đồng ý người thứ hai |
| D12 | **Hội viên**: tiếp tục giữ; nếu muốn làm tiếp, chọn **một công cụ trả phí** đầu tiên (gợi ý: chọn ngày/lịch dẫn vào "Hôm nay") | Giữ; chọn công cụ khi sẵn sàng | Quyền lợi đã hứa chưa có thật |
| D13 | **Ẩn các món "Sắp mở"** khỏi trang chọn (Q1 plan)? | Có | Nhất quán với đề xuất của cuộc họp 07/10 |
| D14 | Thêm các chủ đề khác (sức khỏe, con cái, nhà đất, học hành…) theo kiểu 15 chuyên đề của AiTuvi? | Để sau, sau khi 2 chủ đề đầu qua cổng | Mỗi chủ đề thêm cũng phải qua cổng 20 bản |

### Thứ tự đề xuất nếu Lãm đồng ý

1. **Ngay (không cần duyệt thêm giá):** D2 → An làm B1 đến B3; Lãm + Claude làm F1 và F3 (cách bán đúng thứ khách hỏi dùng dữ kiện thật, tạm dùng Trọn đời).
2. D4 + D3 → An làm B4, B5, B6.
3. D1 → chạy đợt Năm, rồi Chặng; mở bán khi đạt; F2, F4, F5 theo bản mẫu HTML từng giai đoạn.
4. Sau đó Tình duyên/Công việc/Tháng/Combo theo cổng.
5. Hội viên và Hợp đôi: chỉ khi Lãm chọn công cụ / mở Bát Tự.

### Giới hạn của tài liệu này

- Chưa kiểm chất lượng bài viết thật của bất kỳ món nào đang giữ (không có đợt 20 bản).
- Giá đề xuất (360, 780) là giả thuyết kinh doanh, không có số liệu mua thật.
- Quy tắc cách tính đại vận (Cục, chiều thuận/nghịch) em lấy từ kiến thức Tử Vi phổ biến và kết quả engine; không trích được trang web nào trong phiên này cho phần công thức.
- Nghiên cứu đối thủ giới hạn ở các trang tải được; phần lớn không công khai giá.
- 7 lá số ở mục 4.2 là dữ liệu tổng hợp để thử engine, không đại diện cho tỉ lệ khách thật.
