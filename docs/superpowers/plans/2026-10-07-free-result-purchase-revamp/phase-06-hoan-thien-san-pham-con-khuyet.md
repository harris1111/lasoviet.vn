---
phase: 6
title: "Xây toàn bộ sản phẩm còn khuyết"
status: pending
priority: P1
effort: "20d+ (BE An chủ yếu; FE Lãm + Claude song song; mỗi món một đợt riêng)"
dependencies: [2, 3, 5]
---

# Phase 6: Xây toàn bộ sản phẩm còn khuyết

## Overview
Vòng 2 (FD-118) anh chốt: **xây mã cho TẤT CẢ sản phẩm dựa trên engine hiện có của repo, ngay bây giờ.** Giai đoạn này không còn là "đưa vài món qua cổng 20 bài" mà là **giai đoạn xây toàn bộ dải sản phẩm**:

- **Cổng chất lượng mới (R1):** bỏ luật "20 bài thật đạt liên tiếp". Mỗi món chỉ cần **2–3 bài thử tay** do anh và đồng nghiệp bấm mua/đọc (ảnh chụp gửi Claude chấm nếu cần) **cộng kiểm tự động** (test, cổng FD-077/FD-089 trên 7 lá số tổng hợp, cổng chạy trên mỗi bài sinh ra khi bán).
- **Phân công (R1):** giao diện UX/UI = anh + Claude; **mọi mã backend = ticket Kaneo cho An** (`research/04-ticket-be-cho-an.md` là backlog chính thức).
- **Quy tắc đã giữ từ vòng 1:** giá nội dung chỉ bằng Lá, tiền đồng chỉ ở bước xác nhận cuối (Q6); SePay và email thật vẫn tắt; món đang giữ không hiện thẻ, qua cổng thì thẻ tự hiện từ danh mục (Q1); không đếm ngược giả, không số người mua giả.

## Danh sách món và việc BE (An) / FE (anh + Claude)

Thứ tự đề xuất: **Vận hạn năm [Y] → Chặng 10 năm → Tình duyên + Công việc → Tháng này → Hôm nay (tinh chỉnh) → Combo + gói cặp → chủ đề mới → công cụ Hội viên → Bát Tự → Tình duyên đôi ta.** Các nhóm không phụ thuộc nhau chạy song song.

| # | Món | Giá (Lá) | BE (An), mã trong `04` | FE (anh + Claude) | Nghiệm thu |
|---|---|---|---|---|---|
| 1 | **Vận hạn năm [Y]** (tham số năm; năm nay hoặc năm sau) | 480 | BE-P0-1 năm tham số; BE-P0-2/3 tính đúng năm và ranh giới Tết; **BE-P0-4 tháng cần chú ý do engine tính thật**; BE-P1-8 kích hoạt | Thẻ "Vận hạn năm [Y]" tự hiện từ danh mục; trang mẫu `mau-bai-nam.html`; dải 12 ô tháng dùng dữ liệu thật (R5); câu mở bằng số thật (năm thứ k của chặng) | 2–3 bài thử tay + test mua/đọc/hoàn Lá cho Y và Y+1 + cổng tự động 7 lá số × 2026/2027 |
| 2 | **Chặng [a–b] tuổi của bạn** (đại vận hiện tại, hoặc kế tiếp khi còn ≤2 năm) | **480** (R7 đồng ý; FD-119 nâng từ 360) | **BE-P0-7 danh sách chặng; BE-P0-8 kiểm chứng engine đại vận (chiều thuận/nghịch, tuổi, khoảng năm, nhận diện chặng quanh Tết)**; BE-P1-6 dữ kiện theo người; BE-P1-7 SKU+writer+cổng | Nút "Xem thử chặng này" ở Đường đời 10 năm mở thẻ Chặng (không phải Một cung); trang mẫu `mau-bai-chang.html`; nhãn "tạm tính" khi giờ sinh chưa chắc; thẻ "Chặng kế tiếp" khi R ≤ 2 | Bảng kiểm ≥30 lá số × 4 ngày mốc không còn dòng lệch; test không bịa năm/tuổi ngoài chặng; 2–3 bài thử tay |
| 3 | **Tình duyên và hôn nhân**, **Công việc và tài lộc** | 480 mỗi đề | BE-P1-9 kích hoạt (code đã có) | Thẻ tự hiện; đọc thử của chính lá số; trang mẫu `mau-bai-tinh-duyen.html`, `mau-bai-cong-viec.html` | cổng tự động + 2–3 bài thử tay mỗi đề |
| 4 | **Tháng này của bạn** (tháng sau tuỳ chọn) | 300 | BE-P1-10 kích hoạt; dùng định nghĩa tháng ở BE-P0-4; tháng nhuận | **Thêm thẻ** trên trang chọn (hiện chưa có); trang mẫu `mau-bai-thang.html` | cổng tự động + 2–3 bài thử tay |
| 5 | **Hôm nay của bạn** (đang bán) | 60 | BE-P0-5 sửa `daily.headline`; BE-P2-6 kiểm ranh giới ngày/Tết | Thẻ/đọc thử "Hôm nay" ở tầng thời gian; nối công cụ "Chọn ngày" khi có (mục 9) | 2–3 lần thử tay quanh nửa đêm và ngày 05–06/02/2027 |
| 6 | **Combo "Trọn đời + Vận hạn năm [Y]"** (R9) | 1.300 (giữ) | BE-P1-11 (migration trigger, chỉ bật khi cả hai thành phần Active); khấu trừ 7 ngày giữ như cũ | Chữ bán nói thật: Trọn đời có một đoạn năm, phần cộng thêm là 12 tháng | test mua hai quyền lợi, phát lại, hoàn; 2–3 lần thử tay |
| 7 | **Gói cặp "Năm nay + Năm sau"** (R8) | 780 | BE-P1-12 (làm sau khi Năm đạt) | Thẻ gói cặp ở tầng Năm khi gần Tết; tiết kiệm thật 180 Lá ghi rõ | test mua một lần ra hai quyền lợi |
| 8 | **Chủ đề mới** (R12), 6 chủ đề đầu: Kinh doanh và làm ăn · Đổi việc và bước ngoặt sự nghiệp · Gia đạo và con cái · Duyên số theo năm · Học hành và con đường nghề · Nhà đất và an cư | 480 (tạm) | BE-P1-17 (một ticket con mỗi chủ đề) | Tab Chủ đề của trang lá số và thẻ trang chọn tự hiện từ danh mục; mỗi chủ đề có 3 dòng "bạn sẽ biết" và cung liên quan | cổng tự động + 2–3 bài thử tay mỗi chủ đề. Căn cứ chọn: `research/05-chu-de-moi-tu-seo.md` |
| 9 | **Công cụ Hội viên** (R10: xây công cụ, Hội viên vẫn "sắp ra mắt") | — (quyền lợi của gói 1.500/8.000, chưa bán) | BE-P1-14: Chọn ngày theo lá số; Lịch vận cá nhân của tháng; Nguyệt vận 12 tháng; Nhắc tháng cần chú ý; bản cá nhân hoá của công cụ miễn phí | Màn hình từng công cụ (khoá bằng quyền Hội viên); tab Hội viên **vẫn ẩn**, không nút mua | mỗi công cụ có đặc tả + test quyền lợi + 2–3 lần thử tay |
| 10 | **Bát Tự (Tứ Trụ)** (R11: xây) | **840** (FD-119; A/B sau 720/840/960) trọn đời; gói "Trọn đời kép" Tử Vi + Bát Tự **1.500** | BE-P1-15 engine, lưu, bằng chứng, writer, SKU | Trang lá số Bát Tự (hiển thị 4 trụ, tàng can, thập thần, ngũ hành), tab, thẻ trang chọn; trang mẫu `mau-bai-bat-tu.html` | fixtures ≥30 lá số đối chiếu độc lập + 2–3 bài thử tay |
| 11 | **Tình duyên đôi ta** (tên tạm, PENDING; R11: xây, một người nhập cả hai hồ sơ) | **960** (FD-119, nâng từ 600) | BE-P1-16: hợp đồng hai hồ sơ, SKU, writer | Màn nhập hồ sơ thứ hai (ngày/giờ/giới tính + nhãn tự đặt), trang kết quả hai người; trang đích SEO "bói tình yêu theo ngày sinh" / "xem tuổi vợ chồng" | Qua cổng chất lượng như mọi món + 2–3 bài thử tay |
| 12 | **Cục, Mệnh chủ, Thân chủ, nạp âm giữa lá số** (R13) | — | BE-P1-13 | Điền giữa lá số (hoa văn la kinh đã có), không chặn việc khác | test 7 lá số khớp iztro |

### Món hai người: tên và pháp lý (FD-119)
- Cổng pháp lý đã BỎ (FD-119, 08/10): anh xác nhận chỉ thu ngày sinh của người kia nên không vi phạm; một người nhập cả hai hồ sơ sinh và đọc, như mọi món khác; không còn việc kiểm tra Nghị định 13/2023, không còn cờ `compat.counterpartyConsent`, không còn ràng buộc riêng tư thêm riêng cho món này.
- **Tên sản phẩm "Tình duyên đôi ta" (phụ đề "Hai lá số, hợp nhau đến đâu") là TÊN TẠM, CHỜ anh xác nhận (PENDING, FD-119):** anh bác tên "Tình duyên đôi ta" vì khó hiểu và không có sức hút; từ khoá Google (`data/lasoviet_research_master.xlsx`, sheet "Keyword Master"): "bói tình yêu" 500.000/tháng, "bói tình duyên" 50.000, "bói tình yêu theo tên" 50.000, "bói tình yêu theo ngày sinh" 5.000, "coi bói tình yêu" 5.000, "bói tuổi vợ chồng" 500, "bói tình yêu theo tuổi" 500, "tử vi tình duyên/hôn nhân/tình yêu" 500 mỗi từ, "lá số cặp đôi" 50, "hợp tuổi vợ chồng" 50; "hợp đôi" không có trong dữ liệu; "xem tuổi vợ chồng", "xem độ hợp vợ chồng", "bói tình yêu hai người", "xem tương hợp hai người" không hiện. Trang đích SEO nhắm "bói tình yêu theo ngày sinh" / "xem tuổi vợ chồng".
- Giá: 960 Lá (FD-119). Món từ 500 Lá trở lên có bảo đảm hoàn 50% một phần.

## Quy tắc cổng cho mỗi món mới (thay luật 20 bài, FD-118)
- Cổng tự động (cứng): số chữ tối thiểu theo FD-077; bám dữ kiện engine (không sao/cung/độ sáng/Hoá/năm/tháng ngoài dữ kiện); chỉ nêu tháng hạn khi engine đã tính (FD-089); chủ đề luật cấm. **Cụm từ/văn phong chỉ là cảnh báo mềm** (R3).
- Kiểm tay: 2–3 bài do anh và đồng nghiệp thử mua/đọc, gửi ảnh chụp cho Claude chấm theo thang 1–5 (4 tiêu chí của GĐ3) trên trang `mau-bai-<mon>.html`; anh bấm duyệt.
- Hoàn Lá "Không đúng" cho món dưới 500 Lá giữ nguyên (FD-105).
- **Bật bằng danh mục:** đổi `availability` của món; giao diện tự hiện thẻ. Chỉ chuyển Done ở Kaneo khi có bằng chứng phát hành và kiểm tra trên trang thật.
- **Trước khi bật Năm, Tháng, Chặng:** phải xong BE-P0-2/3/4 và BE-P0-8 để kiểm trên dữ kiện đúng.

## Architecture
Mỗi món theo khuôn có sẵn: facts thuần từ engine → writer một lần gọi → cổng chất lượng → báo cáo lưu, mua/đọc/hoàn Lá qua `wallet-unlock.service.ts`. Không đổi luồng tiền ngoài năm tham số và các SKU mới. Chặng 10 năm tái dùng `ZiweiTopicDecadalTiming*` và đoạn `currentDecadal` nếu hợp (An xác nhận). Bát Tự là hệ thứ hai (engine mới, độc lập `ziwei/`); Tình duyên đôi ta dùng cả hai hệ. Công cụ Hội viên đứng sau cổng quyền lợi "Hội viên đang hiệu lực", mà Hội viên chưa bán nên chưa ai dùng được ngoài tài khoản thử.

## Ảnh và tài sản (assets) cho giai đoạn FE
Ba ảnh ChatGPT **đã duyệt và đã xử lý** (nền trong suốt, PNG + WebP), nằm ở `/Users/admin/Downloads/Add-on photos 1/da-xu-ly/`:
- `goc-trang-tri-hoa-van-khung-vang-lasoviet` (hoa văn góc khung),
- `vong-huy-hieu-cung-nang-do-lasoviet` (vòng huy hiệu cung),
- `chang-duong-10-nam-dai-van-lasoviet` (biểu tượng chặng 10 năm / đại vận).

Khi FE bắt đầu (GĐ4, và dùng tiếp ở thẻ Chặng ở đây), **sao chép (bản WebP trước, PNG dự phòng) vào `apps/web/public/images/lasoviet/`**, giữ nguyên tên đã chuẩn SEO (chữ thường, gạch nối; luật tên ảnh của repo). Không thêm ảnh khác. (Tệp `xem-thu-nho.png` trong cùng thư mục chỉ là ảnh xem thử, không đưa vào web.)

## Related Code Files
**Backend (An), tham chiếu `research/04-ticket-be-cho-an.md`:**
- Create: `packages/backend/src/reports/decadal-reading-writer.ts`, `decadal-report-config.ts`, `packages/contracts/src/ziwei-decadal-reading-v1.ts`, `packages/engine-adapters/src/ziwei/month-attention.ts`, engine/adapter Bát Tự mới, hợp đồng `compatibility-v1`, migration SKU mới
- Modify: `packages/contracts/src/la-catalog.ts`, `wallet-unlock.service.ts`, `period-reading-facts.ts`, `period-report-config.ts`, `topic-deep-dive-writer-v4.ts`, `ziwei-topic-deep-dive-v1.ts`, `iztro-mapping.ts`, `normalized-ziwei-chart-v1.ts`
**Frontend (Lãm + Claude):**
- Modify: `offer-ladder.tsx` (thẻ Tháng, Chặng, Tình duyên đôi ta, Bát Tự, chủ đề mới khi Active; câu mời mua theo mục 6.3 nghiên cứu 01), `paid-topic-selector*.tsx`, `ziwei-decadal-strip.tsx`, `membership-panel.tsx` (giữ ẩn)
- Create: trang Bát Tự và Tình duyên đôi ta (đường dẫn theo `config/route-registry.yml`, thêm route trước khi viết trang), màn công cụ Hội viên
- Create: `prototype/revamp-2026-10/mau-bai-<mon>.html` mỗi món một trang

## Implementation Steps
| # | Việc | Ai |
|---|---|---|
| 1 | Làm P0 của An (năm tham số, tính năm, ranh giới Tết, tháng cần chú ý thật, kiểm chứng đại vận) | An |
| 2 | **Năm [Y]**: kích hoạt (BE-P1-8) → trang mẫu → 2–3 bài thử tay → bật | An; Claude dựng trang; anh + đồng nghiệp thử |
| 3 | **Chặng 10 năm**: SKU + writer + cổng (BE-P1-7) → trang mẫu → thử tay → bật | An; Claude; anh |
| 4 | **Tình duyên, Công việc, Tháng**: kích hoạt → trang mẫu → thử tay → bật từng đề | An; Claude; anh |
| 5 | **Hôm nay** tinh chỉnh, **Combo**, **gói cặp** | An; Lãm + Claude |
| 6 | **Chủ đề mới** (6 chủ đề đầu theo `05`), mỗi chủ đề một vòng nhỏ | An; Lãm + Claude |
| 7 | **Công cụ Hội viên**: đặc tả → xây theo thứ tự (BE-P1-14) | An; Lãm + Claude |
| 8 | **Bát Tự**: engine, fixtures, writer, giao diện | An; Lãm + Claude |
| 9 | **Tình duyên đôi ta**: mã + giao diện; bật bán theo cổng chất lượng (tên chờ anh xác nhận) | An; Lãm + Claude; anh |
| 10 | **Cục/Mệnh chủ/Thân chủ/nạp âm** điền giữa lá số | An; Lãm + Claude |

## Success Criteria
- [ ] Mỗi món bật: cổng tự động đạt, 2–3 bài thử tay có ảnh chụp, anh duyệt, bằng chứng trên Kaneo.
- [ ] Món chưa đạt **không** hiện trên trang chọn (Q1); món vừa đạt tự hiện thẻ từ danh mục, không sửa giao diện.
- [ ] Chặng 10 năm: bảng kiểm engine ≥30 lá số × 4 ngày mốc không còn lệch; không bịa năm/tuổi ngoài chặng; 7 lá số cho đúng chặng hiện tại và chặng kế.
- [ ] Tháng cần chú ý: báo cáo phân bố trên ≥200 lá số được anh duyệt; không tháng ép.
- [ ] Combo: mua hai quyền lợi, phát lại, hoàn đạt; không còn gắn 2026.
- [ ] Bát Tự: fixtures đối chiếu độc lập đạt.
- [ ] Tình duyên đôi ta: có mã + trang mẫu; bán khi qua cổng chất lượng như mọi món (không còn cổng pháp lý, FD-119); tên chốt sau khi anh xác nhận.
- [ ] Công cụ Hội viên có đặc tả và chạy được cho tài khoản thử; Hội viên vẫn ẩn.
- [ ] Giá theo FD-105 + FD-119: Trọn đời 1.200, Bát Tự trọn đời 840, Trọn đời kép 1.500, hai người 960, Chặng 480, Combo 1.300, Năm nay + năm sau 780; hoàn đủ dưới 500 Lá, hoàn 50% từ 500 Lá.

## Risk Assessment
- Phạm vi lớn (nhiều món + hai hệ mới) → làm theo từng món, mỗi món một PR nhỏ; ưu tiên bán được nhiều nhất trước (Năm, Chặng); Bát Tự/Tình duyên đôi ta là epic riêng không chặn các món Tử Vi.
- Bỏ luật 20 bài → rủi ro chữ sai lọt ra khách → cổng tự động chạy trên **mỗi bài sinh ra khi bán**, hoàn Lá "Không đúng" giữ nguyên, 2–3 bài thử tay bắt buộc, theo dõi tỉ lệ hoàn Lá từng món sau phát hành.
- Chặng 10 năm bị bắt bẻ "chặng của tôi sai" → BE-P0-8 kiểm chứng + nhãn "tạm tính" khi giờ sinh chưa chắc.
- Tháng cần chú ý chỉ ra 0 tháng cho một số lá số → tinh chỉnh quy tắc cho đúng Tử Vi, không ép; nếu vẫn 0 thì nói thật.
- Tên "Tình duyên đôi ta" chưa được anh xác nhận → dùng tên tạm trong mã/giao diện qua một chỗ cấu hình duy nhất để đổi tên không phải sửa nhiều nơi.
- Combo mở trước khi thành phần đạt → khoá bằng danh mục: chỉ bật khi cả hai thành phần Active.
- Hai món cùng nói về năm → chữ bán nói thật phần nào có gì (GĐ5).
- Công cụ Hội viên bị coi là lời hứa trước khi bán → Hội viên giữ "sắp ra mắt", không nút mua, không quảng cáo công cụ cho khách ngoài Hội viên.

## Trang HTML duyệt
`mau-bai-<mon>.html` (một trang cho mỗi món: Năm, Chặng, Tình duyên, Công việc, Tháng, mỗi chủ đề mới, Bát Tự, Tình duyên đôi ta): mẫu bài thật từ lá số tổng hợp **cộng** ảnh chụp 2–3 bài thử tay của anh và đồng nghiệp, kết quả cổng tự động, chấm 1–5. Riêng trang Năm có thêm **báo cáo phân bố tháng cần chú ý** (BE-P0-4) và trang Chặng có **bảng kiểm engine đại vận**. Anh làm gì: đọc mẫu, chấm, bấm duyệt hoặc "chưa đạt" cho từng món; món nào duyệt thì An bật. Riêng Tình duyên đôi ta: thêm khung "Xác nhận tên sản phẩm" để anh chốt tên.
