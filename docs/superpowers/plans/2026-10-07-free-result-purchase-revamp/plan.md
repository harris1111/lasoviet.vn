---
title: "Làm lại luồng luận giải: lá số miễn phí, trang chọn luận giải, dải sản phẩm"
description: "Kế hoạch v2.1 (08/10, đã gộp vòng 2 R1-R13 = FD-118): sửa UX/UI, nút bấm, độ trung thực dữ kiện, để AI viết chữ miễn phí, dựng dải sản phẩm theo vòng thời gian của từng người và xây toàn bộ sản phẩm còn khuyết. Mỗi giai đoạn có một trang HTML để anh duyệt trước khi viết code thật."
status: pending
priority: P1
branch: "plan/free-result-purchase-revamp"
tags: [ux, ui, copy, ai-writer, engine, free-result, offer, product-lineup, desktop, mobile-first]
blockedBy: []
blocks: []
created: "2026-10-07T12:03:43.744Z"
updated: "2026-10-08"
createdBy: "ck:plan"
source: skill
---

# Làm lại luồng luận giải: lá số miễn phí, trang chọn luận giải, dải sản phẩm

## Overview

**Vì sao làm:** anh xem trang thật trên desktop ngày 07/10 và thấy giao diện vỡ, sơ sài, không dùng lá số có dấu triện đã duyệt; khách đọc chưa đủ hấp dẫn để mua; logic các tab chưa hợp lý. Biên bản họp: `docs/reviews/2026-10-07-hop-ux-ui-luong-mua-luan-giai.md`.

**Bản v2.1 này** gộp: 10 câu anh đã trả lời vòng 1 (FD-117), **13 câu vòng 2 anh đã trả lời ngày 08/10 (FD-118)**, bốn bản nghiên cứu trong `research/` (dải sản phẩm và vòng thời gian; hệ thống AI viết chữ; tab, hình ảnh, nút bấm; backlog backend cho An) cộng bản tổng hợp chủ đề mới từ từ khoá Google (`research/05-chu-de-moi-tu-seo.md`), và các điều chỉnh sau khi Opus review.

**Không làm lại việc đã xong.** Kế hoạch `2026-10-03-ux-funnel-overhaul` đã giao 7/9 giai đoạn (LSV-74, 75, 76, 78, 80 Done; 77 và 79 chỉ chờ SePay và email thật). Plan này giữ nguyên các phần đó: form trang chủ một bước, cache tổng quan, cắt giữa câu có mờ an toàn, tấm mở khoá tại chỗ, nạp trong tấm, phòng chờ, nhắc khách.

**Năm nhóm việc:**
1. Sửa chỗ trang thật lệch bản mẫu đã duyệt (FD-116) và sửa mọi nút bấm cho có phản hồi rõ ràng (nhóm A + Q10).
2. Làm đúng độ trung thực của dữ kiện năm/tháng và bỏ chữ "2026" cứng trong sản phẩm (An, backend).
3. Cho AI viết chữ miễn phí, có căn cứ nằm cạnh từng nhận định (Q2, Q9).
4. Dựng lại trang lá số (tab theo thời gian, hình ảnh trực quan) và trang chọn luận giải (dải sản phẩm theo vòng thời gian từng người) (Q1, Q3, Q5, Q7, Q8).
5. **Xây mã cho toàn bộ sản phẩm còn khuyết ngay trên engine của repo** (R1): Vận hạn năm [Y], Chặng 10 năm, Tình duyên, Công việc, Tháng này, Hôm nay (tinh chỉnh), Combo, chủ đề mới, công cụ Hội viên, Bát Tự và Tình duyên đôi ta (tên tạm, chờ anh xác nhận). Luật "20 bài thật liên tiếp" bỏ; mỗi món chỉ cần 2–3 bài thử tay cộng kiểm tự động.

## Những gì đã quyết (FD-117, vòng 1)

| Câu | Anh đã chốt | Ảnh hưởng tới |
|---|---|---|
| Q1 Sửa | Không chỉ ẩn "Sắp mở". Rà cả dải sản phẩm theo cách người ta đọc Tử Vi; tìm vì sao mỗi món chưa bán (giao diện hay backend); engine sẵn sàng thì **xây** món còn thiếu. Món nào chỉ ẩn **đến khi qua cổng chất lượng**, rồi tự hiện từ danh mục | GĐ5, GĐ6 |
| Q2 Đồng ý | Bỏ tab Căn cứ; căn cứ nằm cạnh từng nhận định; AI viết căn cứ như chuyên gia, riêng cho lá số | GĐ3, GĐ4 |
| Q3 Đồng ý | 5 tab theo thời gian: Tổng quan (có lá số) → Năm nay → Đại vận → 12 cung → Chủ đề; kiểm đủ tab so với AiTuvi và truyền thống; hình ảnh mạnh, điện thoại và máy tính | GĐ4 |
| Q4 Đồng ý | Hàng "Chưa mở" mở tấm đọc thử của chính lá số (anh chưa hiểu, nên đã giải thích lại trong trang duyệt vòng 2) | GĐ3, GĐ4 |
| Q5 Sửa | Logic năm theo **từng người** và theo vòng thời gian (năm nay, năm sau, cụm vài năm), tham khảo đối thủ và Hormozi | GĐ5, GĐ6 |
| Q6 KHÔNG | Giá nội dung chỉ bằng Lá; tiền đồng chỉ hiện ở **bước cuối trước khi thanh toán** (FD-065 giữ nguyên) | GĐ5 |
| Q7 Đồng ý | Thay mạng nhện bằng "3 cung nâng đỡ nhất / 3 cung cần lưu tâm", hình đẹp đúng thương hiệu; có brief ảnh cho ChatGPT | GĐ4 |
| Q8 Đồng ý | "Đường đời 10 năm" **có điểm cấu trúc** + hộp "Điểm này tính thế nào" (nới FD-063 cho đại vận, công thức công bố) | GĐ4 |
| Q9 Đồng ý | **AI viết** chữ miễn phí: prompt rất chặt, tiếng Việt tự nhiên, riêng cho từng người, có chất chuyên gia; mục tiêu khách **tin** Lá Số Việt luận đúng | GĐ3 |
| Q10 Đồng ý | Hai lớp viền + nút viên có mũi tên; mọi nút phải có phản hồi nhìn thấy được (thẻ ở trang chọn luận giải hiện không phản hồi gì) | GĐ2, GĐ4, GĐ5 |

**Cách tính điểm cho "Đường đời 10 năm" (đã chốt, không còn mở):** điểm của một chặng 10 năm = điểm cấu trúc đã công bố (FD-107, FD-111) của **cung mà chặng đó đi qua**. Công thức ấy đã cộng cung đối và hai cung tam hợp (tam phương tứ chính) nên không cần công thức mới. Hộp "Điểm này tính thế nào" ghi rõ: đây là sức nâng đỡ của bộ sao ở cung ấy, **không phải điểm may rủi** của 10 năm; cột rời rạc, không vẽ đường dự đoán từng năm. (Nghiên cứu 01 từng đề xuất "không điểm"; điều đó đã bị Q8 thay thế.)

## Những gì đã quyết ở vòng 2 (FD-118, anh trả lời 08/10)

| Câu | Anh đã chốt | Ảnh hưởng tới |
|---|---|---|
| R1 Đồng ý + ghi chú | **Bỏ luật "20 bài thật liên tiếp".** Mỗi món chỉ cần 2–3 bài thử tay của anh và đồng nghiệp (gửi ảnh chụp cho Claude chấm nếu cần). **Xây mã cho TẤT CẢ sản phẩm dựa trên engine hiện có của repo ngay.** Quy tắc: UX/UI = anh + Claude; mọi mã backend = ticket Kaneo cho An | GĐ6 (viết lại), `04` |
| R2 Đồng ý | Trần AI miễn phí giữ 3.000đ/lá số và 50.000đ/ngày; **khi lượng khách tăng, hệ thống phải CẢNH BÁO để nâng trần ngày**; bộ chặn tiền dùng giá đã duyệt FD-114; thử ≤180.000đ | GĐ3, BE-P1-5 |
| R3 (không chọn, ghi chú) | **Tiếng Anh dùng cùng quy tắc như tiếng Việt**: cá nhân hoá, chuyên gia, giọng tư vấn/đồng hành/tâm tình. Không siết từ cấm quá mức làm hại mục tiêu cuối (khách tin + mua): **chỉ cấm điều luật cấm và điều sai sự thật về lá số**. AI viết cả VI và EN | GĐ3, BE-P1-2, BE-P1-3 |
| R4 **KHÔNG** | **Bỏ tháng "cần chú ý" bị ép.** Phải do engine tính, đúng những tháng thật sự cần chú ý của lá số; anh tin lá số nào cũng có tháng riêng; "đào sâu engine". Tạo quy tắc thật; lá số nào không ra thì tinh chỉnh quy tắc, không bịa | GĐ2, GĐ4, GĐ6, BE-P0-4 |
| R5 Đồng ý | Dải 12 ô tháng hiện theo thứ tự, ô cần chú ý có dấu khoá | GĐ4 |
| R6 Đồng ý | Điện thoại: một trang cuộn + thanh 5 chip dính | GĐ4 |
| R7 Đồng ý + ghi chú | Món "Chặng 10 năm của bạn" ~~360~~ **480 Lá** (FD-119 nâng từ 360); **kiểm tra engine thật kỹ** để suy luận thời gian và đọc chặng đúng cho mọi lá số (đại vận, chiều thuận/nghịch, khoảng tuổi, nhận diện chặng hiện tại quanh Tết) | GĐ5, GĐ6, BE-P0-8 |
| R8 Đồng ý | Gần Tết thẻ đầu chuyển sang năm sau; gói cặp "Năm nay + Năm sau" 780 Lá làm sau khi bản Năm đạt | GĐ5, GĐ6 |
| R9 Đồng ý | Combo đổi nghĩa "Trọn đời + Năm [Y]" 1.300 Lá; khấu trừ 7 ngày giữ như cũ | GĐ6 |
| R10 **KHÔNG** | Hội viên **giữ "sắp ra mắt"** như bây giờ, **và xây các công cụ Hội viên còn thiếu ngay** | GĐ5 (giữ ẩn), GĐ6, BE-P1-14 |
| R11 **KHÔNG** | **Xây CẢ hai người (tên tạm "Tình duyên đôi ta", trước là "Hợp đôi") và hệ thứ hai Bát Tự.** Anh nói không cần người kia đồng ý, một người xem cho cả hai. **Cờ pháp lý Nghị định 13/2023 đã BỎ ở FD-119 (08/10):** anh xác nhận chỉ thu ngày sinh của người kia, không vi phạm. Bản đồ sao Tây phương không được nhắc → vẫn hoãn | GĐ6, BE-P1-15, BE-P1-16 |
| R12 **KHÔNG** | **Làm ngay các chủ đề kế tiếp** theo gợi ý của Claude và nghiên cứu từ khoá Google đã có trong repo (`data/lasoviet_research_master.xlsx`) | GĐ6, BE-P1-17, `05` |
| R13 Đồng ý | Cục, Mệnh chủ, Thân chủ, nạp âm giữa lá số: làm ở đợt hoàn thiện, không chặn việc khác | GĐ6, BE-P1-13 |

## Phát hiện mới từ nghiên cứu (đã đưa vào các giai đoạn)

1. **Các món "Sắp mở" không chờ giao diện.** Tình duyên, Công việc, Tháng này, Vận hạn năm, Combo đều **đã có code backend, đã triển khai**. Chúng từng bị giữ vì luật "20 bài thật đạt liên tiếp" và chưa duyệt ngân sách; **vòng 2 bỏ luật đó (R1)**, thay bằng 2–3 bài thử tay + kiểm tự động. Tình duyên đôi ta (hai người), Bát Tự, Tây phương **chưa có engine**: **vòng 2 quyết xây Bát Tự và món hai người** (Tây phương vẫn hoãn). Hội viên thiếu đặc tả công cụ trả phí: **xây các công cụ ngay, Hội viên vẫn ẩn (R10)**.
2. **Engine Tử Vi tính được mọi tầng thời gian** (chặng 10 năm, năm, tháng, ngày) cho bất kỳ năm nào. Thiếu: sản phẩm "Chặng 10 năm" (chưa có SKU và writer) và danh sách đủ các chặng ra trang miễn phí.
3. **Mỗi người một chặng khác nhau.** Chạy thử 7 lá số tổng hợp: năm 2026 rơi vào chặng khác, cung khác, còn từ 2 đến 8 năm trong chặng; nam và nữ cùng ngày sinh ra chặng khác. Không thể nói chung "2026 nằm trong đại vận".
4. **Tháng "cần chú ý" bị ép.** Khi không có tháng nào đạt điều kiện, code tự đặt tháng 7 thành tháng cần chú ý (và còn tự thêm "tiền bạc, giấy tờ" vào câu tóm tắt, và dùng câu chuẩn bị mẫu giống nhau). **Anh quyết (R4): bỏ, phải do engine tính thật**; An nghiên cứu quy tắc nhiều tín hiệu (Hoá Kỵ lưu nguyệt/lưu niên/đại vận, đối cung, sát tinh) và đo trên ≥200 lá số (BE-P0-4).
5. **"Vận hạn năm 2026" bị cứng năm** ở SKU, backend (4 chỗ), bộ kích hoạt cơ sở dữ liệu (migration 0054) và thẻ trang chọn. Sau Tết 06/02/2027 sản phẩm không bán được nữa. Còn khoảng 4 tháng. Ưu tiên cao.
6. **Nút bấm:** thẻ ở trang chọn luận giải không phải nút, trạng thái "đã chọn" quá nhạt, dòng xác nhận nằm cuối trang; 22 nhóm điều khiển ở trang lá số không có trạng thái nhấn; nút bị khoá trông như nút bấm được; mỗi lần bấm hàng/tab ở trang lá số phải hỏi máy chủ lại cả trang.
7. **Trọn đời hiện chỉ có đúng một đoạn "chặng hiện tại", một đoạn "năm hiện tại"** và vài đoạn mồi. Câu "năm 2026 nằm trong Trọn đời" đúng nhưng mỏng; phải nói thật khi dùng.
8. **AI chưa chạy được** vì hai chỗ chặn kỹ thuật (bằng chứng giới hạn token chưa có; số token Gemini qua 9router bị coi là "không rõ"). Bản chữ quy tắc cải tiến ra trước, AI sau. Hai lỗi nhỏ khác: giá AI trong bảng giá hệ thống gấp đôi giá đã duyệt FD-114; `daily.headline` nhắc Hội viên đang ẩn.

## Cách duyệt: một trang HTML cho mỗi giai đoạn

Mỗi giai đoạn bắt đầu bằng một trang HTML (Artifact riêng tư trên claude.ai) để anh xem trên máy tính và điện thoại, bấm chọn hoặc bình luận. Chỉ khi anh duyệt trang đó mới viết code thật.

| GĐ | Trang HTML anh nhận được | Anh làm gì trên trang |
|---|---|---|
| 1 | `ke-hoach-v2-duyet.html`: đã chốt gì, đã tìm ra gì, giải thích lại Q4, dải sản phẩm, hình minh hoạ, brief ảnh ChatGPT, 13 câu vòng 2 | **Đã xong 08/10** (FD-118) |
| 2 | `truoc-sau-sua-lech.html`: ảnh trước–sau desktop 1440 và điện thoại 390; bảng nút bấm trước–sau | Duyệt hoặc chỉ chỗ còn lệch |
| 3 | `chu-mien-phi-v2.html`: 3 lá số mẫu, chữ cũ và chữ mới cạnh nhau, căn cứ, thang chấm 1–5 | Chấm điểm, sửa chữ, chọn giọng văn |
| 4 | `la-so-mien-phi-v3.html`: bản mẫu bấm được của trang lá số mới | Bấm thử, bình luận từng khối |
| 5 | `chon-luan-giai-v3.html`: trang chọn luận giải + tấm mở khoá + dải sản phẩm | Chọn bộ câu mời mua A/B, sửa chữ |
| 6 | `mau-bai-<mon>.html` cho từng món (Năm, Chặng, Tình duyên, Công việc, Tháng, chủ đề mới, Bát Tự, Tình duyên đôi ta): mẫu bài + ảnh chụp 2–3 bài thử tay + kết quả kiểm tự động | Xem mẫu, chấm, duyệt mở bán từng món |
| 7 | `nghiem-thu.html`: ảnh trang thật, bảng đạt/chưa đạt, số đo, phễu trước/sau | Duyệt phát hành, kéo ticket Done |

Quy tắc chung cho mọi trang HTML: nạp kỹ năng `artifact-design` trước khi viết; khi trang cần lưu lựa chọn thì nạp `artifact-capabilities`; dùng lá số mẫu tổng hợp, **không dùng ngày sinh hay tên thật**; lưu bản nguồn vào `prototype/revamp-2026-10/`.

## Phases

| Phase | Name | Ai làm | Status |
|-------|------|--------|--------|
| 1 | [Quyết định vòng 2](./phase-01-b-ng-quy-t-nh-g-c.md) | Claude dựng trang; anh duyệt | **Xong (FD-118, 08/10)** |
| 2 | [Sửa lệch bản đã duyệt, nút bấm, độ trung thực dữ kiện](./phase-02-s-a-l-ch-b-n-duy-t.md) | FE: Lãm + Claude; BE: An | Pending |
| 3 | [Hệ thống AI viết chữ và căn cứ](./phase-03-engine-sinh-ch-mi-n-ph-v2.md) | BE: An; anh duyệt chữ | Pending |
| 4 | [Bố cục trang lá số miễn phí và hình ảnh](./phase-04-b-c-c-trang-l-s-mi-n-ph-m-i.md) | FE: Lãm + Claude; BE phụ: An | Pending |
| 5 | [Trang chọn luận giải và dải sản phẩm](./phase-05-trang-ch-n-lu-n-gi-i-v-t-m-m-kho.md) | FE: Lãm + Claude; BE năm tham số: An | Pending |
| 6 | [Xây toàn bộ sản phẩm còn khuyết](./phase-06-hoan-thien-san-pham-con-khuyet.md) | BE: An (ticket Kaneo); FE: Lãm + Claude | Pending |
| 7 | [Nghiệm thu và phát hành](./phase-07-nghiem-thu-va-phat-hanh.md) | Claude + Lãm; An sửa lỗi | Pending |

**Thứ tự và song song:**
- GĐ1 đã xong. **Tạo ngay ticket P0 cho An** (không còn chờ quyết định nào): tham số hoá năm (hạn chót thực tế là Tết 06/02/2027), sửa tính năm, ranh giới năm âm lịch, **tháng cần chú ý do engine tính thật**, **kiểm chứng engine đại vận**, chữ quy tắc v2 (xem `research/04-ticket-be-cho-an.md`).
- GĐ2 chạy ngay (FE và BE độc lập nhau), không cần duyệt thiết kế lại.
- GĐ3 (chữ) song song GĐ2; chữ quy tắc v2 ra trước, AI ra sau khi An gỡ hai chỗ chặn.
- GĐ4 và GĐ5 dựng bản mẫu HTML sau GĐ1, dùng chữ của GĐ3 khi có; viết code sau khi anh duyệt bản mẫu.
- GĐ6 chạy theo từng món (mỗi món: kiểm tự động + 2–3 bài thử tay); Bát Tự, Tình duyên đôi ta, chủ đề mới và công cụ Hội viên là các nhánh song song, không chặn nhau; Tình duyên đôi ta bật bán theo cổng chất lượng như mọi món khác (không còn cổng pháp lý). GĐ7 chạy sau mỗi đợt phát hành.

## Mục tiêu đo được

- Desktop 1440: cột đọc 65–75 ký tự mỗi dòng, chữ thân ≥17px; lá số đúng thiết kế sơn mài, la kinh, dấu triện.
- Không còn chữ nội dung dưới 12px; chữ thường đạt tương phản ≥4,5:1; vùng bấm ≥44px.
- **Mọi** điều khiển ở danh sách kiểm (22 nhóm trang lá số, 14 nhóm trang chọn luận giải) có đủ trạng thái: hover, nhấn, focus, đã chọn, bị khoá, đang tải.
- Không còn thẻ "Sắp mở/Sắp có" trên trang chọn luận giải; món nào qua cổng chất lượng thì tự hiện từ danh mục (có test).
- Mọi hàng "Chưa mở" mở ra tấm có đọc thử thật của chính lá số đó.
- Chữ tổng quan miễn phí: không còn công thức trong thân bài; chỉ một câu thận trọng cho cả bài; mỗi đoạn có chi tiết riêng của lá số; mọi nhận định có căn cứ cạnh bên.
- Sản phẩm năm không còn cứng 2026; mua được năm hiện tại và năm kế.
- Không còn tháng "cần chú ý" bị ép: mọi tháng `warn` có tín hiệu engine kèm căn cứ; báo cáo phân bố trên ≥200 lá số được anh duyệt.
- Đường đời 10 năm và sản phẩm Chặng: bảng kiểm engine đại vận (≥30 lá số × 4 ngày mốc) không còn dòng lệch.
- Mỗi món bật có: kiểm tự động đạt + 2–3 bài thử tay (ảnh chụp, Claude chấm).
- 7 lá số mẫu (nam/nữ, nhiều năm sinh) cho ra đúng chặng, đúng cung lưu niên khi so với kết quả chạy thử.
- LCP 4G giả lập < 2,5 giây giữ nguyên; không lộ chữ của phần khoá.
- Đo phễu: tỷ lệ mở tấm xem thử và tỷ lệ mua sau 7 ngày so với 7 ngày trước khi phát hành (cửa sổ sạch, loại lượt thử nghiệm).

## Cập nhật giá và tên (FD-119, anh quyết 08/10)

- **Giá mới (Lá):** Tử Vi trọn đời 960 → **1.200** ("bằng giá 10 cung lẻ", vì 1 cung = 120); **Bát Tự trọn đời 840** (mới; thử A/B sau 720/840/960); **gói "Trọn đời kép"** (Tử Vi trọn đời + Bát Tự trọn đời) **1.500**; món hai người 600 → **960**; Chặng 10 năm 360 → **480**. Combo "Trọn đời + Năm [Y]" giữ **1.300** (nay rẻ hơn mua lẻ 1.200 + 480 = 1.680 khoảng 23%, ghi rõ trong chữ bán). "Năm nay + năm sau" giữ **780**.
- **Bảo đảm hoàn Lá mở rộng:** món dưới 500 Lá giữ hoàn đủ; món từ 500 Lá trở lên hoàn **một phần 50%** (mỗi tài khoản một lần như luật cũ).
- **Cơ sở:** rà soát `hormozi-pricing-strategy` ngày 08/10 (neo giá với AiTuvi bản đọc đầy đủ 219k, app Thái Âm $19,99 trọn đời, các trang Bát Tự Việt Nam phần lớn miễn phí hoặc không niêm yết giá). Giá là **giả thuyết cần A/B**, không phải kết luận.
- **Bỏ cổng pháp lý** của món hai người (xem trên). **Tên sản phẩm "Tình duyên đôi ta" (phụ đề "Hai lá số, hợp nhau đến đâu") là TÊN TẠM, CHỜ anh xác nhận (PENDING, FD-119):** anh bác tên "Hợp đôi" vì khó hiểu và không có sức hút; từ khoá Google (`data/lasoviet_research_master.xlsx`, sheet "Keyword Master"): "bói tình yêu" 500.000/tháng, "bói tình duyên" 50.000, "bói tình yêu theo tên" 50.000, "bói tình yêu theo ngày sinh" 5.000, "coi bói tình yêu" 5.000, "bói tuổi vợ chồng" 500, "bói tình yêu theo tuổi" 500, "tử vi tình duyên/hôn nhân/tình yêu" 500 mỗi từ, "lá số cặp đôi" 50, "hợp tuổi vợ chồng" 50; "hợp đôi" không có trong dữ liệu; "xem tuổi vợ chồng", "xem độ hợp vợ chồng", "bói tình yêu hai người", "xem tương hợp hai người" không hiện. Trang đích SEO nhắm "bói tình yêu theo ngày sinh" / "xem tuổi vợ chồng".

## Những gì KHÔNG làm trong plan này

- Không bật SePay, không gửi email thật (LSV-77, 79 giữ nguyên).
- Không đổi header/footer dùng chung (FD-100).
- Không đổi luồng tiền, ví, đơn nạp, khấu trừ 7 ngày. **Ngoại lệ duy nhất:** tham số hoá năm 2026 trong SKU, kiểm tra mua, khoá kỳ, trigger combo (có migration mới, test mua/đọc/hoàn Lá).
- Không viết lại báo cáo trả phí Trọn đời (writer v4.2).
- Không **bán** Hội viên (vẫn "sắp ra mắt", không nút mua) dù công cụ Hội viên được xây (R10). Không làm Bản đồ sao Tây phương (R11 không nhắc).
- Không đếm ngược giả, không số người mua giả, không "giải mã vận mệnh"/"đổi đời"/"bí mật".

## Phân công và quy tắc thực thi

- **Sonnet viết code, Opus chỉ review** (quy tắc của anh 30/09 và 07/10).
- **Giao diện (frontend, UX/UI web): anh (Lãm) làm cùng Claude.** Mọi giao diện làm cho điện thoại trước; báo anh trước khi bắt đầu viết giao diện thật.
- **Backend và engine (mọi mã backend): An làm qua ticket Kaneo** (R1). Danh sách việc ưu tiên P0/P1/P2, tiêu chí nghiệm thu và phụ thuộc nằm ở `research/04-ticket-be-cho-an.md` (viết để dán nguyên mục thành ticket). Claude không gọi Kaneo thay; Lãm hoặc người điều phối tạo ticket **ngay bây giờ** vì GĐ1 đã xong.
- Trang HTML duyệt của từng giai đoạn do Claude dựng (không phải code sản phẩm).
- Mỗi việc một nhánh ngắn, PR vào `master`, test xanh, An hoặc Lãm duyệt mới merge (FD-097). Không bao giờ đẩy thẳng lên `master`.
- GĐ1 đã duyệt: tạo ticket Kaneo cho GĐ2–7 trong dự án "La so viet"; chỉ chuyển Done khi có bằng chứng đã phát hành và kiểm tra trên trang thật.
- Quyết định vòng 2 đã ghi vào `rules-and-decisions-tracker.md` (FD-118); chữ cũ mâu thuẫn trong plan đã được thay.
- Cổng chất lượng mỗi món (R1): kiểm tự động + 2–3 bài thử tay của anh và đồng nghiệp (ảnh chụp gửi Claude chấm).

## Các giai đoạn tạo ra gì (tóm tắt)

| GĐ | Sản phẩm giao diện (Lãm + Claude) | Sản phẩm máy chủ (An) | Trang HTML |
|---|---|---|---|
| 1 | Trang duyệt vòng 2 | — | `ke-hoach-v2-duyet.html` |
| 2 | Sửa nền lá số/bố cục desktop/tấm phóng to; trạng thái nút dùng chung; đổi tab không hỏi máy chủ | Bỏ tháng hạn ép; sửa tính năm tương lai; ranh giới năm âm lịch; sửa `daily.headline` | `truoc-sau-sua-lech.html` |
| 3 | Chip "Căn cứ", trạng thái "đang viết riêng cho bạn", nhãn AI | Thẻ nghĩa; chữ quy tắc v2; gỡ chặn AI; writer một lần gọi; cổng kiểm tra; bộ chạy thử | `chu-mien-phi-v2.html` |
| 4 | 5 tab, 3+3 cung, Đường đời 10 năm, 12 ô tháng, lớp phủ đại vận/lưu niên, 12 cung có biểu tượng, tấm đọc thử, lá số lớn; 2–3 ảnh mới | Danh sách đủ chặng; căn cứ theo từng mục; dòng đọc thử cho 13 mục | `la-so-mien-phi-v3.html` |
| 5 | Thẻ một bước, dải sản phẩm theo vòng thời gian, tấm mở khoá, so sánh gói, bộ câu mời mua | **Năm tham số** (SKU, mua, hoàn Lá, migration); API "dữ kiện theo người" | `chon-luan-giai-v3.html` |
| 6 | Thẻ/đọc thử của mọi món mới tự hiện khi qua cổng; trang Bát Tự và Tình duyên đôi ta; màn công cụ Hội viên (ẩn); điền Cục/Mệnh chủ giữa lá số | Writer + SKU + cổng cho Chặng 10 năm; kích hoạt Năm, Tình duyên, Công việc, Tháng; Combo tham số; chủ đề mới; công cụ Hội viên; engine Bát Tự; Tình duyên đôi ta (bán theo cổng chất lượng) | `mau-bai-<mon>.html` |
| 7 | Báo cáo nghiệm thu, 3+ luồng e2e mới | Sửa lỗi phát sinh | `nghiem-thu.html` |

## Dependencies

- Dựa trên: `docs/superpowers/plans/2026-10-03-ux-funnel-overhaul/` (đã giao gần hết), FD-063, FD-065, FD-105, FD-107, FD-109, FD-110, FD-111, FD-112 (luật 20 bài đã được FD-118 thay cho đợt này), FD-114, FD-116, FD-117, **FD-118**, **FD-119** (giá, tên, bỏ cổng pháp lý).
- Nghiên cứu: `research/01-dai-san-pham-va-vong-thoi-gian.md`, `research/02-he-thong-ai-viet-chu.md`, `research/03-tab-hinh-anh-nut-bam.md`; **backlog backend cho An (chính thức): `research/04-ticket-be-cho-an.md`**; **chủ đề mới từ từ khoá Google: `research/05-chu-de-moi-tu-seo.md`**.
- Bản mẫu nguồn: `prototype/revamp-2026-09/la-so-ket-qua-v2*`, `la-so-ket-qua-v2-phase4-proposal.*`, `chon-luan-giai.html`, `contextual-unlock-proposal-2026-10-03.html`; trang duyệt vòng 2: `prototype/revamp-2026-10/ke-hoach-v2-duyet.html`.
- Định hướng hình ảnh: `docs/22-art-direction.md`, `docs/24-light-theme-color-spec.md`. Giọng văn: `docs/13-brand-experience-guideline.md`, `docs/20-deep-research-ta-social-listening-handoff.md`.
- Chặn kỹ thuật cho AI: `apps/api/src/free-palace-composition.ts` (chưa có bằng chứng giới hạn token) và bộ nối 9router/Gemini (số token bị coi là "không rõ"). Chữ quy tắc v2 không bị chặn bởi hai việc này.
- Liên quan nhưng không chặn: LSV-63 (Tháng/Năm), LSV-65 (Combo).

## Tài sản hình ảnh (Assets)

Ba ảnh ChatGPT **đã duyệt và đã xử lý** (nền trong suốt, có PNG và WebP) nằm ở `/Users/admin/Downloads/Add-on photos 1/da-xu-ly/`:
1. `goc-trang-tri-hoa-van-khung-vang-lasoviet` (hoa văn góc khung),
2. `vong-huy-hieu-cung-nang-do-lasoviet` (vòng huy hiệu cung),
3. `chang-duong-10-nam-dai-van-lasoviet` (biểu tượng chặng 10 năm).

Ở giai đoạn FE (GĐ4) sao chép vào `apps/web/public/images/lasoviet/` (WebP trước, PNG dự phòng), giữ tên SEO lowercase-hyphen. Không đưa tệp `xem-thu-nho.png` (ảnh xem thử) vào web. Không thêm ảnh ngoài ba ảnh này.

## Việc còn mở của anh

1. ~~Tình duyên đôi ta / Nghị định 13/2023~~ **Đã bỏ (FD-119, 08/10):** anh xác nhận chỉ thu ngày sinh của người kia, không vi phạm; không còn kiểm tra pháp lý riêng cho món hai người.
2. **Xác nhận tên** món hai người (tên tạm "Tình duyên đôi ta", PENDING).
3. **Nội dung:** liệt kê điều luật Việt Nam thực sự cấm để cổng chất lượng chỉ chặn cứng đúng điều đó (R3); cho tới lúc đó các chủ đề FD-075 giữ nguyên.
