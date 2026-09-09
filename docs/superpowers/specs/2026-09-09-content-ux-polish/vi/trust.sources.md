---
route_id: trust.sources
canonical_path: /nguon-tri-thuc
locale: vi
lifecycle: live_indexable
implementation_state: current (MDX body chưa render + thiếu nội dung thật, xem ghi chú dưới)
source_commit: a3db625e1117e2facb0e066192b098aff4570913
candidate_commit: null
version: 1
status: draft
reviewer: null
approved_at: null
approval_record: null
content_sha256: null
---

# `/nguon-tri-thuc` — Nguồn tri thức — Draft nội dung (vòng 1)

**Nguồn hiện tại:** `content/public/vi/pages/sources.mdx`. Đây không chỉ là vấn đề giọng văn — nội dung
hiện tại mô tả *khái niệm* có một danh mục nguồn ("Danh mục nguồn ghi rõ tài liệu nào là định hướng
thương hiệu, hợp đồng dữ liệu, mã ánh xạ, fixture...") mà **không liệt kê nguồn nào cả**. Audit gốc
(`public-content-audit.md`) gọi đúng đây là "a source registry page without a registry — a trust dead
end". Bản đề xuất dưới đây viết cả nội dung thật (danh sách nguồn ở dạng người đọc hiểu được), không chỉ
đổi giọng.

## Current (nguyên văn MDX)

> Danh mục nguồn ghi rõ tài liệu nào là định hướng thương hiệu, hợp đồng dữ liệu, mã ánh xạ, fixture và
> quy tắc evidence. Mỗi nguồn tồn tại trong repository để người duy trì có thể kiểm tra phiên bản cùng nội
> dung công khai.

## Đề xuất

```markdown
# Nguồn tri thức

## Tri thức cổ, trình bày minh bạch

Dù là phương Đông hay phương Tây, mỗi hệ chúng tôi trình bày đều bắt nguồn từ tri thức được người xưa đúc
kết qua nhiều thế kỷ. Trang này liệt kê những gì đứng sau nội dung bạn đang đọc — để bạn tự kiểm tra, thay
vì chỉ tin vào một cái tên nghe uy tín.

## Những gì đứng sau một lá số Tử Vi

- **Phương pháp:** hệ Tử Vi Đẩu Số truyền thống, theo trường phái đang áp dụng hiện tại — xem chi tiết tại
  [Phương pháp Tử Vi](route:methodology.tu-vi).
- **Cách tính:** vận hành qua một engine tính toán công khai phiên bản, người am hiểu kỹ thuật có thể tự
  đối chiếu.
- **Kiểm thử:** các trường hợp khó — tháng nhuận, ranh giới giờ Tý, múi giờ nơi sinh — được kiểm tra bằng
  bộ ca thử nghiệm cụ thể trước khi phát hành, không chỉ dựa vào một lần tính thử.
- **Biên tập:** nội dung diễn giải được đội ngũ Lá Số Việt xem xét trước khi công bố.

## Những gì chúng tôi chưa thể đối chiếu đầy đủ

Có những điểm khác biệt thật sự giữa các trường phái — như giờ Tý sớm/muộn hay cách tính theo giờ mặt
trời thực — mà một danh mục nguồn không thể tự biến thành lời xác nhận cho mọi cách diễn giải truyền
thống khác.

## Giới hạn

Đây là một cách đọc để bạn tự chiêm nghiệm — không phải lời tiên đoán chắc chắn, không phải chẩn đoán, và
không thay thế người có chuyên môn khi bạn thật sự cần.

## Đọc tiếp

[Lập lá số Tử Vi miễn phí](route:calculator.tu-vi) · [Khu kiến thức Tử Vi](route:knowledge.tu-vi)
```

**Kỹ thuật áp dụng:** mở bằng frame cổ học Đông-Tây; viết ra một danh sách nguồn **thật, ở dạng người đọc
hiểu được** thay vì mô tả khái niệm suông — mọi mục trong danh sách đều bám vào sự thật đã xác nhận trong
`method.ziwei.mdx`/`method.mdx` (fixture, ca thử nghiệm, quy trình review), không thêm nguồn nào chưa được
xác nhận trong repo.

## Câu hỏi mở

Danh sách "Những gì đứng sau một lá số Tử Vi" ở trên là đề xuất dựa trên đúng những gì tôi tìm thấy trong
repo. Nếu có nguồn thật khác (ví dụ tên cụ thể của trường phái/tài liệu tham chiếu mà đội ngũ dùng khi xây
`ziwei.default`) mà chưa xuất hiện trong `content/public/vi/pages/*.mdx` hay `config/*`, cho tôi biết để
thêm vào — tôi không tự thêm tên tài liệu cụ thể nào ngoài những gì đã xác nhận được.
