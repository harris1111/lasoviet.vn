# Nội dung đa lăng kính — soạn sẵn, chờ backend để deploy

> Founder đã xác nhận (2026-09-10): giữ bản methodology.mdx / sources.mdx hiện tại làm bản LIVE
> (chỉ nói về Tử Vi + khung "đang hoàn thiện" cho các hệ khác), đồng thời chuẩn bị sẵn bản ĐẦY ĐỦ
> dưới đây để activate ngay khi backend của từng hệ (Bát Tự, Chiêm tinh, Thần số học, Kinh Dịch...)
> hoàn thành. KHÔNG tự merge file này vào `content/public/vi/pages/*.mdx` — chỉ activate khi điều
> kiện kích hoạt bên dưới đã đúng.

## Điều kiện kích hoạt

Kích hoạt **toàn bộ khối "Thư viện phương pháp luận" bên dưới cho một hệ cụ thể** chỉ khi cả ba đúng:

1. Engine tính toán của hệ đó đã chạy thật trong sản phẩm (không phải preview/mẫu minh họa — xem trạng thái hiện tại của từng hệ trong `apps/web/src/features/discipline-pages/content-*.ts`).
2. Bộ căn cứ luận giải (evidence rules) cho hệ đó đã có, theo đúng chuẩn "Vì sao có nhận định này?" áp dụng cho Tử Vi hiện nay.
3. Người biên tập nội dung đã **xác minh thật** danh mục cổ thư/nguồn tham chiếu của hệ đó — KHÔNG dùng nguyên bản danh mục cổ thư trong `revisions/vi/trust.sources.md` (Module 2–8) vì đó là danh mục do AI soạn khi viết bản nháp, chưa được đối chiếu với việc engine thật sự triển khai đúng những quy tắc của các bộ sách đó. Ô "Nguồn xác thực" bên dưới cố ý để trống chờ điền khi có thật.

Cho tới lúc đó, `content/public/vi/pages/method.mdx` và `sources.mdx` giữ nguyên bản hiện tại (chỉ Tử Vi vận hành đầy đủ, các hệ khác ghi "đang hoàn thiện").

---

## 1. Bản đầy đủ cho `content/public/vi/pages/method.mdx`

```mdx
---
{
  "version": 3,
  "routeId": "methodology.root",
  "locale": "vi",
  "contentType": "MethodologyPage",
  "title": "Phương pháp luận",
  "summary": "Quy trình bốn chặng áp dụng cho mọi hệ tại Lá Số Việt: xác thực đầu vào, khởi lập chính tông, luận giải đa tầng và minh bạch căn cứ.",
  "intent": "methodology.root.vi.public",
  "authorId": "trust-reviewer",
  "reviewerIds": ["trust-reviewer"],
  "sourceIds": ["normalized-chart-contract", "iztro-mapping", "fixture-manifest", "trusted-fixture-sources"],
  "riskTags": ["uncertainty_disclosure", "ai_transparency"],
  "status": "published",
  "lastReviewed": "REPLACE_WITH_ACTIVATION_DATE",
  "relatedRouteIds": ["calculator.tu-vi", "knowledge.tu-vi"],
  "limitations": "Nội dung chỉ dựa trên dữ liệu và giới hạn đã công bố trong repository; không phải dự báo chắc chắn hay tư vấn chuyên môn."
}
---
# Phương pháp luận

## Một hệ tri thức cổ, một cách trình bày rõ ràng

Huyền học không phải trò đoán mò. Mỗi lời luận giải tại Lá Số Việt là kết quả của quy luật lịch pháp, phép tính nhất quán và tri thức cổ học được đúc kết qua nhiều thế kỷ — dù là Tử Vi, Bát Tự, chiêm tinh phương Tây, Thần Số Học hay Kinh Dịch.

## Bốn chặng, một đường đi rõ ràng

1. **Xác thực đầu vào:** chuẩn hóa ngày, giờ, nơi sinh (hoặc câu hỏi/thời điểm với Kinh Dịch, họ tên với Thần Số Học). Thiếu dữ liệu thì nói thẳng, không đoán mò.
2. **Khởi lập chính tông:** dựng cấu trúc theo đúng quy tắc cổ điển của hệ đang áp dụng, không tự ý bẻ cong nguyên lý.
3. **Luận giải đa tầng:** đối chiếu chéo nhiều dấu hiệu để tạo một diễn giải riêng, không dùng văn mẫu chung chung.
4. **Minh bạch căn cứ:** mọi nhận định quan trọng đều mở được căn cứ gốc để bạn tự kiểm chứng.

## Thư viện phương pháp luận từng bộ môn

<!-- ACTIVATE PER DISCIPLINE — xoá dòng "Đang hoàn thiện" và điền Nguồn xác thực thật khi đủ 3 điều kiện kích hoạt -->

### Tử Vi Đẩu Số — tinh hoa Á Đông
**Trạng thái: đang vận hành đầy đủ.**
Lấy thời khắc sinh an định 12 cung chức và các tinh tú; đối chiếu tam hợp, xung chiếu, ngũ hành và Tứ Hóa qua các vòng đại vận 10 năm.
Engine: iztro 2.6.0, bộ quy tắc ziwei.default — xem chi tiết tại [Phương pháp Tử Vi](route:methodology.tu-vi).

### Bát Tự / Tứ Trụ — cân bằng ngũ hành
**Trạng thái: [ĐANG HOÀN THIỆN / ĐANG VẬN HÀNH — cập nhật khi activate]**
Phân tích 4 trụ Năm – Tháng – Ngày – Giờ qua 8 chữ Can Chi; đánh giá vượng – khuyết ngũ hành để tìm Dụng thần và Hỷ thần.
**Nguồn xác thực:** _[điền khi engine công bố — không copy danh mục cổ thư từ bản nháp AI]_

### Chiêm tinh học phương Tây — tâm lý sâu
**Trạng thái: [ĐANG HOÀN THIỆN / ĐANG VẬN HÀNH — cập nhật khi activate]**
Tái hiện bầu trời thiên văn tại tọa độ thời khắc chào đời; phân tích vị trí thiên thể, 12 Cung Hoàng Đạo, 12 Nhà và các góc chiếu.
**Nguồn xác thực:** _[điền khi engine công bố]_

### Thần Số Học — tần số Pythagoras
**Trạng thái: [ĐANG HOÀN THIỆN / ĐANG VẬN HÀNH — cập nhật khi activate]**
Giải mã tần số từ ngày sinh và danh xưng; xác định Con số đường đời, Con số linh hồn và chu kỳ phát triển 9 năm.
**Nguồn xác thực:** _[điền khi engine công bố]_

### Kinh Dịch — minh triết biến dịch
**Trạng thái: [GIAI ĐOẠN NGHIÊN CỨU / ĐANG VẬN HÀNH — cập nhật khi activate]**
Khởi quẻ theo thời khắc đặt câu hỏi; giải mã 64 quẻ kép qua Tượng quẻ, Thoán từ, Hào từ.
**Nguồn xác thực:** _[điền khi engine công bố]_

<!-- Chỉ thêm Tarot / Phong Thủy / Nhân tướng vào danh sách này khi có kế hoạch sản phẩm thật — hiện chưa có route non-reserved nào cho các hệ này ngoài preview. -->

## Bảng phân định dữ liệu đầu vào

| Nhóm bộ môn | Yêu cầu dữ liệu | Cam kết của Lá Số Việt |
| :--- | :--- | :--- |
| Phụ thuộc giờ sinh chính xác (Tử Vi, Chiêm tinh, Bát Tự) | Năm, Tháng, Ngày, Giờ & Nơi sinh | Nếu thiếu giờ sinh, chúng tôi nói thẳng phần nào chưa tính được, không đoán mò. |
| Chỉ cần ngày sinh & tên gọi (Thần Số Học) | Ngày sinh dương lịch, họ tên đầy đủ | Tính theo tần số con số và mẫu tự, không phụ thuộc giờ sinh. |
| Theo câu hỏi / thời điểm thực tế (Kinh Dịch) | Câu hỏi chân thành & thời khắc gieo quẻ | Không cần ngày giờ sinh; tập trung vào bản chất sự việc tại hiện tại. |

## Khi dữ liệu chưa đủ, chúng tôi nói thẳng

Nếu giờ sinh chưa đủ điều kiện, hệ thống không đoán bừa để có một kết quả cho có. Đây là ranh giới chúng tôi chủ động đặt ra, không phải một lỗi cần giấu.

## Ba nguyên tắc đạo đức học thuật

- **Lá số là bản đồ, bạn là người cầm lái:** chúng tôi chỉ ra quy luật vận động của thời vận để bạn chủ động phòng bị, không phán định số phận như một bản án.
- **Không mê tín hù dọa:** không bao giờ dùng lời phán xui rủi hay "hạn xấu" để gieo rắc sợ hãi.
- **Rõ ràng giới hạn:** huyền học là công cụ tự soi chiếu, không thay thế chẩn đoán y khoa, tư vấn pháp lý hay quyết định tài chính rủi ro.

## Giới hạn

Nội dung này chỉ mô tả hành vi, dữ liệu và phạm vi công khai của sản phẩm. Nó không dự báo chắc chắn, không chẩn đoán và không thay thế tư vấn chuyên môn.

## Tiếp tục

[Lập lá số Tử Vi](route:calculator.tu-vi), [khu kiến thức Tử Vi](route:knowledge.tu-vi).
```

---

## 2. Bản đầy đủ cho `content/public/vi/pages/sources.mdx`

```mdx
---
{
  "version": 3,
  "routeId": "trust.sources",
  "locale": "vi",
  "contentType": "SourceReference",
  "title": "Nguồn tri thức",
  "summary": "Danh mục các nguồn và căn cứ giúp người đọc truy nguyên phương pháp, thuật ngữ và nội dung được sử dụng — cập nhật theo từng hệ khi công bố.",
  "intent": "trust.sources.vi.public",
  "authorId": "trust-reviewer",
  "reviewerIds": ["trust-reviewer"],
  "sourceIds": ["brand-guideline", "technical-architecture", "source-manifest"],
  "riskTags": ["source_attribution", "uncertainty_disclosure"],
  "status": "published",
  "lastReviewed": "REPLACE_WITH_ACTIVATION_DATE",
  "relatedRouteIds": ["calculator.tu-vi", "knowledge.tu-vi", "methodology.tu-vi"],
  "limitations": "Nội dung chỉ dựa trên dữ liệu và giới hạn đã công bố trong repository; không phải dự báo chắc chắn hay tư vấn chuyên môn."
}
---
# Nguồn tri thức

## Đứng trên vai những bậc tiền nhân, trình bày minh bạch

Trí tuệ của Lá Số Việt không đến từ việc ghép chữ ngẫu nhiên hay tài liệu cóp nhặt trôi nổi. Trang này liệt kê những gì đứng sau nội dung bạn đang đọc, hệ nào đã xác minh được nguồn, hệ nào chưa — để bạn tự kiểm tra thay vì chỉ tin vào một cái tên nghe uy tín.

## Ba tiêu chuẩn chọn nguồn học thuật

- **Bản gốc chính tông:** chỉ kế thừa từ những quy tắc luận giải đã được khảo nghiệm qua thời gian, không suy diễn tùy tiện.
- **Khảo nghiệm thời gian:** ưu tiên quy tắc đã tồn tại đủ lâu để chứng minh tính thực tiễn.
- **Không dùng văn mạng:** loại bỏ tài liệu trôi nổi, sao chép thiếu kiểm chứng.

## Những gì đứng sau một lá số Tử Vi (đã xác minh)

- **Phương pháp:** hệ Tử Vi Đẩu Số truyền thống, theo trường phái đang áp dụng — xem [Phương pháp Tử Vi](route:methodology.tu-vi).
- **Cách tính:** engine công khai phiên bản (iztro 2.6.0, ziwei.default), người am hiểu kỹ thuật có thể tự đối chiếu.
- **Kiểm thử:** các ca khó — tháng nhuận, ranh giới giờ Tý, múi giờ nơi sinh — kiểm tra bằng bộ ca thử nghiệm cụ thể trước khi phát hành.
- **Biên tập:** nội dung diễn giải được đội ngũ Lá Số Việt xem xét trước khi công bố.

## Các hệ đang chờ xác minh nguồn

<!-- ACTIVATE PER DISCIPLINE — chỉ chuyển một dòng từ đây lên phần "đã xác minh" phía trên khi
     người biên tập đã đối chiếu THẬT quy tắc engine với nguồn cổ học tương ứng. -->

- **Bát Tự / Tứ Trụ:** engine đang trong giai đoạn hoàn thiện; nguồn phương pháp sẽ công bố kèm phiên bản khi engine phát hành.
- **Chiêm tinh học phương Tây:** engine đang trong giai đoạn hoàn thiện; nguồn phương pháp sẽ công bố kèm phiên bản khi engine phát hành.
- **Thần Số Học:** engine đang trong giai đoạn hoàn thiện; nguồn phương pháp sẽ công bố kèm phiên bản khi engine phát hành.
- **Kinh Dịch:** đang ở giai đoạn nghiên cứu phương pháp; chưa có mốc công bố nguồn.

## Cam kết "chuyển ngữ" cho thời đại mới

1. **Bảo tồn nguyên bản quy tắc cổ học:** không thay đổi phép tính, không bẻ cong nguyên lý.
2. **Việt hóa sáng rõ, gãy gọn:** chuyển thuật ngữ Hán-Việt hay biểu tượng cổ xưa thành bài học thực tế, dễ hiểu.
3. **Nói có sách, mách có chứng:** mọi nhận định đều có thể truy ngược về đúng quy tắc nguồn — chỉ công bố khi nguồn đó đã được xác minh thật, không phải suy đoán.

## Những gì chúng tôi chưa thể đối chiếu đầy đủ

Có những khác biệt thật sự giữa các trường phái — như giờ Tý sớm/muộn hay cách tính theo giờ mặt trời thực — mà một danh mục nguồn không thể tự biến thành lời xác nhận cho mọi cách diễn giải khác.

## Giới hạn

Nội dung này chỉ mô tả hành vi, dữ liệu và phạm vi công khai của sản phẩm. Nó không dự báo chắc chắn, không chẩn đoán và không thay thế tư vấn chuyên môn.

## Tiếp tục

[Lập lá số Tử Vi](route:calculator.tu-vi), [khu kiến thức Tử Vi](route:knowledge.tu-vi).
```

---

## Việc cần làm khi kích hoạt một hệ (ví dụ: Bát Tự đi live)

1. Xác minh thật nguồn phương pháp Bát Tự cùng người phụ trách kỹ thuật (không copy nguyên văn danh mục cổ thư từ bản nháp gốc `revisions/vi/trust.sources.md` — đó là nội dung AI soạn chưa qua đối chiếu).
2. Cập nhật dòng "Bát Tự / Tứ Trụ" trong hai khối trên: đổi trạng thái, điền nguồn xác thực.
3. Copy hai khối MDX đã cập nhật vào `content/public/vi/pages/method.mdx` và `sources.mdx`, đổi `lastReviewed` thành ngày thật, đồng bộ `config/public-content.json`.
4. Chạy `node scripts/check-public-content.mjs` trước khi commit.
