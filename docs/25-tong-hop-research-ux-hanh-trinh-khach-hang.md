# 25 — Tổng hợp research, biên bản họp và đánh giá UX / hành trình khách hàng

**Ngày tổng hợp:** 26/09/2026
**Phạm vi:** mọi tài liệu nghiên cứu, biên bản quyết định, audit trải nghiệm và kiểm thử giao diện đang còn hiệu lực trong repo (không đọc thư mục `_archive`), cộng với gói audit UX độc lập ngày 09/09 đang nằm ngoài repo.
**Vai trò file này:** bản đồ và bản tóm tắt. Quyết định chính thức vẫn chỉ nằm trong tracker (`docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`). Khi file này lệch với tracker, tracker đúng.

---

## 0. Đọc nhanh — 7 điều quan trọng nhất

1. **Chưa từng có nghiên cứu với khách hàng thật.** Mọi "research" đến nay là nghiên cứu bàn giấy (đối thủ, thị trường, social listening), audit bằng cách đọc code, và một "hội đồng 16 chuyên gia" do AI mô phỏng. Buổi phỏng vấn 8–12 người dùng (WP-14) đã được lên kế hoạch nhưng chưa làm.
2. **Hành trình chính đã rõ và đã được chốt:** tìm thấy → trang chủ hoặc công cụ miễn phí → nhập ngày giờ sinh → xem lá số miễn phí → chọn luận giải, trả bằng Lá → nạp Lá qua VietQR → đọc báo cáo → quay lại hằng ngày (hội viên).
3. **Lỗi nặng nhất từng phát hiện đã được xử lý ở phía máy chủ:** mã chuyển khoản bị đổi khi khách đang chuyển tiền (khách mất tiền mà không nhận hàng). Việc đối soát tự động, tự nhận giao dịch và tự ngắt bán khi lỗi đã xong.
4. **Lỗi đăng nhập Google làm mất dữ liệu đang nhập đã sửa xong** (16/09). Chỉ còn một lần thử với tài khoản Google thật trên tên miền chính.
5. **Chưa kiểm trên điện thoại thật cảnh khách mở app ngân hàng rồi quay lại trang thanh toán.** Đây là tình huống thanh toán hay gặp nhất ở Việt Nam, và mục này vẫn đang treo.
6. **Chất lượng báo cáo trả phí từng bị anh chấm là mỏng, chung chung, nhiều từ Hán Việt.** Đã chốt hướng sửa (viết từng phần, tiếng Việt đời thường, có cổng kiểm chất lượng); việc làm vẫn đang chạy.
7. **Có 8 chỗ tài liệu cũ đang nói ngược với quyết định mới** (mục 5). Nếu không dọn, người làm tiếp dễ đọc nhầm luật cũ.

---

## 1. Kho tài liệu — đã có những gì

### A. Nghiên cứu khách hàng và thị trường

| Ngày | Tài liệu | Nội dung chính | Tình trạng |
|---|---|---|---|
| đầu 09/2026 | Deep research + social listening về khách hàng mục tiêu (`docs/_archive/completed/20-deep-research-ta-social-listening-handoff.md`) | Nghiên cứu khách hàng mục tiêu qua mạng xã hội | Đã đưa vào brand guideline và bộ luật nội dung. Nằm trong archive nên lần này **chưa đọc lại** |
| 09/09 | Nghiên cứu đối thủ trong `voice-and-positioning.md` | huyenmenh.com, tuviluangiai.vn, tuvi.vn, xem-tuvi.com: ai cũng hứa "miễn phí trọn đời", "chính xác nhất", nên đó không còn là điểm khác biệt | Còn dùng |
| 09/09 | Giả định kinh tế trong biên bản vòng 2 | Chi phí AI dưới 5.000đ/báo cáo; phí SePay gần 0%; tỷ lệ hoàn tiền 3–5%; 8–12 tuần đầu gần như chưa có traffic | **Chỉ là giả định**, phải thay bằng số thật khi có traffic |
| 13/09 | Bóc tách mô hình thu tiền của AITuvi (trong spec Lá, §2) | 4 đường doanh thu: gói luận giải, ví Xu, gói hỏi AI, thuê bao xem hằng ngày; giá niêm yết của họ | Còn dùng làm tham khảo |

### B. Benchmark giao diện đối thủ

| Ngày | Tài liệu | Nội dung chính |
|---|---|---|
| 13/09 | `docs/superpowers/specs/2026-09-13-aituvi-ui-adaptation-for-lasoviet.md` + ảnh chụp ở `docs/reference/aituvi-benchmark-2026-09-13/` | Đo trực tiếp AITuvi và lasoviet.net: chữ của mình nhỏ hơn (13,5–14px so với 16px), trang chủ trên điện thoại dài hơn khoảng 60% (20.287px so với 12.724px), form nhập nằm dưới 3 đoạn chữ thay vì ở ngay màn hình đầu. Từ đó ra bộ luật cỡ chữ, giới hạn số chữ, cách bố trí từng trang. Đây là chuẩn giao diện đang bắt buộc (FD-091) |

### C. Biên bản họp và phỏng vấn quyết định

| Ngày | Tài liệu | Nội dung chính |
|---|---|---|
| 08/09 | "Hội đồng brainstorm" về bậc thang sản phẩm (bản gốc không còn trong repo; kết quả nằm trong spec ladder 08/09) | Hướng miễn phí → gói nhỏ → gói toàn diện; KPI chính là lãi trên mỗi khách lập lá số |
| 09/09 | `docs/superpowers/plans/2026-09-09-founder-decisions-round2.md` | Phỏng vấn anh, chốt FD-040 đến FD-056: mã chuyển khoản ngắn 12 ký tự, luôn giữ giá tròn, khách tự nhận giao dịch, báo động qua Telegram, hạn 7 ngày cho phần giảm giá khi nâng cấp, quy tắc đo lường |
| 09/09 | "Hội đồng UX/UI/CX 16 vai trò" (`~/Downloads/lasoviet-ux-content-handoff/02-council-minutes.md`) | **Do AI mô phỏng, không phải người thật.** Đưa ra 7 khuyến nghị: lời hứa phải khớp với thứ đang chạy thật, một offer rõ ràng, giảm chữ lặp, duyệt nội dung từng trang trước khi đăng |
| 13/09 → 26/09 | Các quyết định lẻ trong tracker (FD-057 đến FD-102) | Ví Lá, bảng giá, được viết thẳng về hạn xấu (FD-089), hội viên, công cụ miễn phí, trang chủ V3, giao diện sáng/tối, bỏ lệnh cấm lời chứng thực của khách (26/09) |

### D. Đánh giá UX / CX / hành trình (audit)

| Ngày | Tài liệu | Cách làm | Phát hiện chính |
|---|---|---|---|
| 31/08 | `docs/reference/vp-design-ux-sitemap-wireframes.md` | Góc nhìn "VP Design" | 5 hành trình chuẩn (A–E), khung sườn từng màn hình, cổng kiểm tra trước khi phát hành |
| 31/08 | `current-state-audit.md` | Đọc repo | Ảnh chụp tình trạng ban đầu; chủ yếu về kỹ thuật |
| 08/09 | `docs/superpowers/specs/2026-09-08-product-ladder-and-post-purchase-experience.md` §1–2 | Đọc code | 17 quan sát; phát hiện lỗi mất tiền (mã chuyển khoản bị đổi); trang tài khoản trống; lỗi báo cáo chỉ có một dòng email |
| 09/09 | Gói audit độc lập `~/Downloads/lasoviet-ux-content-handoff/` (tóm tắt, biên bản hội đồng, 3 audit chi tiết, 4 file yêu cầu, wireframe) | Đọc code, **không mở web thật, không thanh toán thật** | 10 phát hiện ưu tiên: trang tin cậy chỉ hiện tiêu đề, hứa 4 bộ môn trong khi mới có Tử Vi, công cụ miễn phí nói "dùng được ngay" trong khi chưa chạy, chọn luận giải thiếu thông tin trước khi mua, trang tài khoản không tự phục vụ được |
| 12–16/09 | `docs/21-audit-tao-tai-khoan-luu-la-so-flow.md` | Lần theo code và thử lại trên web | Đăng nhập Google giữa chừng làm mất dữ liệu và văng về form trống. Đã sửa xong 16/09 |
| 13/09 | `docs/superpowers/specs/2026-09-13-ziwei-v4-report-depth-and-personalization.md` §1 | Anh đọc một báo cáo thật, sau đó kiểm code | Báo cáo mỏng, không cá nhân hoá, nhiều Hán Việt; tìm ra 6 nguyên nhân (90% kho kiến thức là tiếng Trung, giới hạn độ dài quá thấp…) |
| 15/09 | `docs/claims-registry-audit.md` | Đối chiếu từng lời hứa công khai với nguồn | 20 lời hứa về quyền riêng tư, thanh toán, Lá, hoàn tiền; chỉ còn câu chữ trên hoá đơn chờ kế toán xác nhận |

### E. Kiểm thử giao diện và đánh giá chất lượng

| Ngày | Tài liệu | Kết quả |
|---|---|---|
| 09/09 | Báo cáo WP-13 (`.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/task-wp13-*`) | 27 bài test tự động trên nhiều cỡ màn hình đều qua. Phát hiện nút logo và nút đăng nhập trên header điện thoại quá nhỏ để bấm. **Chưa kiểm cảnh quay lại từ app ngân hàng; anh chưa ký duyệt** |
| 14/09 | LSV-14: ảnh bằng chứng ở `docs/reports/evidence/lsv-14/` và kế hoạch ở `docs/superpowers/plans/2026-09-14-lsv-14-domain-readability-remediation.md` | Độ tương phản, phóng to 200%, màn hình hẹp 320px, cỡ chữ đọc |
| 16/09 | LSV-36: ảnh bằng chứng trình đọc báo cáo | Trình đọc ở 3 cỡ màn hình |
| 17/09 | `docs/superpowers/reports/2026-09-17-lsv-16-v4-sample-50-ce3d9ad69e8d.md` | 50 đoạn mẫu của kho kiến thức mới để anh duyệt |

### F. Các spec được rút ra từ những nghiên cứu trên (đầu ra, đang bắt buộc)

- Giao diện từng trang: spec AITuvi 13/09 (FD-091)
- Trang chủ: `docs/superpowers/specs/2026-09-23-homepage-content-spec.md` (FD-100)
- Lá, xem trước bị khoá, cách bán: `docs/superpowers/specs/2026-09-13-progressive-reveal-la-credits-and-conversion-ui-design.md`
- Luật nội dung: `docs/13-brand-experience-guideline.md` và `docs/superpowers/specs/2026-09-09-content-ux-polish/revisions/CONTENT-RULES.md`
- Giao diện đã duyệt: `prototype/revamp-2026-09/` (FD-098)

---

## 2. Khách hàng là ai — những gì đã biết

**Chưa biết:** tuổi, giới tính, thu nhập, vùng miền. Chưa có tài liệu nào chứng minh được những điều này, nên đừng tự bịa chân dung khách.

**Đã biết:** khách tìm đến lúc đang **băn khoăn về một chuyện cụ thể** và thường gõ tên bộ môn ("tử vi", "lá số tử vi"). Các nhóm nhu cầu:

| Nhu cầu | Khách hỏi | Khách sợ gì | Lá Số Việt trả lời bằng |
|---|---|---|---|
| Hiểu bản thân | "Lá số nói gì riêng về tôi?" | Đọc toàn văn mẫu, ai cũng giống ai | Điểm mạnh, điểm yếu, kèm lý do trên chính lá số |
| Tình cảm, hôn nhân | "Chuyện này là sao?" | Bị phán một câu xui | Đọc cung Phu Thê thẳng thắn, kèm việc nên làm |
| Công việc, tiền bạc | "Nên chú ý gì?" | Muốn được bảo đảm kết quả | Giai đoạn thuận hay khó cho tiền và việc |
| Năm nay | "Tháng nào có hạn, chuẩn bị ra sao?" | Ngày xấu nghe như chắc chắn xảy ra | Tháng có hạn do máy tính ra, kèm cách chuẩn bị |
| Không nhớ giờ sinh | "Có dùng được không?" | Nhập sai, mất tiền oan | Giải thích phần nào vẫn dùng được; không bán luận giải Tử Vi khi thiếu giờ |
| Mua online | "Trả tiền rồi có nhận được không?" | Người bán lạ, xác nhận chậm | Báo cáo mẫu đúng sản phẩm, giá rõ, trạng thái đơn rõ, có đường tự xử lý |

**Hai nỗi đau thị trường mình đang đánh vào** (bộ luật nội dung, mục 5):
1. Web tử vi khác viết chung chung, nhạt, ai đọc cũng giống ai.
2. Đi xem thầy dễ bị phán một câu làm hoang mang.

**Lời hứa khác biệt:** sâu, viết riêng cho từng lá số, có căn cứ ("nói có sách, mách có chứng"), người quyết định cuối cùng là khách.

---

## 3. Hành trình khách hàng chuẩn (hiện hành)

Nguồn: brand guideline §6.2 (bản 22/09), cộng với các quyết định đến 26/09.

| Bước | Khách muốn gì | Đã chốt | Vấn đề đã thấy | Tình trạng |
|---|---|---|---|---|
| 1. Tìm thấy | Trả lời đúng câu đang tìm | Trang bộ môn; công cụ miễn phí (lịch âm, thần số học, giải mộng…) có lối dẫn sang Tử Vi (FD-090) | Công cụ từng ghi "dùng được ngay" trong khi chưa chạy | Công cụ chỉ được index khi trả kết quả thật (docs/23) |
| 2. Trang chủ | Hiểu nhanh, bắt tay làm ngay | Form nằm ngay màn hình đầu; không hiện giá (FD-069, FD-101); các bộ môn chưa chạy dùng nút "Tìm hiểu …" | Trang từng quá dài, chữ nhỏ, hứa 4 bộ môn | Trang chủ V3 đã lên; mục tiêu dưới 12.000px trên điện thoại |
| 3. Nhập ngày giờ sinh | Không phải nhập lại, không mất dữ liệu | 3 bước; có "Không rõ giờ sinh"; 2 câu hỏi hoàn cảnh không bắt buộc (FD-078); tự lưu nháp 24 giờ | Mất dữ liệu khi đăng nhập Google giữa chừng | **Đã sửa 16/09** |
| 4. Lá số miễn phí | Thấy "đúng là mình" | Lá số 12 cung luôn mở; nhận định miễn phí; đoạn luận giải thật bị khoá bớt (FD-068); tab Lá số · Tổng quan · Năm nay · 12 cung · Chủ đề · Căn cứ | Không có nút lưu thật; hai lỗi hiển thị | Đã sửa (ticket #40) |
| 5. Chọn luận giải | Biết rõ mua gì, giá bao nhiêu | Giá tính bằng Lá (Bản mệnh 240, Toàn diện 960, nâng cấp 720); gói nạp 29k/99k/249k/599k; hội viên tháng/năm | Trước đây chỉ có tên và giá, thiếu mục lục, mẫu, điều kiện | Spec và prototype xong; **ticket #23 chưa làm** (theo kế hoạch 24/09) |
| 6. Thanh toán | Chuyển một lần, chắc chắn nhận được | VietQR; mã 12 ký tự; giữ đơn 24 giờ; khách tự nhận giao dịch; tự ngắt bán khi đối soát tụt | Mã chuyển khoản bị đổi làm khách mất tiền | **Máy chủ đã xong.** Cảnh quay lại từ app ngân hàng chưa kiểm |
| 7. Đọc báo cáo | Đọc dễ, thấy đáng tiền | Viết từng phần, tiếng Việt đời thường, cổng kiểm chất lượng (FD-072 đến FD-077); được viết thẳng về hạn (FD-089) | Báo cáo mỏng, nhiều Hán Việt | Đang làm (ticket #15, #38); trình đọc mới **ticket #25 chưa làm** |
| 8. Quay lại | Có lý do quay lại | Thư viện tài khoản; "Hôm nay của bạn" cho hội viên (FD-093); email báo cáo xong | Trang tài khoản từng trống | Máy chủ xong; giao diện theo prototype `thu-vien.html` |

**Các hành trình phụ bắt buộc phải có lối ra:**

- **Không rõ giờ sinh:** vẫn xem được phần dùng được, không có nút mua Tử Vi, hướng dẫn tìm lại giờ sinh.
- **Đã chuyển tiền mà chưa thấy báo cáo:** tra theo mã đơn và tự nhận giao dịch. Không bao giờ bảo khách chuyển lại.
- **Đã trả tiền nhưng báo cáo lỗi:** báo rõ đã nhận tiền, kèm mã đơn và nút hỗ trợ điền sẵn mã đơn.
- **Hỗ trợ:** email lasoviet.net@gmail.com; Messenger sẽ hiện khi anh gửi link fanpage (FD-095, FD-099).

---

## 4. Danh sách vấn đề UX đã phát hiện và tình trạng xử lý

| # | Vấn đề | Ai phát hiện, lúc nào | Mức độ | Tình trạng |
|---|---|---|---|---|
| 1 | Mã chuyển khoản đổi khi khách đang chuyển, tiền vào nhưng không giao hàng | Audit 08/09 | Nghiêm trọng | Đã xong phía máy chủ (WP-01, 02, 02B) |
| 2 | Đơn hết hạn sau 15 phút, trong khi chuyển khoản lần đầu thường lâu hơn | Audit 08/09 | Nghiêm trọng | Đã nâng lên 24 giờ |
| 3 | Đăng nhập Google làm mất dữ liệu, văng về form trống | Anh, 12/09 | Cao | Đã sửa 16/09; còn thử Google thật (LSV-35) |
| 4 | Trang phương pháp, chính sách, liên hệ chỉ hiện tiêu đề, không có nội dung | Audit 09/09 | Cao | **Cần kiểm lại** trên web hiện tại |
| 5 | Hứa "4 bộ môn đã kích hoạt" trong khi chỉ Tử Vi chạy | Audit 09/09 | Cao | Trang chủ V3 dùng nút "Tìm hiểu …" |
| 6 | Trang chọn luận giải thiếu thông tin trước khi mua | Audit 08/09 và 09/09 | Cao | Spec xong, ticket #23 chưa làm |
| 7 | Trang tài khoản trống, không tìm lại được báo cáo đã mua | Audit 08/09 | Cao | Máy chủ xong; giao diện theo prototype |
| 8 | Báo cáo trả phí mỏng, chung chung, nhiều Hán Việt | Anh, 13/09 | Cao | Đang làm (#15, #38) |
| 9 | Trang chủ điện thoại quá dài, chữ quá nhỏ | Benchmark 13/09 | Trung bình | Trang chủ V3 và bộ luật cỡ chữ |
| 10 | Nút trên header điện thoại quá nhỏ để bấm | WP-13, 09/09 | Trung bình | Đã giao sửa; **cần xác nhận lại** |
| 11 | Trang báo cáo mẫu vẫn in "79.000 ₫" | Benchmark 13/09 | Trung bình | Ticket #24 chưa làm |
| 12 | Chưa kiểm cảnh quay lại từ app ngân hàng trên điện thoại thật | WP-13 | Cao | **Còn treo** |
| 13 | Anh chưa ký duyệt bộ kiểm thử giao diện (FD-056) | WP-13 | — | **Còn treo** |

---

## 5. Chỗ tài liệu đang nói ngược nhau (cần anh chốt)

| # | Chỗ lệch | Tài liệu cũ nói | Quyết định mới hơn | Đề xuất |
|---|---|---|---|---|
| 1 | Khách được xem mấy nhận định miễn phí trước khi đăng nhập? | Brand guideline §6.4 và spec ladder: **3** | Spec trang chủ 23/09: **2** (1 về bản thân, 1 theo chủ đề) | Anh chốt một con số |
| 2 | Chọn giờ sinh | Spec trang chủ 23/09: dropdown 12 khung giờ | FD-100: giờ phút chính xác, khoảng giờ, hoặc không rõ | Sửa spec trang chủ theo FD-100 |
| 3 | Cổng "chống dark pattern" trong tài liệu hành trình 31/08 (`docs/reference/vp-design-…` §1.7, §4 hành trình E, §9) | Cấm lời chứng thực, cấm chọn sẵn, cấm streak, cấm nhắc hạn để bán, cấm "vận xấu hôm nay" | FD-064, FD-089, FD-093 cho phép; lệnh cấm lời chứng thực bỏ ngày 26/09 | Xoá các mục đó, giữ phần sitemap và khung sườn |
| 4 | Lời chứng thực của khách | `voice-and-positioning.md`: cấm | Bỏ cấm ngày 26/09 | Sửa dòng đó (lời chứng thực phải là thật) |
| 5 | Chữ "chuyên gia" | `CONTENT-RULES.md` §4: "quy tắc của cổ nhân và các chuyên gia" | FD-071 và brand guideline: không bao giờ nói "chuyên gia" hay "đội ngũ" | Sửa CONTENT-RULES |
| 6 | Giá trong ví dụ của spec Lá 13/09 (§2.4, §7) | "19 Lá · 19.000đ", "Nạp đúng 12 Lá — 12.000đ" | FD-065: không ghi quy đổi ra tiền; FD-066: bỏ nạp đúng số thiếu, giá mới 240/960/720 | Cập nhật ví dụ |
| 7 | Có cần hỏi đồng ý trước khi đo hành vi? | FD-050 và spec ladder §7.2: không đo trước khi khách đồng ý | FD-080, FD-081: không có bảng hỏi đồng ý, đo có định danh | Đánh dấu FD-050 là đã bị thay trong tracker |
| 8 | Bản nháp nội dung vòng 1 và bản "final-copy" (`content-ux-polish/vi/`, `final-copy/`) | Nội dung cũ trước khi revise | Đã có `revisions/` và trang chủ V3 | Đưa vào archive |

---

## 6. Những việc nghiên cứu chưa làm

1. **Phỏng vấn người dùng vòng 1 (WP-14):** 8–12 người, 3 nhóm (người mới, người hay xem bói, người đọc kỹ), 7 nhiệm vụ từ lập lá số đến "đã chuyển tiền mà chưa thấy báo cáo". Chưa làm. Nhiệm vụ thanh toán giờ đã chạy được vì máy chủ đã xong.
2. **Test tìm đường, test cú bấm đầu tiên, test hiểu nội dung** (tài liệu hành trình §10): chưa làm.
3. **Số liệu phễu thật:** mới bật đo lường; các con số kinh tế vẫn là giả định ngày 09/09.
4. **Kiểm cảnh quay lại từ app ngân hàng trên điện thoại thật:** chưa làm.
5. **Giới hạn của những gì đã có:** hội đồng 16 vai trò là AI mô phỏng; audit 09/09 và 08/09 chỉ đọc code, không mở web; benchmark AITuvi không mua thật. Các tài liệu này tốt để tìm lỗi, nhưng **không chứng minh được khách sẽ mua**.

---

## 7. Đề xuất sắp xếp lại kho tài liệu (chờ anh duyệt, chưa làm)

1. **Đưa gói audit 09/09 vào repo.** Hiện nó chỉ nằm trong thư mục Downloads trên một máy. Đề xuất chép vào `docs/research/2026-09-09-ux-audit/`.
2. **Gom mọi nghiên cứu về một chỗ `docs/research/`**, có một file mục lục (file này). Chỉ trỏ tới, không di chuyển file spec đang bắt buộc, vì code và test đang đọc một số file theo đường dẫn (ví dụ `docs/21`).
3. **Dọn 8 chỗ lệch ở mục 5** theo luật "xoá chữ cũ đã bị thay".
4. **Mỗi lần có nghiên cứu mới**, thêm một dòng vào bảng mục 1 và cập nhật mục 4 và 5.
