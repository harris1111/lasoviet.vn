# Trời Nam Homepage — Plan 2 brief (for ChatGPT)

> Bàn giao cho ChatGPT (Work, có kết nối git chỉ đọc tới repo `lasoviet.vn`, nhánh `feat/troi-nam-homepage`). Đọc trực tiếp mọi file nêu tên dưới đây qua kết nối git, không cần dán nội dung vào đây.

## Nguyên tắc bắt buộc — đọc trước khi viết bất kỳ dòng nào

1. **Khoá theo mẫu có sẵn, không viết mới từ kiến thức Next.js chung.** `apps/web/AGENTS.md` (đã có trong repo, đọc trước) cảnh báo bản Next.js này bị sửa khác bản gốc. Tài liệu nội bộ giải thích rõ nằm ở `node_modules/next/dist/docs/` nhưng thư mục đó **không nằm trong git nên bạn không đọc được**. Vì vậy: **chỉ dùng API, cú pháp, quy ước đã thấy trong các file `.tsx`/`.ts` đang có của repo này** (liệt kê ở bảng dưới). Không tự thêm `next/image`, không tự đổi cách khai báo `params`, không dùng API nào bạn không thấy ai trong repo dùng trước.
2. **Không viết lại logic đã có.** Nhiệm vụ Plan 2 là "khoác áo mới" (đổi giao diện, đổi ảnh nền) cho các khối đã chạy tốt trên trang chủ hiện tại, **không phải viết lại từ đầu**. Với mỗi khối, import thẳng component gốc (`Homepage3V*`) y như `apps/web/src/features/troi-nam/troi-nam-hero.tsx` đã làm với `HomepageV3BirthForm` — đó là ví dụ mẫu, đọc file đó trước tiên.
3. **Không thêm màu, font, thư viện mới.** Chỉ dùng biến đã có trong `apps/web/src/styles/tokens.css` (các biến `--lacquer-*`, `--gold-*`, `--pearl-*`, `--son`) và `apps/web/src/styles/troi-nam.css` (các biến `--tn-*`). Không `npm install` gì thêm.
4. **Mobile-first.** Viết CSS cho điện thoại trước, thêm `@media (min-width: 880px)` sau, giống cấu trúc đang có trong `troi-nam.css`.
5. **Không tự bịa nội dung.** Copy tiếng Việt lấy nguyên văn từ `apps/web/messages/vi/homepage-v3.json` (đã duyệt) — không viết câu mới. Nếu một khối cần khoá tiếng Anh mới, thêm cùng cấu trúc key vào `apps/web/messages/en/troi-nam.json`.
6. **Nội dung cấm** (đã có trong `docs/13-brand-experience-guideline.md` §4.5): không nói "chết", "thọ yểu"; không mời mua lễ giải hạn; không số liệu bịa; không giá giả/đếm ngược giả. Plan 2 chỉ đổi giao diện nên hầu như không chạm nội dung, nhưng nếu phải viết câu mới thì tránh các điều trên.

## File tham khảo bắt buộc đọc trước (đã có trong repo)

| File | Vì sao đọc |
|---|---|
| `apps/web/AGENTS.md`, `CLAUDE.md` | Quy tắc repo, cảnh báo Next.js |
| `apps/web/src/features/troi-nam/troi-nam-hero.tsx` | **Mẫu chuẩn** cho cách một khối Trời Nam bọc quanh component v3 có sẵn |
| `apps/web/src/features/troi-nam/troi-nam-assets.ts` | Cách lấy đường dẫn ảnh: `troiNamAsset("L03")` |
| `apps/web/public/images/troi-nam/manifest.json` | Danh sách toàn bộ ảnh sẵn có và kích thước |
| `apps/web/src/styles/troi-nam.css` | Token và style đã có, style mới nối tiếp vào cuối file này |
| `apps/web/src/app/[locale]/troi-nam/page.tsx` | Trang sẽ được nối thêm các khối mới vào `<main>` |
| Từng file `homepage-v3-<tên khối>.tsx` trong bảng bên dưới | Component gốc cần bọc lại, giữ nguyên logic bên trong |
| `apps/web/messages/vi/homepage-v3.json` | Nguồn copy tiếng Việt đã duyệt |
| `apps/web/src/i18n/request.ts` | Cách đăng ký thêm khoá dịch (đã có `troi-nam` namespace, xem cách `homepage-v3` được đăng ký) |

## 10 khối cần làm, theo đúng thứ tự xuất hiện trên trang

Với mỗi khối: tạo file mới `apps/web/src/features/troi-nam/troi-nam-<tên>.tsx` bọc quanh component v3 gốc (như `troi-nam-hero.tsx` đã làm), thêm CSS tương ứng vào cuối `troi-nam.css`, dùng `troiNamAsset(...)` để lấy ảnh nền/vật thể.

| # | Tên file mới | Component v3 gốc (giữ nguyên, chỉ bọc) | Ảnh có thể dùng (chọn phù hợp, không bắt buộc dùng hết) |
|---|---|---|---|
| 1 | `troi-nam-story.tsx` | `homepage-v3-static-sections.tsx` → `HomepageV3Story` | `L03` (chạng vạng chuyển đêm) hoặc `T10` (tranh sơn mài) làm nền |
| 2 | `troi-nam-ticker.tsx` | `homepage-v3-static-sections.tsx` → `HomepageV3Ticker` | không cần ảnh, chỉ đổi màu chữ/nền theo token `--tn-*` |
| 3 | `troi-nam-explore.tsx` | `homepage-v3-explore.tsx` → `HomepageV3Explore` (đồ hình 12 cung — **không sửa logic tương tác bên trong**) | `P01` (vòng trống đồng) làm vòng trang trí quanh đồ hình; `T01` làm nền khối |
| 4 | `troi-nam-needs.tsx` | `homepage-v3-needs.tsx` → `HomepageV3Needs` | `S01`–`S04` (4 tranh đúng 4 nỗi lo: hiểu bản thân/tình duyên/công việc/năm nay) làm ảnh minh hoạ mỗi thẻ; `I02.thau-hieu-chinh-minh`, `I02.tinh-duyen`, `I02.cong-viec-tien-bac`, `I02.nam-nay` làm icon |
| 5 | `troi-nam-compare.tsx` | `homepage-v3-compare.tsx` → `HomepageV3Compare` | `T08` (giấy dó) làm nền nhẹ phía sau bảng, hoặc giữ nền tối đơn giản |
| 6 | `troi-nam-testimonials.tsx` | `homepage-v3-testimonials-section.tsx` → `HomepageV3Testimonials` | Đổi ảnh đại diện: dùng `troiNamAsset("C00")`…`troiNamAsset("C14")` thay cho sprite ghép cũ — đọc kỹ `homepage-v3-testimonials.ts` để biết cách map id người đọc → mã ảnh (biến `AVATAR_IMAGE`/`AVATAR_CELL` đã có, có thể cần thêm C01–C14 vào `AVATAR_IMAGE` để dùng ảnh mới thay vì sprite cũ) |
| 7 | `troi-nam-usp.tsx` | `homepage-v3-static-sections.tsx` → `HomepageV3Usp` | `P02` (bộ hoạ tiết Đông Sơn: chim/hươu/thuyền/xoắn ốc/sao) — chọn 4 hoạ tiết hợp nghĩa cho 4 thẻ |
| 8 | `troi-nam-value.tsx` | `homepage-v3-static-sections.tsx` → `HomepageV3Value` | `E01.la-vang-mat-truoc-*` (lá vàng "Lá") làm icon 3 bước; `I02.la-so-mien-phi`, `I02.luu-la-so`, `I02.mo-bang-la` |
| 9 | `troi-nam-faq.tsx` | `homepage-v3-faq.tsx` → `HomepageV3Faq` | không cần ảnh, giữ đơn giản |
| 10 | `troi-nam-about.tsx` | `homepage-v3-static-sections.tsx` → `HomepageV3About` | `T04` hoặc `T10` (tranh sơn mài) làm ảnh minh hoạ; `O01` hoặc `L06` (Hội An hoa đăng) làm nền khối mời gọi cuối trang |

Sau khi có đủ 10 file, cập nhật `apps/web/src/app/[locale]/troi-nam/page.tsx`: import và render đúng thứ tự trên vào trong `<main>`, sau `<TroiNamHero />`, mỗi khối bọc trong `<section className="tn-section" data-troi-nam-block="<tên>">`.

## Lô giao việc (gửi từng dòng một, giống cách làm ảnh trước đây)

| Lô | Khối |
|---|---|
| `PLAN2-A` | 1 Story, 2 Ticker, 3 Explore |
| `PLAN2-B` | 4 Needs, 5 Compare |
| `PLAN2-C` | 6 Testimonials, 7 Usp |
| `PLAN2-D` | 8 Value, 9 Faq, 10 About |
| `PLAN2-E` | Cập nhật `page.tsx` để ráp đủ 10 khối theo thứ tự |

## Mỗi lô giao nộp

- Toàn bộ nội dung file mới/sửa, đóng gói tải về được (giống cách đã giao ảnh: mỗi file một mục tải về, cộng 1 file zip `troi-nam-plan2-<LÔ>.zip`).
- Một bảng tự kiểm tra cho từng file: (a) chỉ import những gì đã thấy trong repo — liệt kê rõ đã đọc file tham khảo nào; (b) không thêm biến màu/spacing mới ngoài token `--tn-*`/`--lacquer-*`/`--gold-*`; (c) có nhánh `@media (min-width: 880px)` riêng cho desktop; (d) mọi chữ tiếng Việt lấy nguyên văn từ `homepage-v3.json`, không bịa câu mới; (e) không đổi logic bên trong component v3 gốc, chỉ bọc thêm bên ngoài.
- Nếu một khối không rõ nên map ảnh nào, chọn phương án hợp lý nhất trong danh sách gợi ý ở bảng trên và ghi rõ lý do chọn — không tự tạo mã ảnh mới không có trong `manifest.json`.

## Không thuộc phạm vi Plan 2 (không làm)

- Không thêm chuyển động cuộn trang, không thêm Three.js/GSAP (đó là Plan 3–4).
- Không tự chạy `pnpm build`/`pnpm test` để "xác nhận" — không có môi trường chạy, chỉ cần code đúng theo mẫu. Việc chạy thử và đo layout thật do phía repo (Claude Code) làm sau khi nhận file.
- Không tự ý xoá hay sửa các khối/route khác của trang chủ hiện tại (`apps/web/src/app/[locale]/page.tsx` gốc) — chỉ động vào các file mới trong `troi-nam/` và `troi-nam/page.tsx`.
