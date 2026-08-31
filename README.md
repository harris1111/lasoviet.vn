# Lá Số Việt — Concept & Product Package

Phiên bản đóng gói: 2026-08-31  
Thị trường: Việt Nam  
Tên miền chính: `lasoviet.vn`

Đây là bộ hồ sơ làm nguồn sự thật chung cho founder, marketing, product, design và engineering trong giai đoạn 1 của Lá Số Việt.

## Quyết định cốt lõi

- Xây Lá Số Việt như **nền tảng lập và luận giải lá số cho người Việt**, không định vị như “thầy bói AI”.
- `lasoviet.vn` là thương hiệu, canonical SEO, thanh toán và email duy nhất.
- Hero: **Lập lá số. Hiểu vận mệnh.**
- Tử Vi là sản phẩm doanh thu đầu tiên; Bát Tự và Bản đồ sao là lớp mở rộng gần nhất; Kinh Dịch đi sau.
- AI đứng sau quy trình tính toán–tổng hợp–diễn giải, được công bố trung thực nhưng không chi phối tên miền hay headline.
- Mô hình giai đoạn 1: lập lá số miễn phí → xem tóm tắt → mua một chủ đề luận giải chuyên sâu, giá khởi điểm đề xuất **79.000đ**.
- Chưa mở bán vật phẩm phong thủy trong giai đoạn 1; chỉ chuẩn bị taxonomy và hạ tầng dữ liệu.

## Cấu trúc gói

- `MASTER_CONCEPT.md`: bản tóm tắt điều hành và concept tổng thể.
- `docs/01-evidence-and-insights.md`: bằng chứng, insight và giới hạn suy luận.
- `docs/02-brand-and-positioning.md`: định vị, thông điệp, nguyên tắc tâm lý và niềm tin.
- `docs/03-sitemap-and-seo.md`: kiến trúc thông tin, URL và chiến lược SEO.
- `docs/04-phase-1-product-spec.md`: phạm vi MVP, luồng người dùng và acceptance criteria.
- `docs/05-report-system.md`: cấu trúc báo cáo trả phí và nguyên tắc sinh nội dung.
- `docs/06-technical-architecture.md`: kiến trúc tính toán, evidence và AI.
- `docs/07-content-and-growth.md`: content engine, funnel và kế hoạch kiểm chứng.
- `docs/08-domain-and-infrastructure.md`: vai trò ba tên miền và DNS/Cloudflare.
- `docs/09-roadmap-and-metrics.md`: roadmap, KPI, analytics và thí nghiệm.
- `docs/10-decision-log.md`: các quyết định đã chốt, lý do và điều kiện xem xét lại.
- `config/`: cấu hình JSON để đội dev có thể dùng làm seed/spec.
- `data/lasoviet_research_master.xlsx`: workbook chứng cứ đã khử trùng.
- `data/divination_repo_coverage.xlsx`: workbook coverage/spec nguồn do người dùng cung cấp.

## Thứ tự đọc khuyến nghị

1. `MASTER_CONCEPT.md`
2. `docs/04-phase-1-product-spec.md`
3. `docs/03-sitemap-and-seo.md`
4. `docs/05-report-system.md`
5. `docs/06-technical-architecture.md`
6. Workbook trong `data/` để audit bằng chứng.

## Nguyên tắc sử dụng

- Số Google Keyword Planner là **bucket**, không phải con số tuyệt đối.
- Dấu trống trong Planner là “không có dữ liệu hiển thị”, không được diễn giải thành 0 lượt tìm kiếm.
- Volume tìm kiếm chứng minh nhu cầu tìm thông tin/công cụ; không tự động chứng minh willingness-to-pay.
- Mọi dự báo conversion, giá bán và hành vi mua đều là giả thuyết phải kiểm chứng bằng traffic thật.
- Không tạo nội dung hàng loạt chỉ để phủ từ khóa; trang phải có calculator, dữ liệu, phương pháp hoặc giá trị biên tập thật.

## Move vào local path

Giải nén gói rồi copy toàn bộ thư mục này vào repo. Có thể giữ nguyên tại `docs/product/lasoviet/`, hoặc tách:

- tài liệu → `/docs/lasoviet/`
- JSON → `/config/lasoviet/`
- workbook → `/research/lasoviet/`

Không có dependency chạy code trong gói này.
