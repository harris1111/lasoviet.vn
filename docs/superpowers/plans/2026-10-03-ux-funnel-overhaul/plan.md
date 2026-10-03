---
title: "UX funnel overhaul: homepage to paid reading"
description: "Sửa toàn diện luồng khách từ form trang chủ → lá số miễn phí → chọn gói → nạp Lá → thanh toán → đọc luận giải; giá trị trước, che mờ đúng chỗ, mở khoá tại chỗ, không đứt luồng; mobile-first."
status: pending
priority: P1
branch: "claude/ui-buttons-logic-errors-9b16bb"
tags: [ux, funnel, revenue, mobile-first, fd-105, fd-108, fd-109]
blockedBy: []
blocks: []
created: "2026-10-03T07:19:11.990Z"
createdBy: "ck:plan"
source: skill
---

# Sửa toàn diện luồng khách: từ trang chủ tới đọc luận giải

## Overview

**Vì sao làm:** hôm nay (03/10) kiểm tra thấy luồng tiền đang **đứt ở nhiều chỗ**: thẻ gói không bấm chọn được, tab "Nạp Lá" không chuyển, gói "Bản mệnh 240 Lá" không có nút mua, hộp "Mở luận giải" báo "Có lỗi xảy ra", trang Nạp Lá chỉ mua được đúng 1 gói. Ngoài ra, máy chủ đã bán được 120 Lá/cung, 480 Lá/chủ đề, combo 1.300 Lá (FD-105) nhưng **giao diện không bán ở đâu cả**. Nghĩa là doanh thu hiện bị chặn ngay ở bước cuối.

**Mục tiêu:** khách nhập ngày sinh **một lần** → thấy ngay lá số + đọc được một đoạn dài thật sự đúng về mình → tới chỗ tò mò nhất thì chữ mờ dần → bấm "Mở – N Lá" **ngay tại chỗ đó** → thiếu Lá thì nạp trong cùng một tấm, quét QR → quay về **đúng đoạn đang đọc** và đã mở. Desktop và điện thoại cùng logic; thiết kế cho điện thoại trước.

**Không làm lại từ đầu.** Các quyết định đã duyệt (FD-105 bậc thang Lá, FD-108 mở dần + làm mờ, FD-109 đọc trước hỏi sau, FD-065 giá nội dung chỉ bằng Lá, FD-069 trang chủ không có giá) vẫn giữ. Plan này **lắp cho đúng và nối liền** những thứ đã có, cộng 2 điều chỉnh cần anh duyệt (mục "Cần anh quyết").

## Biên bản họp hội đồng UX/CX (03/10/2026, mô phỏng)

Thành phần: CXO, CDO, VP Design, VP UX, VP CX, Head of Design/UX/CX, Sr. Director Product Design, Sr. Director UX/UI, Sr. Director CX, Director UX Research, Director UI Design, Director CX, Principal Product Designer, Principal UX Researcher.
Tư liệu: code hiện tại (đọc trực tiếp), ảnh chụp lỗi của anh, AiTuvi đo trực tiếp hôm nay, spec 13/09, 27/09, 28/09.

**AiTuvi hôm nay (đo trực tiếp 03/10):**
- Form ở trang chủ có sẵn ô chọn "mối quan tâm" (Công việc / Quan hệ) và nút "Xem luận giải" → **ra thẳng lá số**, không qua bước trung gian.
- Trên lá số: nút "Luận giải toàn bộ (219k)" luôn ở góc trên (neo giá), 7 tab (Lá số, Luận cung, Đại vận, Tiểu vận, Nguyệt vận, Nhật vận, Chuyên đề).
- "Luận giải tổng quan miễn phí": hiện chữ "Đang luận giải…" rồi chạy ra khoảng **1.150 chữ** viết riêng cho lá số, và **cắt ngang giữa câu** đúng chỗ nói về đại vận hiện tại ("Sự hội t…"). Chỗ cắt chính là chỗ khách muốn biết nhất.
- Tab "Luận cung" của họ đang lỗi trắng trang khi mở trên trình duyệt sạch. Họ cũng có lỗ hổng; ta thắng được nếu luồng của mình **không bao giờ gãy**.

**Kết luận hội đồng (đồng thuận):**

| # | Ai nêu | Kết luận |
|---|---|---|
| 1 | CXO, VP CX | Ưu tiên số 1 là **sửa luồng tiền đang gãy** (phase 1) trước mọi thiết kế mới. Mỗi ngày gãy là mất đơn. |
| 2 | VP UX, Principal UX Researcher | Trang chủ → form → lại 3 bước wizard là **bắt khách nhập 2 lần**. Gom còn một bước: form trang chủ tạo lá số luôn; chỉ hỏi thêm cái gì thật sự thiếu, ngay trong một tấm (phase 3). |
| 3 | CDO, Sr. Dir Product Design | Phần miễn phí phải **dài và đúng như AiTuvi** (khoảng 1.000 chữ, có tên sao, cung của chính khách), rồi **mờ dần giữa câu** ở đúng chỗ nói về năm nay hoặc đại vận hiện tại (phase 4). |
| 4 | Head of CX, Principal Product Designer | Chỗ khách tò mò (một cung, một chủ đề) phải có **nút mở ngay tại đó**, không bắt sang một trang chọn gói khác rồi tìm lại. Hiện bấm "Tình duyên" lại sang trang chỉ bán Bản mệnh/Toàn diện → **đứt logic** (phase 5). |
| 5 | VP Design, Director UI Design | Trang chọn gói phải là **một bậc thang rõ ràng**: 1 cung 120 → Bản mệnh 240 → Chủ đề 480 → Trọn đời 960 (gắn nhãn "Đáng nhất") → Combo 1.300. Ghi rõ "đã mở X Lá, chỉ thêm Y Lá" để khách thấy bậc trên rẻ (phase 5). |
| 6 | Sr. Director CX, Director CX | Thiếu Lá thì **nạp ngay trong tấm mở khoá**: chọn gói, quét QR, xong tự mở và trả về đúng đoạn. Không đưa khách sang trang Nạp Lá rồi bỏ rơi họ (phase 6). |
| 7 | Director UX Research | Lỗi phải nói được là lỗi gì và có nút "Thử lại". Không có số liệu từng bước thì không biết sửa có ăn tiền không → đo trước (phase 2). |
| 8 | Head of UX | Sau khi trả tiền: màn chờ phải có việc để đọc, và trong bài đọc có bước tiếp theo để mua (nâng cấp, combo năm nay, hội viên) (phase 7). |
| 9 | VP CX | Khách bỏ dở lúc quét QR là tiền nằm sẵn trên bàn → nhắc lại một lần, giữ nguyên đơn (phase 8). |

## Hành trình đích (một luồng, điện thoại trước)

```
Trang chủ: nhập ngày, giờ, giới tính, (mối quan tâm) → [Xem lá số của tôi]
   ↓ (không qua wizard; thiếu gì hỏi ngay trong 1 tấm)
Lá số miễn phí: lá số 12 cung + điểm 12 cung
   → đọc tổng quan dài ~1.000 chữ, có tên sao, cung thật
   → 1 cung khớp mối quan tâm đọc trọn
   → đoạn "Năm nay / Đại vận hiện tại": 2-3 câu thật, rồi MỜ giữa câu
        [Mở đoạn này trong Vận hạn 2026 – 480 Lá]  (mở tại chỗ)
   → bản đồ cung và chủ đề bị khoá: bấm → tấm xem trước mờ + [Mở – N Lá]
   → hết phần miễn phí → khối "Bạn đã đọc xong" → [Chọn gói luận giải]
   ↓
Tấm mở khoá (dialog trên desktop, kéo lên từ đáy trên điện thoại)
   Đủ Lá:  giá · số dư · còn lại → [Mở ngay]
   Thiếu:  "Thiếu 620 Lá" → chọn gói (gói nhỏ nhất đủ được chọn sẵn, gói "đáng nhất" bên cạnh)
           → [Nạp 99.000đ và mở] → QR ngay trong tấm (điện thoại: nút mở app ngân hàng)
           → tiền về → tự mở → đóng tấm → cuộn tới đoạn vừa mở
   ↓
Đọc luận giải: phần vừa mua mở ngay (hoặc màn chờ có thứ để đọc)
   → giữa bài: "Bạn đã mở 4/12 phần" + nâng cấp còn thêm Y Lá
   → cuối bài: combo năm nay / hội viên
```

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Money-path hotfix](./phase-01-money-path-hotfix.md) | Pending |
| 2 | [Funnel measurement baseline](./phase-02-funnel-measurement-baseline.md) | Pending |
| 3 | [One-step entry homepage to chart](./phase-03-one-step-entry-homepage-to-chart.md) | Pending |
| 4 | [Value-first free result and blurred cliffhangers](./phase-04-value-first-free-result-and-blurred-cliffhangers.md) | Pending |
| 5 | [Contextual unlock and offer page rebuild](./phase-05-contextual-unlock-and-offer-page-rebuild.md) | Pending |
| 6 | [In-context top-up and payment return](./phase-06-in-context-top-up-and-payment-return.md) | Pending |
| 7 | [Waiting room reader and post-purchase upsell](./phase-07-waiting-room-reader-and-post-purchase-upsell.md) | Pending |
| 8 | [Recovery loops](./phase-08-recovery-loops.md) | Pending |
| 9 | [End-to-end QA and staged rollout](./phase-09-end-to-end-qa-and-staged-rollout.md) | Pending |

**Thứ tự giao:** 1 → 2 chạy ngay (phase 1 là sửa lỗi, không cần chờ duyệt thiết kế). 3, 4, 5 làm song song sau khi anh duyệt 2 điểm bên dưới. 6 sau 5. 7, 8 sau 6. 9 chạy theo từng đợt giao.

## Cần anh quyết (một lần duyệt cho cả plan)

1. **Nút mở ngay tại chỗ tò mò (sửa FD-109c/d).** FD-109 hiện cho phép tấm xem trước chỉ có *một* nút dẫn sang trang chọn gói. Hội đồng đề nghị: trong tấm xem trước của một cung hoặc chủ đề, nút chính là **"Mở cung này – 120 Lá"** (hoặc "Mở Tình duyên – 480 Lá"), nút phụ là "Xem trọn đời 960 Lá". Thân trang miễn phí **vẫn không có giá** (giữ FD-109a). Đề xuất: **đồng ý**.
2. **Bỏ wizard 3 bước sau form trang chủ.** Form trang chủ tạo lá số luôn; bước đồng ý dữ liệu gộp thành một dòng ngay dưới nút (khách vẫn phải tự bấm đồng ý, không đánh dấu sẵn, theo Nghị định 13); "Xem cho người khác" chỉ hiện ô đồng ý riêng khi khách chọn. Wizard chỉ còn dùng khi khách vào thẳng `/tao-la-so`. Đề xuất: **đồng ý**.

Phần còn lại nằm trong các quyết định đã duyệt, không cần duyệt thêm.

## Lưu ý: món nào bán được ngay

Theo danh mục sản phẩm trong code (03/10):
- **Bán được ngay** (máy chủ đã bật): 12 cung lẻ (120 Lá mỗi cung), Bản mệnh (240 Lá), Tử Vi trọn đời (960 Lá). Riêng 12 cung lẻ thì giao diện chưa có chỗ nào bán.
- **Chưa bật** (nội dung chưa sẵn): Tình duyên, Công việc (480 Lá), Vận hạn 2026 (480 Lá), Combo 1.300 Lá, Hôm nay, Tháng này, Hội viên. Plan sẽ hiện các món này là "Sắp mở". Khi kế hoạch LSV-58 bật món nào thì nút mua của món đó tự hiện, không phải sửa giao diện.
- Vì vậy, đoạn che mờ "Năm 2026 / đại vận" trong phase 4 tạm dẫn tới **Tử Vi trọn đời 960 Lá**, vì gói này đã có phần đại vận. Khi Vận hạn 2026 được bật thì đoạn này chuyển sang bán gói 480 Lá.

## Rủi ro chính

- **Lỗi "Có lỗi xảy ra" chưa có chẩn đoán chắc chắn.** Phase 1 thêm mã lỗi và nhật ký để lần sau thấy ngay; nghi phạm số 1 là lệnh mua cũ bị kẹt khi lá số đổi phiên bản.
- **Chi phí AI miễn phí tăng nếu bản tổng quan dài.** Giữ trần FD-109a (3.000đ/lá số, 50.000đ/ngày); nội dung tạo một lần rồi lưu lại, xem lại không tốn thêm.
- **Nạp ngay trong tấm** đụng tới luồng tiền: chỉ dùng lại đơn nạp và cơ chế "nạp xong tự mở" đã có (FD-105 1.1/1.2), không viết luồng tiền mới.

## Dependencies

- Builds on: `docs/superpowers/specs/2026-09-27-la-ladder-funnel-design.md` (FD-105), `docs/superpowers/specs/2026-09-28-free-result-page-design.md` (FD-108/109/109a), `docs/superpowers/specs/2026-09-13-progressive-reveal-la-credits-and-conversion-ui-design.md` §5–§8, `docs/superpowers/specs/2026-09-13-aituvi-ui-adaptation-for-lasoviet.md` (FD-091).
- Overlaps with: `docs/superpowers/plans/2026-09-27-la-ladder-funnel-implementation.md` (packages 1.2/1.3: this plan finishes the web side of 1.2 and the per-palace/topic selling of 1.3), `docs/superpowers/plans/2026-10-02-free-result-chatgpt-ux-review-handoff.md` (its findings feed phase 4).
- Kaneo: create one task per phase in project `La so viet` after sign-off.
- Execution rule: Sonnet writes code, Opus reviews; every UI phase is mobile-first and the founder is told before UI work starts.
