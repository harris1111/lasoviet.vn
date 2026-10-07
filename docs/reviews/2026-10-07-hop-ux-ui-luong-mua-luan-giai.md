# Biên bản họp: rà soát UX/UI luồng từ lá số miễn phí tới mua luận giải — 07/10/2026

> Cuộc họp mô phỏng. Đây là bước **đánh giá**, chưa lập kế hoạch.
> Tư liệu: 9 ảnh desktop Lá Số Việt (giao diện tối), 11 ảnh AiTuvi (giao diện sáng), nhận xét của anh, bản mẫu đã duyệt `prototype/revamp-2026-09/la-so-ket-qua-v2*` và `la-so-ket-qua-v2-phase4-proposal.*` (FD-109, FD-116), kế hoạch `docs/superpowers/plans/2026-10-03-ux-funnel-overhaul/`, các ticket LSV-74 → LSV-80, mã nguồn `master` hôm nay.

## 0. Nguyên tắc của cuộc họp: không làm lại việc An đã xong

An đã giao xong 7/9 giai đoạn của kế hoạch 03/10 (LSV-74, 75, 76, 78, 80 Done; 77, 79 chờ SePay và email thật). Vì vậy mỗi nhận xét dưới đây được xếp vào **một trong ba loại**:

| Loại | Nghĩa | Cần anh làm gì |
|---|---|---|
| **A. Làm lệch bản đã duyệt** | Trang thật khác bản mẫu anh duyệt. Đây là lỗi triển khai. | Không cần duyệt lại. An sửa cho đúng bản mẫu. |
| **B. Đúng bản đã duyệt nhưng chưa ổn** | Trang làm đúng quyết định cũ, nhưng nhìn thực tế thì quyết định đó chưa tốt. | Anh quyết có đổi quyết định cũ không (FD-109, FD-110, FD-116…). |
| **C. Ngoài phạm vi kế hoạch cũ** | Kế hoạch 03/10 chưa nói tới. | Đưa vào kế hoạch mới nếu anh đồng ý. |

Những gì **đã làm tốt và giữ nguyên**, không bàn lại: form trang chủ một bước, tổng quan miễn phí dài ~1.400 chữ được lưu sẵn, đoạn năm/đại vận cắt giữa câu có mờ an toàn, tấm mở khoá tại chỗ, nạp Lá trong tấm (chờ SePay), phòng chờ, nhắc khách bỏ dở (chờ email thật).

## 1. Thành phần

CEO, COO, CFO, CIO, CISO, CMO, CTO; CXO, CDO, VP Design, VP UX, VP CX, Head of Design, Head of UX, Head of CX, Sr. Director Product Design, Sr. Director UX/UI.

## 2. AiTuvi làm gì mà khách chịu mua (đọc từ 11 ảnh)

1. **Mỗi tab là một "kệ hàng theo thời gian":** Luận cung, Đại vận, Tiểu vận, Nguyệt vận, Nhật vận, Chuyên đề. Khách hiểu ngay: mình có thể xem đời mình theo 10 năm, theo năm, theo tháng, theo ngày.
2. **Mỗi dòng có một đoạn đọc thử + giá ngay bên cạnh** ("Mở – 40 Xu"). Khách không phải đi tìm cái mình muốn mua.
3. **Biểu đồ "đường đời"** (đại vận dạng cột, tiểu vận dạng sóng, có mốc "Chính vận" / "Năm nay"). Đây là hình ảnh gây tò mò mạnh nhất trong cả luồng.
4. **Tổng quan miễn phí ~1.150 chữ rồi mờ giữa câu**, có nút neo giá "Luận giải toàn bộ (219k)" ở góc trên.
5. **Lá số truyền thống có con dấu đỏ** ở giữa — cảm giác "giấy tờ thật".

Điểm yếu của AiTuvi (ta nên tránh): chữ đọc thử giống nhau cho mọi người ("sự nghiệp thăng tiến…"), giá ở khắp nơi gây rối, bắt đăng nhập trước khi xem luận cung, popup "Hoàn thiện tài khoản" chen ngang, biểu đồ ngày trống dữ liệu (0%).

## 3. Đánh giá Lá Số Việt hiện tại (desktop)

### 3.1 Giao diện (UI)

| # | Nhận xét | Loại | Bằng chứng |
|---|---|---|---|
| U1 | **Lá số không dùng thiết kế đã duyệt** (nền sơn mài, hoa văn la kinh ở giữa, dấu triện đỏ). Trang chủ và trang đọc báo cáo có, riêng trang lá số miễn phí không có. | **A** | Bản mẫu `la-so-ket-qua-v2.css` có dấu triện và la kinh; `apps/web/src/styles/free-result-read-first.css` không dùng ảnh nào trong số đó. |
| U2 | **Desktop chia đôi màn hình**: lá số 4×4 to chiếm nửa trái, bài đọc dồn vào cột phải hẹp, chữ nhỏ. Cả trang chỉ dùng khoảng 60% chiều ngang màn hình. Bài tổng quan 1.400 chữ thành một cột dài hẹp, rất khó đọc (ảnh 9). | **A** | Bản mẫu desktop đã duyệt (FD-116, ảnh `plan/evidence/lsv75-prototype/proposal-1440-overview.png`): cột trái là bản đồ 12 cung gọn, cột đọc bên phải rộng, chữ to. Mã thật: `.fd109-layout` chia 1 : 1.1. |
| U3 | **Khung "Chi tiết cung vị đang chọn" và lá số lặp lại ở mọi tab** (Tổng quan, Năm nay, 12 cung, Chủ đề, Căn cứ). Khách cuộn qua cùng một khối 6 lần. | **B** | FD-109(e) duyệt "desktop giữ 6 tab, cột trái chỉ có lá số". |
| U4 | **"Xem lá số lớn hơn" mở ra bị cắt**: cột phải lá số mất chữ ("Cung Tài Bạc", "Cung Điền Trạch" tràn ra ngoài). | **A** (lỗi) | Ảnh 7. |
| U5 | **Biểu đồ mạng nhện "Mười hai cung mạnh yếu"** chiếm chỗ đẹp nhất nhưng tự ghi "không phải điểm số cuộc đời". Khách không biết dùng để làm gì. | **B** | FD-107/FD-111 cho phép điểm cấu trúc; cách trình bày là quyết định thiết kế. |
| U6 | **Trang chọn luận giải: 4/8 thẻ ghi "Sắp mở"**; tab Hội viên toàn "Sắp có", có thẻ mang hai nhãn "Sắp có Sắp có", nút cuối là "Sắp ra mắt". Nhìn như sản phẩm chưa xong. | **B** | Kế hoạch 03/10 chủ động hiện các món đang giữ là "Sắp mở". |
| U7 | **Ô chọn cung ghi "Độ mạnh cấu trúc: 71/100"** — thuật ngữ khó hiểu ngay tại chỗ khách sắp trả tiền. | **B** | FD-107: điểm phải đi kèm nhãn dễ hiểu. |
| U8 | Nhiều chi tiết vụn: nút "Chọn phần này" nhỏ và giống nhau; "Đăng nhập để xem hội viên" lặp hai lần; khối "Xóa dữ liệu lá số ẩn danh" to ở cuối trang bán hàng; header dính đè lên giữa nội dung khi cuộn. | **A/C** | Ảnh 1, 2, 4, 5. |

### 3.2 Trải nghiệm (UX)

| # | Nhận xét | Loại |
|---|---|---|
| X1 | **Tò mò về năm 2026 nhưng bị mời mua "Tử Vi trọn đời 960 Lá".** Khách bấm "Xem phần đọc sâu" ở tab Năm nay thì tấm mở khoá bán gói lớn nhất, không phải thứ họ đang hỏi. Lý do: gói Vận hạn 2026 (480 Lá) đang giữ chưa bán. | **B** (FD-116: tạm dùng Trọn đời khi gói năm còn giữ) |
| X2 | **Các nút "Chưa mở" ở tab 12 cung và Chủ đề là ngõ cụt:** không đọc thử, không giá, bấm vào không biết sẽ được gì. Hai chủ đề ở tab Chủ đề đều đang "Sắp mở" ở trang mua. | **B** (FD-109c: hàng bị khoá không có giá; FD-110 chỉ cho giá trong tấm do khách chủ động mở) |
| X3 | **Tab "Căn cứ" là tab ngang hàng** nhưng chỉ có 3 nút "Xem căn cứ" trống trơn. Khách mua luận giải không cần một tab riêng cho việc này; nó nên nằm cạnh từng nhận định. | **B** |
| X4 | **Trang chọn luận giải không trả lời "mua cái này tôi được gì":** không có mục lục, không đọc thử, không số trang, không so sánh Bản mệnh với Trọn đời ngay trên thẻ. | **C** |
| X5 | **Không có hình ảnh "đường đời theo thời gian"** (đại vận 10 năm, năm nay, tháng này) — thứ AiTuvi dùng để kéo tò mò mạnh nhất. Ta đã có dữ liệu đại vận và điểm cấu trúc có công thức (FD-107 có nhắc "later decadal cycles and years"). | **C** (cần anh quyết vì FD-063 cấm biểu đồ dự báo không có công thức) |
| X6 | **Đồng tiền "Lá" bắt khách đổi đơn vị:** thấy 960 Lá, số dư 0 Lá, phải sang tab Nạp Lá xem 99.000đ = 1.100 Lá. Khách không biết món mình mua giá bao nhiêu tiền thật. | **B** (FD-065: giá nội dung chỉ bằng Lá) |
| X7 | **Thứ tự 6 tab chưa theo hành trình tò mò:** Lá số → Tổng quan → Năm nay → 12 cung → Chủ đề → Căn cứ. Khách đọc tổng quan dài ở tab 2, rồi phải bấm sang từng tab, mỗi tab một kiểu nút. | **B** |

## 4. Ý kiến từng người (tóm tắt)

- **CEO:** Tiền nằm ở 3 chỗ: tò mò về **năm nay**, về **một cung cụ thể**, và về **trọn đời**. Hiện chỉ chỗ thứ ba bán được, và lại đem nó ra trả lời cho câu hỏi thứ nhất.
- **CFO:** Đừng mở thêm sản phẩm chỉ để có giá đúng chỗ (X1). Nhưng 4/8 thẻ "Sắp mở" làm giảm niềm tin vào cả 4 thẻ còn lại. Nên ẩn món chưa bán.
- **CMO:** Câu chữ mời mua đang nói về sản phẩm ("Tử Vi trọn đời · 960 Lá · Bằng giá 8 cung lẻ"). Cần nói về **điều khách được biết**.
- **CTO / CIO:** Lỗi U1, U2, U4 là sửa theo bản mẫu đã duyệt, không đụng luồng tiền, không đụng dữ liệu. Có thể làm ngay, rủi ro thấp.
- **CISO:** Đồng ý giữ nguyên quy tắc không lộ chữ của phần khoá. Khối "Xóa dữ liệu" có thể thu nhỏ nhưng phải còn dễ tìm.
- **CXO / VP CX:** Mọi nút "Chưa mở" phải dẫn tới một tấm có đọc thử thật của chính lá số đó. Ngõ cụt là chỗ khách rời đi.
- **CDO / VP Design / Head of Design:** Desktop đang là bản điện thoại kéo giãn. Cần một bố cục desktop riêng: lá số đẹp đúng thiết kế đã duyệt, cột đọc rộng chữ to, không lặp khối.
- **VP UX / Head of UX:** Bỏ tab Căn cứ, đưa căn cứ vào cạnh từng nhận định. Gộp lá số và tổng quan thành một màn đầu tiên. Các tab còn lại xếp theo thời gian: Năm nay → Đại vận → 12 cung → Chủ đề.
- **Sr. Director Product Design:** Thêm "đường đời 10 năm" dựa trên điểm cấu trúc có công thức (FD-107). Không vẽ đường dự đoán mỗi năm khi chưa có công thức.
- **Sr. Director UX/UI:** Trên trang chọn luận giải, mỗi thẻ phải có: ba dòng "bạn sẽ biết", số phần, đọc thử 1 đoạn của chính lá số, giá Lá kèm tiền đồng.
- **COO:** Không có việc thủ công mới. Mọi thay đổi vẫn là tự động.

## 5. Câu chữ mời mua (áp dụng Hormozi, tiết chế)

Bốn đòn bẩy giá trị: **điều khách muốn**, **khả năng tin là đúng**, **thời gian chờ**, **công sức bỏ ra**. Áp dụng nhẹ, không phóng đại, không hứa điều lá số không tính ra.

| Đòn bẩy | Ta đã có | Cách nói (ví dụ) |
|---|---|---|
| Điều khách muốn | Câu hỏi cụ thể của chính họ | "Chặng 25–34 tuổi của bạn đang ở cung Phu Thê. Điều gì cần chuẩn bị trước năm 2027?" |
| Tin là đúng | Căn cứ từ sao, cung thật; bản mẫu; hoàn Lá nếu "Không đúng" (món dưới 500 Lá) | "Mỗi nhận định ghi rõ sao và cung làm căn cứ. Phần nào đọc thấy không đúng, bạn được hoàn Lá." |
| Thời gian chờ | Mở xong đọc ngay hoặc có phòng chờ | "Mở xong đọc ngay trên trang này." |
| Công sức | Mở tại chỗ, nạp trong tấm | "Một chạm để mở. Thiếu Lá thì nạp ngay tại đây." |
| Giảm rủi ro mua thử | Khấu trừ 7 ngày khi nâng cấp | "Mua lẻ một cung trước. Lên Trọn đời trong 7 ngày, phần đã trả được trừ hết." |

Tránh: "giải mã vận mệnh", "đổi đời", "bí mật", đếm ngược giả, số người mua giả.

## 6. Kết luận của hội đồng (để anh quyết, chưa phải kế hoạch)

**Nhóm A — sửa ngay theo bản đã duyệt, không cần anh duyệt lại:**
1. U1: dùng lá số đúng thiết kế đã duyệt (sơn mài, la kinh, dấu triện) trên trang lá số miễn phí.
2. U2: bố cục desktop đúng bản mẫu FD-116 (cột đọc rộng, chữ to, cột trái gọn).
3. U4: sửa tấm "Xem lá số lớn hơn" bị cắt.
4. U8: sửa các chi tiết vụn (lặp chữ, header đè nội dung).
4b. P2, P3, P6: chữ nội dung không dưới 12px, đo và sửa độ tương phản chữ xám, vùng bấm ≥44px (mục 7.1).

**Nhóm B — cần anh quyết đổi quyết định cũ:**
5. Ẩn các món "Sắp mở/Sắp có" khỏi trang chọn luận giải (kể cả tab Hội viên), thay vì hiện ra.
6. Bỏ tab Căn cứ; đổi thứ tự tab theo thời gian; không lặp khối chi tiết cung ở mọi tab (sửa FD-109e).
7. Cho các hàng "Chưa mở" ở tab 12 cung/Chủ đề mở được tấm đọc thử (vẫn không có giá trên thân trang, giá chỉ trong tấm — đúng FD-110).
8. Hiện thêm giá tiền đồng cạnh giá Lá trong tấm mở khoá (sửa FD-065), hoặc giữ nguyên.
9. Khi khách tò mò năm 2026: giữ bán Trọn đời (FD-116) hay **mở bán Vận hạn 2026** để bán đúng thứ khách hỏi (cần chạy chất lượng bài viết tháng/năm, LSV-63).
10. Biểu đồ mạng nhện: giữ, thu nhỏ, hay thay bằng danh sách cung mạnh/yếu dễ đọc.

**Nhóm C — việc mới:**
11. Thẻ trên trang chọn luận giải có "bạn sẽ biết", số phần, đọc thử của chính lá số.
12. "Đường đời 10 năm" dựa trên điểm cấu trúc có công thức (cần anh nói rõ có nới FD-063 cho đại vận hay không).
13. Viết lại câu chữ mời mua theo mục 5.
14. Làm "hai lớp viền" cho lá số, thẻ gói và tấm mở khoá; nút chính dạng viên có mũi tên trong vòng tròn (mục 7.2, H2–H3).

## 7. Đối chiếu bằng hai bộ tiêu chuẩn thiết kế (bổ sung 07/10)

Hai bộ tiêu chuẩn đã được cài lại và áp vào cùng 9 ảnh: `ui-ux-pro-max` (quy tắc dễ dùng, dễ đọc, bán hàng) và `high-end-visual-design` (cảm giác cao cấp). Mỗi điểm vẫn xếp theo nhóm A/B/C ở mục 0.

### 7.1 Theo `ui-ux-pro-max`

| # | Quy tắc | Trang hiện tại | Nhóm |
|---|---|---|---|
| P1 | Dòng chữ đọc dài 65–75 ký tự, chữ thân ≥16px, giãn dòng 1,5–1,75 | Bài tổng quan nằm trong cột hẹp, mỗi dòng chỉ khoảng 40–50 ký tự, chữ nhỏ (ảnh 9). Bản mẫu đã duyệt dùng cột 72 ký tự, chữ to. | A (gộp với U2) |
| P2 | Không dùng chữ dưới 12px cho nội dung | Tên sao phụ trong ô cung, nhãn "Độ mạnh cấu trúc", chú thích dưới biểu đồ nhỏ hơn 12px, dù desktop còn dư chỗ. | A |
| P3 | Chữ phải tương phản ≥4,5:1 với nền | Nhiều chữ xám trên nền nâu sẫm (mô tả thẻ, "Không có chính tinh", chữ phụ). Cần đo lại từng màu; em chưa đo nên chưa kết luận đạt hay không đạt. | A (cần đo) |
| P4 | Món không bấm được phải nhìn khác hẳn món bấm được | Thẻ "Sắp mở" có cùng viền, cùng cỡ tiêu đề, cùng giá to như thẻ bán được. | B (gộp với mục 5) |
| P5 | Trang giá: mỗi thẻ có nút riêng, làm nổi gói hợp ý định của khách, có bảng so sánh và câu hỏi thường gặp | Có nút "Chọn phần này" rồi lại một nút vàng riêng ở dưới; chưa có bảng so sánh Bản mệnh / Trọn đời; gói làm nổi là "Đáng nhất" chứ không phải gói khớp câu khách đang tò mò. | C (gộp với mục 11) |
| P6 | Vùng bấm ≥44px | Nút "Chọn phần này", nhãn "Chưa mở" thấp khoảng 28–32px. | A |

### 7.2 Theo `high-end-visual-design`

Chọn hướng **"Editorial Luxury" bản tối**: nâu sơn mài, chữ có chân to cho tiêu đề, vân giấy rất nhẹ. Hướng này khớp `docs/22-art-direction.md` và bộ chữ đang dùng (Source Serif 4, Be Vietnam Pro, JetBrains Mono không nằm trong danh sách phông bị cấm).

| # | Nguyên tắc | Trang hiện tại | Nhóm |
|---|---|---|---|
| H1 | Khoảng trống lớn có chủ đích, mỗi khối "thở" | Desktop vừa chật ở giữa vừa trống hai bên: trống vì cả trang bị co về ~60% chiều ngang, không phải khoảng trống có thiết kế. | A (gộp với U2) |
| H2 | Thẻ quan trọng có "hai lớp viền" (khung ngoài + lõi trong, như tấm giấy đặt trong khay sơn mài) | Lá số, thẻ gói, tấm mở khoá đều là khung phẳng một đường viền mảnh. Nên áp cho đúng 3 thứ khách sắp trả tiền: lá số, thẻ gói, tấm mở khoá. | C |
| H3 | Nút chính là viên tròn, mũi tên nằm trong vòng tròn riêng, có phản hồi khi bấm | "Mở luận giải – 960 Lá" là một dải vàng phẳng kéo hết chiều ngang. | C |
| H4 | Nhãn nhỏ phía trên tiêu đề | Đã có ("LÁ SỐ RIÊNG TƯ", "CHI TIẾT CUNG VỊ ĐANG CHỌN"). Giữ. | — |
| H5 | Hiện dần khi cuộn tới, chuyển động mượt, có chế độ giảm chuyển động | Chưa đánh giá được từ ảnh tĩnh. | (để ngỏ) |

**Những gì của `high-end-visual-design` hội đồng KHÔNG áp dụng**, vì trái quyết định đã duyệt hoặc không hợp sản phẩm đọc chữ:
- Đổi header thành "viên thuốc nổi": header dùng chung toàn site đã chốt (FD-100).
- Thẻ xoay nghiêng, chồng lên nhau; kính mờ trên nội dung: làm rối một trang đọc dài và nặng máy điện thoại.
- Đổi màu hoặc phông khác bộ nhận diện đã duyệt.

## 8. Giới hạn của đánh giá này

- Chỉ dựa trên ảnh desktop anh gửi; chưa xem lại bản điện thoại.
- Độ tương phản (P3) và cỡ chữ (P2) mới đánh giá bằng mắt trên ảnh, chưa đo trên trang thật.
- Chưa kiểm số liệu phễu thật (chưa có số liệu 7 ngày sạch), nên chưa nói được bước nào rơi khách nhiều nhất.
