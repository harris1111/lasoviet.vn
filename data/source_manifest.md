# Source Manifest

Ngày đóng gói: 2026-08-31

## Nguồn do người dùng cung cấp

### Keyword Planner

- `Keyword Stats Aug 30 2026*.csv`
- `Keyword Stats Aug 31 2026.csv`
- `Keyword Stats 2026-08-31 at 11_29_33.csv`
- `Keyword Stats 2026-08-31 at 11_30_00.csv`
- `Keyword Stats 2026-08-31 at 11_30_39.csv`
- `Keyword Stats 2026-08-31 at 11_30_54.csv`
- `Keyword Stats 2026-08-31 at 11_31_20.csv`
- `Keyword Stats 2026-08-31 at 11_41_17.csv`

Chi tiết hash, filename trùng, kỳ đo và số dòng nằm trong sheet `Source Files` của master workbook.

`Keyword Forecasts Aug 30 2026.csv` và `Keyword Planner Template.csv` được giữ trong lịch sử nguồn nhưng không dùng làm dữ liệu canonical của bảng Keyword Stats vì mục đích/cấu trúc khác.

### Coverage/spec

- `divination_repo_coverage (1)(1).xlsx`
- File này trùng nội dung với `divination_repo_coverage (1).xlsx` theo SHA-256 trong quá trình kiểm kê; package giữ một bản tên chuẩn hóa.

### Screenshots

Screenshot Google Ads được dùng để kiểm tra cách ánh xạ số CSV với range hiển thị và xác nhận các dòng ngẫu nhiên. Screenshot domain/DNS dùng để ghi nhận ba domain và nameserver Cloudflare. Dữ liệu dạng bảng trong CSV/XLSX là nguồn audit chính.

## Phương pháp xử lý

- Decode CSV UTF-16LE và parse TSV.
- Loại các dòng tổng `All`/`Vietnam` không có keyword.
- Nhận diện file trùng bằng SHA-256.
- Chuẩn hóa keyword: lowercase, trim, collapse whitespace; giữ dấu tiếng Việt.
- Giữ dữ liệu trống là null.
- Không cộng volume giữa các keyword hoặc các batch.
- Không so sánh trực tiếp trend của batch 24 tháng với bucket 12 tháng như cùng một kỳ đo.

## Giới hạn

- Keyword Planner bucket hóa volume.
- Competition và bid là dữ liệu quảng cáo, không phải độ khó SEO.
- Planner có thể nhóm close variants hoặc không hiển thị volume thấp.
- Dữ liệu không cung cấp demographic hay willingness-to-pay.
