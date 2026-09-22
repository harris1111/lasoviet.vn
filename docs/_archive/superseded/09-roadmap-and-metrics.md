# 09 — Roadmap, Metrics & Experiments

## 1. Roadmap theo gate

### Gate 0 — Foundation

- Chốt rule set Tử Vi.
- Engine fixtures và cross-check.
- Chart JSON/evidence schema.
- Brand UI primitives.
- Privacy/terms/payment provider.

### Gate 1 — Private alpha

- Calculator + free summary.
- Một paid SKU end-to-end.
- 20–50 user test có phỏng vấn.
- QA report rubric và support workflow.

### Gate 2 — Public MVP

- 4 paid topics.
- SEO pages P0.
- Analytics đầy đủ.
- Price baseline 79k.
- Search Console + paid intent test nhỏ.

### Gate 3 — Prove conversion

- Đủ mẫu để so conversion theo intent/topic/device.
- Fix trust/friction trước khi thêm hệ mới.
- Test price/preview/sample report có kiểm soát.

### Gate 4 — Expand

- Bát Tự → Bản đồ sao → Kinh Dịch.
- Cross-system synthesis sau khi từng engine ổn định.
- Chỉ cân nhắc commerce phong thủy khi brand trust và traffic đã rõ.

## 2. Event taxonomy

- `landing_view`
- `method_selected`
- `birth_form_started`
- `birth_form_error`
- `chart_created`
- `free_summary_viewed`
- `evidence_opened`
- `paid_topic_selected`
- `paywall_viewed`
- `checkout_started`
- `payment_completed`
- `payment_failed`
- `report_generation_completed`
- `report_opened`
- `report_downloaded`
- `support_requested`
- `profile_deleted`

Không gửi tên/ngày/giờ/nơi sinh hoặc nội dung report vào analytics payload.

## 3. Funnel metrics

| Stage | Metric |
|---|---|
| Landing | CTA click rate |
| Form | form start → chart created |
| Value | chart created → free summary viewed |
| Trust | evidence open rate; methodology/sample view |
| Intent | free summary → paid topic selected |
| Commerce | checkout started → payment completed |
| Delivery | payment completed → report opened |
| Business | paid revenue / valid chart created |
| Quality | support/refund/regeneration rate |
| Retention | second report purchase within 30/90 days |

## 4. Initial decision thresholds

Các ngưỡng dưới đây là operating hypotheses, không phải benchmark ngành:

- Nếu form completion <35%: sửa form/input/timezone trước marketing.
- Nếu free summary → paywall <15%: vấn đề value proposition/topic matching.
- Nếu checkout completion <50%: kiểm tra payment trust/UX/provider.
- Nếu paid conversion thấp nhưng paywall engagement cao: test giá, mẫu và trust.
- Nếu refund/regeneration >8%: ưu tiên input validation và report quality.

Chỉ kết luận sau khi có đủ traffic theo cùng intent; không dựa vào vài chục session lẫn nguồn.

## 5. Experiment backlog

Ưu tiên theo thứ tự:

1. Free summary depth: 3 insight vs 5 insight.
2. Evidence drawer mặc định đóng vs highlight một căn cứ.
3. Sample report preview vs mục lục đơn thuần.
4. Topic recommendation cá nhân vs danh sách 4 topic.
5. 79k baseline vs 59k/99k.
6. Guarantee tạo lại khi nhập sai dữ liệu.
7. Bundle 2 report sau khi single-SKU conversion ổn định.

Không test nhiều biến đồng thời trên traffic nhỏ.

## 6. Research after launch

- Search Console query/page data.
- On-site search và FAQ clicks.
- Support/refund reason taxonomy.
- 10–15 phỏng vấn người mua và người bỏ checkout.
- Survey sau report: “Phần nào hữu ích/cụ thể/khó hiểu?”
- Cohort by source intent, không chỉ tổng traffic.

Đây là dữ liệu cần tiếp theo; thêm Keyword Planner batch trước launch có lợi ích biên thấp.
