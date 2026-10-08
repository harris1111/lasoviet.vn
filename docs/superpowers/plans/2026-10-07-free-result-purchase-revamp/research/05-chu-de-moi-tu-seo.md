# 05 — Chủ đề mới: tổng hợp từ nghiên cứu từ khoá Google đã có trong repo (R12)

Ngày: 08/10/2026. Nguồn quyết định: R12 của anh = KHÔNG hoãn, **làm ngay các chủ đề kế tiếp** dựa trên gợi ý của Claude và nghiên cứu từ khoá Google đã có trong repo (FD-118). Tài liệu này chỉ tổng hợp và xếp hạng; không phải mã sản xuất.

## 1. Dữ liệu từ khoá thật đang có trong repo

| Nguồn | Có gì | Giới hạn (ghi trong chính nguồn) |
|---|---|---|
| `data/lasoviet_research_master.xlsx` | 43 tệp Google Keyword Planner (Việt Nam, kỳ 08/2025 đến 07/2026; một lô 24 tháng dùng bổ sung) gộp thành **571 từ khoá độc nhất**, 298 từ khoá có lượng tìm, 273 từ khoá "không hiển thị" (**để trống không phải bằng 0**). Các sheet: `Keyword Master`, `Cluster Summary`, `Priority Keywords`, `Product Scope`, `Decision Log`, `Assumptions & Tests`. | Lượng tìm theo **khoảng (bucket)**, không phải số chính xác; competition/bid là chỉ số quảng cáo, không phải độ khó SEO; chưa có chuyển đổi hay mức sẵn lòng trả (H-001…H-007 còn "Open"). |
| `data/README.md`, `data/source_manifest.md` | Quy tắc gộp, giới hạn, quyết định D-012 "dừng thêm Keyword Planner trước MVP, lấy thêm từ Search Console". | Ngày đóng gói 31/08/2026. |
| `config/route-registry.yml` | Trang thương mại đã đặt chỗ: `/luan-giai-tu-vi/tinh-duyen-hon-nhan`, `/luan-giai-tu-vi/cong-viec-tai-loc`, `/luan-giai-tu-vi/van-trinh-{year}`, `/luan-giai-tu-vi/tong-quan-ban-menh`. Chưa có đường dẫn chủ đề nào khác. | — |
| `docs/19-sitemap-v2-discipline-pages.md`, `docs/14-sitemap-seo-wireframes.md` | Sơ đồ trang bộ môn (Tử Vi, Bát Tự, Kinh Dịch, Bản đồ sao, Thần số học). Không có danh sách chủ đề trả phí khác. | — |
| `docs/20-deep-research-ta-social-listening-handoff.md` | Chỉ là con trỏ lưu trữ (bản gốc nằm trong thư mục lưu trữ, theo luật của repo không đọc). Không dùng làm nguồn ở đây. | — |
| Danh sách "15 chuyên đề của AiTuvi" | Chỉ có trong lời kể của Lãm ([Lãm quan sát] ở nghiên cứu 01 mục 5), **không có danh sách tên** nào trong repo. | Không thể liệt kê 15 tên; không bịa. |

**Kết luận về độ phủ:** từ khoá cho **sức khoẻ, con cái, gia đạo, nhà đất, học hành, thi cử** hầu như **không có trong bộ 571 từ khoá** (chúng chưa từng được đưa vào Keyword Planner). Nghĩa là với các đề này repo **không có số liệu lượng tìm**, không phải lượng tìm bằng 0. Phần xếp hạng bên dưới ghi rõ "có dữ liệu" hay "suy luận".

## 2. Bằng chứng nhu cầu theo nhóm (số lấy nguyên từ sheet `Keyword Master` / `Priority Keywords`)

### 2.1 Tình yêu, hôn nhân, tương hợp
| Từ khoá | Lượng tìm/tháng (bucket) | Ghi chú |
|---|---|---|
| bói tình yêu | 500.000 (100K–1M) | Nhu cầu rất rộng, ý định bói chung, không riêng Tử Vi |
| bói tình duyên | 50.000 | |
| bói tình yêu theo tên | 50.000 | xu hướng năm -90% (thận trọng) |
| bói tình yêu theo ngày sinh | 5.000 | |
| coi bói tình yêu / bói tên tình yêu | 5.000 | |
| bói tuổi vợ chồng | 500 | **tương hợp hai người** |
| tử vi tình duyên / tử vi hôn nhân / tử vi tình yêu | 500 mỗi từ | Ý định Tử Vi + chủ đề; đã nằm trong chủ đề Tình duyên đang bán |
| lá số tử vi tình duyên | 50 | |
| hợp tuổi vợ chồng | 50 | tương hợp |
| lá số cặp đôi / lá số đôi | 50 | tương hợp trên lá số |
| xem độ hợp vợ chồng, xem độ hợp tình yêu, xem hợp tuổi, xem tuổi hợp nhau, xem tương hợp hai người | không hiển thị | có nhu cầu nhưng dưới ngưỡng hiển thị |
| xem năm nào kết hôn, xem tuổi kết hôn, xem ngày cưới, xem ngày kết hôn | không hiển thị | "khi nào" là câu hỏi thật nhưng nhỏ |

### 2.2 Tiền bạc, công việc, kinh doanh
| Từ khoá | Lượng tìm/tháng | Ghi chú |
|---|---|---|
| tử vi tài lộc | 500 | xu hướng năm -90% |
| lá số tài lộc | 50 | |
| tử vi công việc / tử vi sự nghiệp | 50 mỗi từ | Đã nằm trong chủ đề Công việc & Tài lộc đang bán |
| tuổi hợp làm ăn | 50 | hợp tác làm ăn, hai người |
| xem tử vi kinh doanh, xem tử vi tài chính, xem tử vi bao nhiêu tiền, xem tử vi đổi việc, xem năm nào đổi việc, xem tuổi làm ăn | không hiển thị | có người tìm, dưới ngưỡng hiển thị |

### 2.3 Tầng thời gian
| Từ khoá | Lượng tìm/tháng | Ghi chú |
|---|---|---|
| tử vi hôm nay, tử vi hàng ngày, tử vi ngày mai | 50.000 mỗi từ | Thói quen hằng ngày (con giáp/chung); sản phẩm "Hôm nay của bạn" đang bán |
| **tử vi tuần mới** | 50.000 | **chưa có sản phẩm tuần** |
| tử vi năm 2026 | 5.000 | gắn với Vận hạn năm |
| tử vi tháng này | 50 | xu hướng -90% |
| xem vận hạn, xem hạn năm, xem đại vận, xem vận hạn công việc, xem vận hạn tình duyên | không hiển thị | |

### 2.4 Hệ thống khác (đã nằm trong plan ở phần R11)
| Từ khoá | Lượng tìm/tháng |
|---|---|
| lá số bát tự | 50.000 (xu hướng năm +900%) |
| bát tự | 50.000 |
| lập lá số bát tự, lá số tứ trụ, lập lá số tứ trụ | 5.000 mỗi từ |
| bản đồ sao / bản đồ sao cá nhân | 500.000 / 50.000 |

`Cluster Summary`: cụm Tử Vi có 162 từ khoá (77 có lượng tìm); Tình yêu/Tương hợp 23 (12 có lượng tìm); Bát Tự 20 (12 có lượng tìm). `Decision Log` D-005 (Tử Vi là sản phẩm trả phí đầu tiên), D-008 (Bát Tự và Bản đồ sao là mở rộng gần). `Assumptions & Tests` H-004 "Tình duyên là chủ đề trả phí lớn nhất" đang **chưa kiểm chứng**.

**Cảnh báo đọc số:** các con số 50.000 của "tử vi hôm nay/tuần mới" là nhu cầu **chung** (đa số là tử vi theo con giáp, miễn phí). Bản "theo lá số của chính bạn" chỉ lấy một phần nhỏ; dùng để nói "có thói quen quay lại", không để ước doanh thu.

## 3. Các ứng viên chủ đề (đơn lá số, tái dùng khuôn `topic-deep-dive` có sẵn)

Khuôn có sẵn: `packages/contracts/src/ziwei-topic-deep-dive-v1.ts` (`TOPIC_PALACE_SCOPES`: cung chính + cung phụ), writer `topic-deep-dive-writer-v4.ts`, cổng chất lượng v4. Thêm một chủ đề = thêm cấu hình cung, prompt, cổng, mã SKU, chạy 2–3 lần thử tay (R1). Giá tạm 480 Lá như hai chủ đề đầu (FD-105), điều chỉnh sau khi bán.

| # | Chủ đề (tên khách thấy, đề xuất) | Cung chính | Cung phụ | Bằng chứng trong repo | Loại bằng chứng |
|---|---|---|---|---|---|
| A | **Gia đạo và con cái** | Tử Tức, Điền Trạch | Phụ Mẫu, Huynh Đệ, Phúc Đức, Mệnh | Không có từ khoá riêng. Gián tiếp: cụm hôn nhân/gia đình lớn (bói tình duyên 50.000; tử vi hôn nhân 500) là bước kế sau hôn nhân | **Suy luận** (không có số) |
| B | **Kinh doanh và làm ăn** | Tài Bạch, Quan Lộc | Nô Bộc, Thiên Di, Điền Trạch, Phúc Đức | tuổi hợp làm ăn 50; xem tử vi kinh doanh / xem tuổi làm ăn (không hiển thị); tử vi tài lộc 500 | **Có dữ liệu nhỏ** |
| C | **Đổi việc và bước ngoặt sự nghiệp** (có mốc năm do engine tính) | Quan Lộc, Thiên Di | Mệnh, Nô Bộc, Tài Bạch, Phúc Đức | tử vi công việc 50; tử vi sự nghiệp 50; xem năm nào đổi việc, xem tử vi đổi việc (không hiển thị) | **Có dữ liệu nhỏ** |
| D | **Duyên số theo năm** ("khi nào duyên đến"; mốc năm do engine tính, không đoán ngày) | Phu Thê | Mệnh, Phúc Đức, Thiên Di, Tử Tức | bói tình duyên 50.000; tử vi tình duyên 500; xem năm nào kết hôn (không hiển thị). **Chồng lấn** với chủ đề Tình duyên hiện có | **Có dữ liệu** nhưng chồng lấn |
| E | **Sức khoẻ và tinh thần** (nói như chuẩn bị, không chẩn đoán; FD-075) | Tật Ách | Mệnh, Phúc Đức, Phụ Mẫu | Không có từ khoá. Có rủi ro pháp lý/niềm tin cao | **Suy luận** |
| F | **Học hành và con đường nghề** | Quan Lộc, Phụ Mẫu | Mệnh, Phúc Đức, Huynh Đệ | Không có từ khoá | **Suy luận** |
| G | **Nhà đất và an cư** | Điền Trạch | Tài Bạch, Phụ Mẫu, Thiên Di | hướng nhà hợp tuổi 500 (Phong thủy, gần kề); không có từ khoá Tử Vi | **Suy luận** |
| H | **Quý nhân và quan hệ xã hội** | Nô Bộc, Thiên Di | Huynh Đệ, Quan Lộc, Phúc Đức | Không có từ khoá | **Suy luận** |

Sản phẩm **hai người / hệ khác / thời gian** có bằng chứng mạnh hơn mọi chủ đề đơn ở bảng trên, đã nằm trong plan (không trùng bảng này): Hợp đôi (bói tuổi vợ chồng 500, lá số cặp đôi 50, xem độ hợp…), Bát Tự (lá số bát tự 50.000, +900%), Hôm nay (50.000), Năm (5.000), và một ứng viên **chưa có**: **"Tuần này của bạn"** (tử vi tuần mới 50.000; cần An kiểm xem lưu nhật gộp tuần có hợp lý không; xem BE-P2-5 trong `04`).

## 4. Đề xuất 6 chủ đề đầu (xếp hạng theo: có số liệu > liền kề với món đang bán > ít chồng lấn > rủi ro nội dung thấp)

1. **Kinh doanh và làm ăn** (B) — Tài Bạch, Quan Lộc; phụ Nô Bộc, Thiên Di, Điền Trạch, Phúc Đức. Có từ khoá trực tiếp (dù nhỏ), liền kề Công việc & Tài lộc, người mua có ý định tiền bạc rõ.
2. **Đổi việc và bước ngoặt sự nghiệp** (C) — Quan Lộc, Thiên Di; phụ Mệnh, Nô Bộc, Tài Bạch, Phúc Đức. Có từ khoá trực tiếp, câu hỏi "khi nào" đúng thế mạnh engine (mốc năm do engine tính). Chú ý phân biệt với Công việc & Tài lộc (khác ở trọng tâm thời điểm, không lặp nội dung).
3. **Gia đạo và con cái** (A) — Tử Tức, Điền Trạch; phụ Phụ Mẫu, Huynh Đệ, Phúc Đức. Không có số liệu, xếp cao vì là chặng đời tự nhiên sau hôn nhân và không chồng lấn; **đo bằng số liệu thật sau khi bán** (H-004 mở rộng).
4. **Duyên số theo năm** (D) — Phu Thê; phụ Mệnh, Phúc Đức, Thiên Di, Tử Tức. Có dữ liệu mạnh nhất trong nhóm đơn lá số ("bói tình duyên" 50.000) nhưng chồng lấn với Tình duyên đang có → chỉ làm khi viết rõ khác biệt (mốc năm theo engine) hoặc gộp như phần thêm của Tình duyên; An và anh chốt khi thấy mẫu.
5. **Học hành và con đường nghề** (F) — Quan Lộc, Phụ Mẫu; phụ Mệnh, Phúc Đức, Huynh Đệ. Suy luận (phụ huynh và học sinh là nhóm mua có động cơ); rủi ro nội dung thấp.
6. **Nhà đất và an cư** (G) — Điền Trạch; phụ Tài Bạch, Phụ Mẫu, Thiên Di. Suy luận, liền kề Phong thủy (P2); rủi ro nội dung thấp.

Để sau (không nằm trong 6 đầu): **Sức khoẻ và tinh thần** (E, rủi ro pháp lý/niềm tin; làm sau khi kết quả kiểm tra pháp lý nội dung có) và **Quý nhân và quan hệ xã hội** (H).

## 5. Cách làm đo được (không dựa vào số ước đoán)

- Mỗi chủ đề dùng cùng đường mua/đọc/hoàn Lá như hai chủ đề đầu; 2–3 bài thử tay + cổng tự động (R1).
- Ghi sự kiện "chọn chủ đề" để so doanh thu theo SKU (H-004). Lượng chọn thật thay cho số Keyword Planner khi quyết định chủ đề nào làm tiếp.
- Lấy dữ liệu **Google Search Console** của lasoviet.net sau khi có trang thương mại (D-012 đã đề nghị) để bổ sung phần "không hiển thị".
- Không dùng số 50.000 của "tử vi hôm nay/tuần mới" để dự báo doanh thu; đó là nhu cầu chung.

## 6. Việc cho An và cho giao diện (tham chiếu)
- BE: `04-ticket-be-cho-an.md`, ticket **BE-P1-17** (chủ đề mới) và **BE-P2-5** (Tuần này của bạn, tuỳ chọn).
- FE: thẻ chủ đề tự hiện từ danh mục (GĐ5); tab Chủ đề trong trang lá số đã có chỗ cho "2 đề đang bán + thêm khi qua cổng" (GĐ4); không cần bản mẫu riêng từng chủ đề, dùng trang `mau-bai-<mon>.html` của GĐ6.
