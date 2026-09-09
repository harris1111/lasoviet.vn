---
route_id: methodology.tu-vi
canonical_path: /phuong-phap/tu-vi
locale: vi
lifecycle: live_indexable
implementation_state: current (MDX body chưa được render)
source_commit: a3db625e1117e2facb0e066192b098aff4570913
candidate_commit: null
version: 1
status: draft
reviewer: null
approved_at: null
approval_record: null
content_sha256: null
---

# `/phuong-phap/tu-vi` — Phương pháp Tử Vi — Draft nội dung (vòng 1)

**Nguồn hiện tại:** `content/public/vi/pages/method.ziwei.mdx`. Trang này khác `/phuong-phap` ở chỗ: đây
là **tầng kiểm chứng sâu** dành cho người muốn xem chi tiết kỹ thuật (engine, version, ca thử nghiệm) —
audit gốc đề xuất giữ dạng "Inputs / Calculation / Provenance / Known limits" có thể mở rộng. Vì vậy tôi
**không xóa chi tiết kỹ thuật** (iztro 2.6.0, ruleSetId) như ở trang gốc `/phuong-phap` — chỉ chuyển nó
xuống thành phần "cho người muốn kiểm chứng sâu" ở cuối, sau khi đã mở bằng frame cổ học.

## Current (nguyên văn MDX)

> Adapter hiện được ghim iztro 2.6.0 với ruleSetId ziwei.default. Nó ánh xạ tên cung, địa chi, sao,
> brightness và mutagen của dữ liệu thô sang mã canonical dùng chung trong hợp đồng... Fixture ghi lại các
> ca chuyển lịch, tháng nhuận, đầu cuối giờ Tý, biên chi và provenance múi giờ...

## Đề xuất

```markdown
# Phương pháp Tử Vi

## Một hệ đã tồn tại qua nhiều thế kỷ, một cách vận hành nhất quán

Tử Vi Đẩu Số là một trong những hệ chiêm tinh phương Đông lâu đời, được đúc kết qua nhiều thế hệ. Lá Số
Việt giữ đúng cách an sao, định cung truyền thống, rồi vận hành bằng một hệ thống tính toán nhất quán:
cùng một dữ liệu sinh, luôn cho ra cùng một lá số — không phụ thuộc vào ai đang tính hay tính vào lúc nào.

## Từ ngày giờ sinh đến vị trí từng sao

Hệ thống chuyển ngày giờ sinh của bạn thành vị trí các cung, địa chi, các sao chính cùng độ sáng và tứ hóa
— theo đúng quy tắc của trường phái đang áp dụng.

## Những ca khó chúng tôi đã kiểm tra kỹ

Chuyển đổi âm-dương lịch, tháng nhuận, ranh giới giờ Tý sớm/muộn và múi giờ nơi sinh là những điểm dễ sai
nhất khi lập lá số. Chúng tôi kiểm tra kỹ từng trường hợp này bằng các ca thử nghiệm cụ thể — không khẳng
định đã khớp với mọi trường phái hay mọi cách hiệu chỉnh khác đang tồn tại.

## Cho người muốn kiểm chứng sâu

Engine hiện dùng: **iztro 2.6.0**, theo bộ quy tắc `ziwei.default`. Thông tin này công khai để bất kỳ ai
— kể cả người am hiểu kỹ thuật — có thể tự đối chiếu.

## Giới hạn

Đây là một cách đọc để bạn tự chiêm nghiệm — không phải lời tiên đoán chắc chắn, không phải chẩn đoán, và
không thay thế người có chuyên môn khi bạn thật sự cần.

## Đọc tiếp

[Lập lá số Tử Vi miễn phí](route:calculator.tu-vi) · [Khu kiến thức Tử Vi](route:knowledge.tu-vi)
```

**Kỹ thuật áp dụng:** giữ "tứ hóa" (thuật ngữ Tử Vi thật, không phải jargon kỹ thuật) nhưng bỏ "adapter",
"brightness", "canonical", "provenance"; đặt version/engine vào một khối riêng cuối trang thay vì mở đầu
— đúng gợi ý của audit gốc (method page cần "collapsible... make version/review date visibly scannable"),
vừa giữ được credibility cho người kỹ thuật vừa không làm hỏng trải nghiệm đọc của người thường.
