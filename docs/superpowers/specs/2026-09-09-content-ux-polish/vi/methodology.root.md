---
route_id: methodology.root
canonical_path: /phuong-phap
locale: vi
lifecycle: live_indexable
implementation_state: current (MDX body chưa được render — Must-fix 1, xem audit `public-content-audit.md`)
source_commit: a3db625e1117e2facb0e066192b098aff4570913
candidate_commit: null
version: 1
status: draft
reviewer: null
approved_at: null
approval_record: null
content_sha256: null
---

# `/phuong-phap` — Phương pháp luận — Draft nội dung (vòng 1, theo voice-and-positioning.md)

**Nguồn hiện tại:** `content/public/vi/pages/method.mdx`. Đây là ví dụ rõ nhất cho đúng nhận xét của Harris
— nguyên văn hiện tại viết bằng giọng tài liệu kỹ thuật ("adapter tính toán", "TIME_UNKNOWN", "fixture
unknown-time"), không phải copy cho người đọc thường. Nội dung factual bên dưới **giữ nguyên toàn bộ ý
thật** (4 lớp phương pháp, ranh giới giờ sinh chưa đủ điều kiện, giới hạn diễn giải) — chỉ đổi cách nói.

## Current (nguyên văn MDX)

> Phương pháp được chia thành bốn lớp: dữ liệu sinh đã chuẩn hóa, adapter tính toán, cấu trúc biểu đồ,
> rồi evidence giới hạn phạm vi diễn giải... Nếu dữ liệu không đạt điều kiện, hệ thống không nên bù bằng
> suy đoán. Fixture unknown-time cho thấy trường hợp TIME_UNKNOWN bị dừng trước khi gọi adapter...

## Đề xuất

```markdown
# Phương pháp luận

## Một hệ tri thức cổ, một cách trình bày rõ ràng

Dù là Tử Vi, Bát Tự hay chiêm tinh phương Tây, mỗi hệ quy chiếu tại Lá Số Việt đều bắt nguồn từ tri thức
được người xưa đúc kết qua nhiều thế kỷ — phương Đông hay phương Tây đều vậy. Việc của chúng tôi là giữ
đúng tinh thần đó, rồi trình bày lại theo cách bạn có thể tự kiểm tra từng bước, không phải chỉ tin theo.

## Bốn lớp, một đường đi rõ ràng

Từ dữ liệu sinh của bạn đến một nhận định cụ thể, hệ thống đi qua bốn lớp: chuẩn hóa dữ liệu sinh, tính
theo quy tắc cổ truyền, dựng cấu trúc lá số, rồi mới đến phần diễn giải có giới hạn rõ ràng. Tách lớp như
vậy để mỗi câu trả lời đều có thể chỉ ra: nó đến từ đâu.

## Khi dữ liệu chưa đủ, chúng tôi nói thẳng

Nếu giờ sinh chưa đủ điều kiện, hệ thống không đoán bừa để có một kết quả cho có. Đây là một ranh giới
chúng tôi chủ động đặt ra, không phải một lỗi cần giấu.

## Giới hạn

Đây là một cách đọc để bạn tự chiêm nghiệm — không phải lời tiên đoán chắc chắn, không phải chẩn đoán,
và không thay thế người có chuyên môn khi bạn thật sự cần.

## Đọc tiếp

[Lập lá số Tử Vi miễn phí](route:calculator.tu-vi) · [Khu kiến thức Tử Vi](route:knowledge.tu-vi)
```

**Kỹ thuật áp dụng:** mở bằng frame "cổ học Đông-Tây" đã chốt (voice-and-positioning.md ✅) thay vì đi
thẳng vào 4 lớp kỹ thuật; dịch "adapter", "TIME_UNKNOWN", "fixture" sang câu người thật nói (copywriting-
expert: customer language, không company language); giữ nguyên 100% nội dung thật (không thêm/bớt claim).
