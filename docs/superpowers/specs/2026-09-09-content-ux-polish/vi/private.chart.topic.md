---
route_id: private.chart.topic
canonical_path: /la-so/{chartId}/chon-luan-giai
locale: vi
lifecycle: live_noindex
implementation_state: current (chỉ render 1 offer cứng — cần viết lại theo ladder 2 tầng, chặn bởi WP-01/WP-02)
source_commit: a3db625e1117e2facb0e066192b098aff4570913
candidate_commit: null
version: 1
status: draft
reviewer: null
approved_at: null
approval_record: null
content_sha256: null
---

# `/la-so/{chartId}/chon-luan-giai` — Chọn luận giải — Draft nội dung (vòng 1)

**Nguồn:** `features/reports/paid-topic-selector.tsx`. Xác nhận đúng phát hiện #2 của spec ladder: component
chỉ render `topics.offers[0]` — một offer cứng, không có cơ chế chọn giữa nhiều gói. Đây là trang **P0
quan trọng nhất** để phản ánh ladder 2 tầng mới, vì đây là nơi duy nhất nên hiển thị giá/tên gói (xem
`private.chart.md` — đã bỏ giá khỏi trang kết quả để tránh 2 nguồn sự thật).

**Phụ thuộc engineering:** nội dung dưới đây là target-state, cần WP-01 (contract cho phép nhiều SKU) và
WP-02 (checkout đọc đúng theo SKU đã chọn) trước khi implement được — không phải patch trực tiếp lên
`topics.offers[0]` hiện tại.

## Current (nguyên văn)

> eyebrow "Luận giải chuyên sâu" · h1 "Chọn luận giải chuyên sâu" · "Chủ đề đang mở" · {tên offer[0]} ·
> {giá} {currency} · "Thanh toán một lần. Không tự động gia hạn." · CTA "Tiếp tục thanh toán"

## Đề xuất

```
eyebrow: "Chọn luận giải phù hợp"
h1:      "Luận giải cho lá số của bạn"
context: "Luận giải cho lá số ngày {ngày sinh}" · [Xem lại lá số ←]

── Thẻ 1 ──
title:        "Bản mệnh & Tiềm năng"
deliverables: "Tổng quan bản mệnh, trục cốt lõi Mệnh – Thân, và điểm mạnh/điểm căng chính."
price:        "19.000 ₫ · một lần"
sampleLink:   "Xem bản mẫu"
upgradeNote (BẮT BUỘC theo FD-041 — phải hiện tại đây, trước khi khách xác nhận mua tầng 1):
              "Nếu sau đó bạn muốn đọc bản toàn diện, số tiền này được trừ thẳng vào giá nâng cấp — trong
              vòng 7 ngày kể từ hôm nay."
CTA:          "Chọn Bản mệnh & Tiềm năng — 19.000 ₫"

── Thẻ 2 (badge "Đầy đủ nhất") ──
title:        "Luận giải Tử Vi toàn diện"
deliverables: "Toàn bộ nội dung ở trên, cộng đủ 12 cung, các cấu hình quan trọng và tổng hợp theo 4 chủ đề
              cuộc sống."
price:        "79.000 ₫ · một lần"
sampleLink:   "Xem bản mẫu"
CTA:          "Chọn Luận giải toàn diện — 79.000 ₫"

── Chung ──
trustRow: "Thanh toán một lần, không tự động gia hạn · Đọc lại không giới hạn sau khi mua."
gateNote: "Cần tài khoản có email đã xác minh để thanh toán. Nếu bạn đăng nhập sau khi chọn, lựa chọn này
          vẫn được giữ nguyên — không phải chọn lại."
help:     "Chuyển nhầm hoặc cần hỗ trợ? [Liên hệ]"
```

**Kỹ thuật áp dụng:** CTA có giá ngay trong nút (copywriting-expert — "communicate what they get", giảm
bất ngờ ở bước sau); anchoring thật (marketing-psychology) — đặt 2 thẻ cạnh nhau để 79k tự nhiên trông
"đầy đủ hơn" so với 19k mà không cần nói quá; `upgradeNote` không phải kỹ thuật thuyết phục — là điều kiện
bắt buộc theo FD-041, không tuỳ chọn bỏ.

## State variants

| State | Trigger | Copy | Hành động |
|---|---|---|---|
| Đã có entitlement tầng 1, trong 7 ngày | Quay lại trang này sau khi mua 19k | Thay thẻ 1 bằng: "Bạn đã có Bản mệnh & Tiềm năng (mua ngày {date})" + thẻ 2 hiện **"Nâng cấp — chỉ còn 60.000 ₫"** (79.000 − đã trả), kèm "Ưu đãi còn {N} ngày" | CTA "Nâng cấp lên bản toàn diện — 60.000 ₫" |
| Đã có entitlement tầng 1, quá 7 ngày | Quay lại sau hạn | Thẻ 2 hiện giá đầy đủ 79.000 ₫, **không** nhắc khấu trừ đã hết hạn (không nhắc lại một ưu đãi đã mất — tránh cảm giác bị lấy đi) | CTA "Chọn Luận giải toàn diện — 79.000 ₫" |
| Đã có entitlement tầng 2 | Quay lại sau khi đã mua đủ | Không hiện nút mua nào — theo đúng B-3: hiện "Đọc lại" | CTA duy nhất: "Đọc lại luận giải" → thẳng vào reader |
| Ẩn danh/chưa xác minh email | Bấm chọn 1 trong 2 thẻ | Điều hướng đăng nhập, giữ nguyên lựa chọn đã bấm (B-5) | Sau đăng nhập quay lại đúng thẻ đã chọn, không phải trang chủ |
| 0 hoặc nhiều hơn 2 offer từ backend (lỗi dữ liệu) | Bất thường | Không hiện trang trắng lỗi — hiện "Không thể tải lựa chọn luận giải lúc này" + [Thử lại] + [Xem lá số] | Theo B-1 acceptance |

## Founder approval

Chưa duyệt.
