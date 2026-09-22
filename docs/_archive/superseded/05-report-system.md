# 05 — Paid Report System

## 1. Product principle

Người dùng trả tiền cho **chiều sâu, cấu trúc và tính cá nhân**, không trả tiền chỉ để nhận thêm nhiều chữ. Báo cáo phải trả lời ba câu:

1. Điều gì đang nổi bật trong lá số của tôi?
2. Vì sao hệ thống đưa ra nhận định đó?
3. Tôi có thể quan sát hoặc hành động thế nào?

## 2. Cấu trúc báo cáo chuẩn

1. **Tóm tắt cá nhân** — 5–7 luận điểm, không dùng câu chung cho mọi người.
2. **Dữ liệu và phương pháp** — dữ liệu sinh, timezone, trường phái/rule set, giới hạn.
3. **Căn cứ chính** — các cung/sao/trụ/aspect/quẻ được dùng.
4. **Thế mạnh và nguồn lực** — mô tả biểu hiện tích cực có điều kiện.
5. **Mâu thuẫn và điểm dễ mắc kẹt** — không phán xét.
6. **Phân tích chủ đề** — phần dài nhất, tùy SKU.
7. **Chu kỳ và thời điểm** — nêu cửa sổ/thời kỳ, không tuyên bố sự kiện chắc chắn.
8. **Điều trong vùng kiểm soát** — hành động quan sát được.
9. **Câu hỏi tự phản chiếu** — 3–5 câu.
10. **Tóm tắt hành động** — tối đa 5 mục.
11. **Giới hạn phương pháp và disclaimer**.

## 3. SKU giai đoạn 1

### Bản mệnh & tiềm năng

- cấu trúc khí chất và động lực;
- cách ra quyết định;
- thế mạnh, blind spots;
- môi trường phù hợp;
- pattern phát triển dài hạn.

### Tình duyên & hôn nhân

- nhu cầu gắn kết;
- cách thể hiện/tiếp nhận tình cảm;
- pattern xung đột;
- điều kiện cho mối quan hệ lành mạnh;
- chu kỳ thuận lợi/căng thẳng theo ngôn ngữ xác suất.

Không xác quyết người yêu phản bội, ngày cưới bắt buộc hoặc “định mệnh duy nhất”.

### Công việc & tài lộc

- động lực nghề nghiệp;
- cách dùng năng lực;
- môi trường và vai trò;
- pattern tiền bạc/risk;
- giai đoạn cần thận trọng hoặc tận dụng.

Không đưa lời khuyên đầu tư cụ thể hoặc cam kết thu nhập.

### Vận trình năm

- chủ đề của năm;
- các giai đoạn đáng chú ý;
- cơ hội/rủi ro theo lĩnh vực;
- checklist quan sát và chuẩn bị.

Không biến thành 12 tháng copy-paste; chỉ đi sâu khi có evidence khác nhau.

## 4. Evidence UX

Mỗi luận điểm chính có nút **“Vì sao có nhận định này?”** mở drawer:

- rule/evidence label thân thiện;
- vị trí liên quan trên chart;
- giải thích ngắn về quy tắc;
- mức độ tin cậy/ảnh hưởng của giờ sinh nếu có;
- không lộ prompt hoặc chi tiết nội bộ không cần thiết.

Ví dụ payload:

```json
{
  "claim_id": "career-03",
  "text": "Bạn có xu hướng phát huy tốt khi được tự chủ trong cách giải quyết vấn đề.",
  "evidence_keys": ["ziwei.menh.main_star_x", "ziwei.quan_loc.aspect_y"],
  "confidence": "medium",
  "limitations": ["birth_time_sensitive"],
  "actions": ["Ưu tiên vai trò có quyền sở hữu đầu việc rõ ràng"]
}
```

## 5. Generation rules

- Engine tính toán deterministic.
- Rule layer chọn evidence; LLM không tự phát minh sao/cung/aspect.
- Retrieval chỉ từ knowledge base/version đã phê duyệt.
- Prompt yêu cầu cân bằng supportive và cautionary evidence.
- Cấm câu Barnum không gắn evidence.
- Cấm chẩn đoán tâm lý/y khoa.
- Cấm lời hứa chính xác hoặc chắc chắn.
- Giới hạn lặp lại, độ dài và thuật ngữ.
- Nếu evidence xung đột, mô tả tension thay vì chọn một kết luận tuyệt đối.

## 6. Quality rubric

Chấm 1–5 cho từng tiêu chí:

- Correctness against Chart JSON.
- Evidence coverage.
- Personal specificity.
- Vietnamese clarity.
- Internal consistency.
- Actionability.
- Safety and non-fatalism.
- Repetition control.

Report không đạt nếu bất kỳ tiêu chí correctness/safety dưới 4.

## 7. Pricing/packaging test

- Giá launch đề xuất: 79.000đ/topic.
- Không giả định đây là optimum.
- Test tuần tự, không chạy quá nhiều biến cùng lúc:
  1. Baseline 79k.
  2. So 59k vs 79k hoặc 79k vs 99k trên cùng traffic intent.
  3. Sau đủ mẫu, test bundle 2 báo cáo.

Theo dõi revenue per chart created, không chỉ checkout conversion.
