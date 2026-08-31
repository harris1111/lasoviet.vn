# Data Package

## `lasoviet_research_master.xlsx`

Workbook đã hợp nhất 43 file Keyword Stats, nhận diện 25 export độc nhất bằng SHA-256, khử trùng theo keyword và giữ provenance.

Các sheet:

- `Dashboard`: KPI nguồn, phân bố bucket và kết luận chính.
- `Keyword Master`: một dòng/keyword canonical; ưu tiên batch 12 tháng khi có.
- `Observations`: toàn bộ observation từ các export độc nhất.
- `Source Files`: hash, kỳ đo, số dòng và danh sách filename trùng.
- `Cluster Summary`: tổng hợp theo nhóm phương pháp/intent.
- `Priority Keywords`: danh sách curated phục vụ sitemap/product.
- `Product Scope`: roadmap discipline/spec.
- `Repo & License`: repo candidate và quyết định license.
- `Decision Log`: quyết định sản phẩm có trạng thái.
- `Assumptions & Tests`: điều chưa được dữ liệu chứng minh.

Quy tắc canonical:

1. Ưu tiên observation kỳ 2025-08-01 → 2026-07-31.
2. Nếu keyword chỉ xuất hiện trong batch 24 tháng, giữ observation đó và ghi rõ period.
3. Dấu trống giữ nguyên là thiếu dữ liệu, không đổi thành 0.

## `divination_repo_coverage.xlsx`

Bản sao nguyên trạng của workbook coverage/spec được cung cấp. Tài liệu Markdown và sheet `Repo & License` chỉ chọn subset phù hợp Phase 1; không diễn giải toàn bộ 27 bộ môn là scope cần xây ngay.

## Audit boundary

- Google Keyword Planner: chứng cứ nhu cầu tìm kiếm tương đối.
- Repo coverage: chứng cứ về phạm vi kỹ thuật/repo/license ở thời điểm workbook được lập.
- Giá, conversion và hành vi trả tiền: hypothesis, phải kiểm chứng bằng sản phẩm thật.
