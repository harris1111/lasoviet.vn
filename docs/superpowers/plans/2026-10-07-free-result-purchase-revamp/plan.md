---
title: "Làm lại trang lá số miễn phí và trang mua luận giải"
description: "Sửa UX, UI và cách engine sinh chữ của luồng lá số miễn phí → chọn luận giải → mở khoá, theo biên bản họp 07/10. Mỗi giai đoạn có một trang HTML để anh duyệt hoặc sửa trực tiếp trước khi viết code thật."
status: pending
priority: P1
branch: "plan/free-result-purchase-revamp"
tags: [ux, ui, copy, engine, free-result, offer, desktop, mobile-first]
blockedBy: []
blocks: []
created: "2026-10-07T12:03:43.744Z"
createdBy: "ck:plan"
source: skill
---

# Làm lại trang lá số miễn phí và trang mua luận giải

## Overview

**Vì sao làm:** anh xem trang thật trên desktop ngày 07/10 và thấy giao diện vỡ, sơ sài, không dùng lá số có dấu triện đã duyệt. Khách đọc chưa đủ hấp dẫn để mua, logic các tab chưa hợp lý. Biên bản họp: `docs/reviews/2026-10-07-hop-ux-ui-luong-mua-luan-giai.md`.

**Không làm lại việc đã xong.** Kế hoạch `2026-10-03-ux-funnel-overhaul` đã giao 7/9 giai đoạn (LSV-74, 75, 76, 78, 80 Done; 77 và 79 chỉ chờ SePay và email thật). Plan này **giữ nguyên** các phần đó: form trang chủ một bước, cache tổng quan, cắt giữa câu có mờ an toàn, tấm mở khoá tại chỗ, nạp trong tấm, phòng chờ, nhắc khách. Plan chỉ:
1. sửa chỗ trang thật **lệch bản mẫu đã duyệt** (FD-116);
2. đổi các quyết định cũ **khi anh đồng ý** (FD-065, FD-109c/e, FD-116 phần gói năm);
3. viết lại **chữ** miễn phí và chữ mời mua;
4. làm **bố cục desktop riêng** và hoàn thiện giao diện.

## Cách duyệt: một trang HTML cho mỗi giai đoạn

Theo yêu cầu của anh, **mỗi giai đoạn bắt đầu bằng một trang HTML** (Artifact riêng tư trên claude.ai) để anh xem trên máy tính và điện thoại, bình luận hoặc chọn phương án ngay trên trang. Chỉ khi anh duyệt trang đó mới viết code thật.

| Giai đoạn | Trang HTML anh nhận được | Anh làm gì trên trang |
|---|---|---|
| 1 | Bảng 10 quyết định, mỗi mục có ảnh minh hoạ và đề xuất | Bấm Đồng ý / Không / Sửa, ghi chú |
| 2 | Ảnh trước–sau trang thật (desktop 1440, điện thoại 390) | Duyệt hoặc chỉ chỗ còn lệch |
| 3 | 3 lá số mẫu: chữ cũ và chữ mới đặt cạnh nhau | Sửa chữ trực tiếp, chọn giọng văn |
| 4 | Bản mẫu bấm được của trang lá số miễn phí mới | Bấm thử các tab, ghi chú từng khối |
| 5 | Bản mẫu bấm được của trang chọn luận giải và tấm mở khoá | Chọn cách trình bày giá, sửa câu mời |
| 6 | Báo cáo nghiệm thu có ảnh, số đo tốc độ, danh sách lỗi đã sửa | Duyệt phát hành |

Quy tắc chung cho mọi trang HTML: nạp kỹ năng `artifact-design` trước khi viết; khi trang cần lưu lựa chọn của anh thì nạp `artifact-capabilities`; dùng dữ liệu lá số mẫu tổng hợp, **không dùng ngày sinh hay tên thật** của anh hoặc khách. Lưu bản nguồn HTML vào `prototype/revamp-2026-10/` để An dùng lại khi viết code.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Bảng quyết định gốc](./phase-01-b-ng-quy-t-nh-g-c.md) | Pending |
| 2 | [Sửa lệch bản đã duyệt](./phase-02-s-a-l-ch-b-n-duy-t.md) | Pending |
| 3 | [Engine sinh chữ miễn phí v2](./phase-03-engine-sinh-ch-mi-n-ph-v2.md) | Pending |
| 4 | [Bố cục trang lá số miễn phí mới](./phase-04-b-c-c-trang-l-s-mi-n-ph-m-i.md) | Pending |
| 5 | [Trang chọn luận giải và tấm mở khoá](./phase-05-trang-ch-n-lu-n-gi-i-v-t-m-m-kho.md) | Pending |
| 6 | [Nghiệm thu và phát hành](./phase-06-nghi-m-thu-v-ph-t-h-nh.md) | Pending |

**Thứ tự:** 1 trước (nhanh, vài phút anh bấm). 2 làm ngay song song với 1 vì không cần duyệt lại. 3 sau 1. 4 và 5 sau 1, chạy song song, dùng chữ của 3 khi có. 6 chạy sau mỗi đợt phát hành.

## Mục tiêu đo được

- Desktop 1440: cột đọc 65–75 ký tự mỗi dòng, chữ thân ≥17px; trang dùng ≥80% chiều ngang khung nội dung đã duyệt; lá số đúng thiết kế sơn mài, la kinh, dấu triện.
- Không còn chữ nội dung dưới 12px; chữ thường đạt tương phản ≥4,5:1; vùng bấm ≥44px.
- Không còn món "Sắp mở/Sắp có" trên trang chọn luận giải (nếu anh duyệt mục 5).
- Mọi nút "Chưa mở" mở ra tấm có đọc thử thật của chính lá số đó (nếu anh duyệt mục 7).
- Chữ tổng quan miễn phí: không còn câu tự phủ nhận lặp lại ("không phải…", "đây không phải dự đoán…") quá 1 lần mỗi phần; mỗi đoạn có ít nhất một chi tiết riêng của lá số (tên sao, cung, độ sáng, tứ hoá).
- LCP 4G giả lập < 2,5 giây giữ nguyên; không lộ chữ của phần khoá.
- Đo phễu: tỷ lệ mở tấm xem trước và tỷ lệ mua sau 7 ngày so với 7 ngày trước khi phát hành (cửa sổ sạch, loại lượt thử nghiệm).

## Những gì KHÔNG làm trong plan này

- Không bật SePay, không gửi email thật (LSV-77, 79 giữ nguyên).
- Không đổi header/footer dùng chung (FD-100).
- Không đổi luồng tiền, ví, đơn nạp, khấu trừ 7 ngày.
- Không viết lại báo cáo trả phí (writer v4.2). Chỉ sửa chữ miễn phí và chữ mời mua.
- Không bật AI miễn phí, trừ khi anh chọn ở giai đoạn 1 (mục Q9).

## Phân công và quy tắc thực thi (Lãm chốt 07/10)

- **Frontend (UX/UI web): Lãm làm cùng Claude.** Sonnet viết, Opus chỉ review.
- **Backend / engine chữ (giai đoạn 3: thư viện câu, bộ ghép, bộ kiểm tra chữ): An làm.** Ghi trên Kaneo (ticket "GĐ3 (BE)"). Phần duyệt chữ trên trang HTML do Claude dựng cho Lãm.
- Trang HTML duyệt của từng giai đoạn do Claude dựng (không phải code sản phẩm).
- Sonnet viết code, Opus review (quy tắc của anh 30/09).
- Mọi giao diện làm cho điện thoại trước; báo anh trước khi bắt đầu viết giao diện thật.
- Mỗi việc một nhánh ngắn, PR vào `master`, test xanh, An hoặc Lãm duyệt mới merge (FD-097).
- Sau khi anh duyệt giai đoạn 1: tạo một ticket Kaneo cho mỗi giai đoạn 2–6 trong dự án "La so viet"; chỉ chuyển Done khi có bằng chứng đã phát hành và kiểm tra trên trang thật.
- Ghi mọi quyết định mới vào `rules-and-decisions-tracker.md` (FD-117 trở đi) và xoá chữ cũ mâu thuẫn trong tài liệu.

## Dependencies

- Dựa trên: `docs/superpowers/plans/2026-10-03-ux-funnel-overhaul/` (đã giao gần hết; plan.md của nó còn ghi "pending", cần cập nhật trạng thái riêng), FD-105, FD-107, FD-109, FD-110, FD-111, FD-116.
- Bản mẫu nguồn: `prototype/revamp-2026-09/la-so-ket-qua-v2*`, `la-so-ket-qua-v2-phase4-proposal.*`, `chon-luan-giai.html`, `contextual-unlock-proposal-2026-10-03.html`.
- Định hướng hình ảnh: `docs/22-art-direction.md`, `docs/24-light-theme-color-spec.md`. Giọng văn: `docs/13-brand-experience-guideline.md`, `docs/20-deep-research-ta-social-listening-handoff.md`.
- Liên quan nhưng không chặn: LSV-63 (gói tháng/năm) nếu anh chọn mở bán Vận hạn 2026 ở Q5.
