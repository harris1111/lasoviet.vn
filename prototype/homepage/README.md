# Lá Số Việt — Homepage handoff

Gói làm việc này chứa homepage đã tích hợp đủ 12 hình ảnh final, cùng art direction và prompt gốc để tiếp tục phát triển với Claude.

## Cấu trúc

- `homepage.html`: homepage hiện tại, dùng custom elements/template syntax như `x-dc`, `sc-for`, `sc-if` và binding `{{ ... }}`.
- `support.js`: runtime hỗ trợ cho file HTML.
- `uploads/`: 12 WebP đang được tham chiếu trong homepage.
- `docs/art-direction.md`: art direction thương hiệu.
- `docs/image-prompts.md`: bộ prompt hình ảnh homepage.

## Quy ước quan trọng

- Giữ nguyên đường dẫn tương đối `uploads/<filename>.webp` nếu không thay đổi cấu trúc thư mục.
- Hero và CTA dùng `<picture>` với asset desktop/mobile riêng.
- Không thay chữ hoặc ký tự trên các lá số bằng nội dung do AI tự sinh. Hệ 12 Địa Chi cần chính xác.
- Ngôn ngữ thị giác: tàng thư tri thức Việt đương đại; sơn mài đen nâu, đồng cũ, vàng nhạt và một điểm son; tránh mỹ học huyền bí horoscope/tarot.

## Asset map

| Module | Asset |
| --- | --- |
| Hero desktop | `menh-thu-khai-quang-hero-lasoviet-desktop.webp` |
| Hero mobile | `menh-thu-khai-quang-hero-lasoviet-mobile.webp` |
| Lá số miễn phí | `la-so-mien-phi-ba-diem-noi-bat-co-can-cu-homepage.webp` |
| Quy trình 01 | `lich-phap-can-chi-quy-doi-du-lieu-sinh-homepage.webp` |
| Quy trình 02 | `an-dinh-la-so-tu-vi-12-cung-homepage.webp` |
| Quy trình 03 | `chon-chu-de-luan-giai-sau-ho-so-tang-thu-homepage.webp` |
| Nền luận giải sâu | `tang-thu-chu-de-luan-giai-sau-background-homepage.webp` |
| Kiến thức: Lá số là gì | `cau-truc-la-so-tu-vi-12-cung-la-gi-homepage.webp` |
| Kiến thức: Cách lập | `quy-trinh-lap-la-so-tu-vi-tu-lich-phap-homepage.webp` |
| Kiến thức: Cách đọc | `cach-doc-moi-lien-he-giua-cac-cung-la-so-tu-vi-homepage.webp` |
| CTA desktop | `nguong-mo-menh-thu-cta-background-lasoviet-desktop.webp` |
| CTA mobile | `nguong-mo-menh-thu-cta-background-lasoviet-mobile.webp` |

## Trạng thái kiểm tra

- 12/12 asset được tham chiếu trong `homepage.html`.
- 12/12 file tồn tại trong `uploads/`.
- Không còn tham chiếu tới các hình placeholder cũ trong homepage.
- Ảnh quy trình 03 là portrait; homepage đang crop có chủ đích bằng `object-fit: cover` và `object-position`.
