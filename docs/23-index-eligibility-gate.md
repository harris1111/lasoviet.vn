---
title: Lá Số Việt — Cổng điều kiện cho phép index
version: 1.0
status: founder-approved
date: 2026-09-20
scope: điều kiện để một trang bộ môn chuyển từ noindex sang indexable
depends_on:
  - docs/20-deep-research-ta-social-listening-handoff.md
  - docs/14-sitemap-seo-wireframes.md
  - config/route-registry.yml
---

# 23 — Cổng điều kiện cho phép index

## 0. Đọc mục này trước, rồi dừng

**Ưu tiên hiện tại là làm luồng Tử Vi cho thật tốt. Không khởi động bộ môn
khác.** Engine và spec cho Bát Tự, Kinh Dịch, Chiêm Tinh, Thần Số Học sẽ do
founder và An build lần lượt ở các phase sau.

Nếu bạn là agent và đang định đề xuất build một bộ môn mới, viết spec cho nó,
hay bật index cho trang của nó: **đừng.** Tài liệu này tồn tại để bạn không
phải hỏi lại, và để không ai vô tình bật index sớm.

## 1. Vì sao có tài liệu này

12 trang bộ môn và tiện ích đang ở trạng thái `live_noindex` trong
`config/route-registry.yml` (`preview_defaults`). Đây là **quyết định có chủ
ý**, không phải việc bị bỏ quên:

```
/bat-tu   /kinh-dich   /chiem-tinh   /than-so-hoc   /boi-bai
/12-con-giap   /lich-am   /ngay-tot   /giai-ma-giac-mo
/phong-thuy/huong-nha   /xem-chi-tay   /cong-cu-mien-phi
```

Các trang này **đã được dựng đầy đủ** (React, không phải MDX — xem
`apps/web/src/features/discipline-pages/` và `features/free-tools/`), có hero,
mô tả phương pháp, hồ sơ mẫu, glossary và disclaimer trung thực, gắn nhãn
"Sắp ra mắt" mà không giả form hay giả kết quả tính toán (đúng D-024).

Chúng chưa được index vì **chưa có engine tính thật**. Bật index cho một trang
"sắp ra mắt" là tự bắn vào chân: Google đánh giá thin content, và rủi ro đó lan
sang toàn bộ domain, kể cả các trang Tử Vi đang làm ra tiền.

## 2. Hiện trạng index

| Nhóm | Số route | Trạng thái |
|---|---:|---|
| Tử Vi + trang nền tảng (brand, phương pháp, kiến thức, trust) | 26 | `live_indexable` |
| `/du-bao-cung-hoang-dao` | 1 | `live_indexable` (FD-025) |
| Bộ môn & tiện ích chờ engine | 12 | `live_noindex` |
| Route dự trữ, chưa dựng | 48 | `reserved` |
| Route cũ, 301 | 7 | `archived` |
| Trang riêng tư (tài khoản, thanh toán, admin) | 15 | `private` |

## 3. Năm điều kiện để bật index

Một trang bộ môn chỉ được chuyển `live_noindex` → `live_indexable` khi **đạt
đủ cả năm**. Thiếu một điều là chưa đạt; không có ngoại lệ "gần đủ".

1. **Engine tính thật đã chạy.** Có adapter trong
   `packages/engine-adapters`, sinh ra chart chuẩn hoá, có fixture kiểm thử và
   đối chiếu chéo. Người dùng nhập dữ liệu sinh thật và nhận kết quả tính thật.
2. **Không còn bất kỳ nội dung "sắp ra mắt" nào trên trang.** Không nhãn, không
   hồ sơ mẫu thay cho kết quả thật, không CTA dẫn sang bộ môn khác vì bộ môn
   này chưa chạy.
3. **Nội dung đạt cổng biên tập.** Theo luật viết trong
   `docs/20-deep-research-ta-social-listening-handoff.md`: nói được căn cứ của
   từng nhận định, không hù doạ, không hứa chắc chắn về tương lai, không văn
   chung chung đúng với mọi người.
4. **Mọi tuyên bố công khai có bằng chứng.** Nếu trang phát biểu điều gì về
   phương pháp, độ chính xác, quyền riêng tư, giá hay hoàn tiền, tuyên bố đó
   phải nằm trong `config/claims.json` với `sourceExcerpts` thật và
   `scripts/public-claim-check.mjs` chạy sạch.
5. **Có đủ độ sâu để xếp hạng.** Trang phải trả lời được truy vấn mà nó nhắm
   tới tốt hơn kết quả top hiện có, không chỉ tồn tại để chiếm URL.

## 4. Cách bật

Đổi `<<: *preview_defaults` thành `<<: *public_defaults` cho route đó trong
`config/route-registry.yml`. Thao tác này đồng thời bật `index,follow` và đưa
route vào sitemap.

Đây là **thay đổi có ảnh hưởng SEO trên toàn domain**, thuộc nhóm phải có cả
Harris và An cùng review theo `docs/15-collaboration-branch-workflow.md`. Ghi
rõ trong PR: đã đạt điều kiện nào, bằng chứng ở đâu.

## 5. Thứ tự khi đến lúc mở rộng

Chưa phải bây giờ. Khi founder quyết định mở rộng, thứ tự theo đòn bẩy kỹ
thuật đã chốt ở `docs/11` (D-018), không theo volume:

- **Thần Số Học** rẻ nhất — không phụ thuộc engine ngoài nào (D-019).
- **`mingyu` (MIT)** mở khoá **Bát Tự + Kinh Dịch cùng một lần** tích hợp.
- **Chiêm Tinh** cần Celestine (FD-013) và phải rà license trước.

Nhóm tiện ích miễn phí (`/12-con-giap`, `/lich-am`, `/ngay-tot`,
`/giai-ma-giac-mo`, `/boi-bai`, `/phong-thuy/huong-nha`) không cần engine lá
số, nên có thể đạt điều kiện sớm hơn các bộ môn — nhưng vẫn phải qua đủ năm
điều kiện ở §3, đặc biệt điều kiện 5.

## 6. Việc đang làm — luồng Tử Vi

Tất cả năng lực hiện tại dồn vào đây. Tử Vi là bộ môn duy nhất có engine thật
(`iztro` 2.6.0), có báo cáo trả phí, và là 26/27 trang đang được index. Mọi
cải thiện về conversion, chất lượng báo cáo, và trải nghiệm sau mua đều thuộc
phạm vi này cho đến khi founder nói khác.
