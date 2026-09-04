# Logo Lá Số Việt — bộ file chính thức

**Trạng thái:** chốt bởi Harris/Product ngày 2026-09-04, vẽ bởi Claude Design.
**Bản locked:** `source/lasoviet-logomark-colophon-v5.dc.html` ("Logomark Colophon v5").
Toàn bộ file trong thư mục này được **sinh tự động từ hình học của bản v5** —
không có toạ độ nào chỉnh tay ngoài file nguồn. Xem quy trình vẽ đầy đủ (các
vòng đã loại, tiêu chí nghiệm thu, PHẦN SỬA) tại
[`docs/18-claude-design-logo-handoff.md`](../../docs/18-claude-design-logo-handoff.md).

## Mark là gì

Chữ **V** (Việt) dựng cân, hai cánh cùng độ dài, gặp nhau ở đỉnh nhọn bo nhẹ.
Đầu cánh trái nở thành hình **lá** (Lá) — vệt đỏ son bên trong là sống lá.
Bao quanh là vòng thiên bàn (ký hiệu ngành luận mệnh), khuyết đúng hai cung
30° ở hai chỗ đầu cánh chữ chạm tới — vòng và chữ chia sẻ vật liệu, không
phải "chữ đặt trong khung". Chi tiết đầy đủ và hệ tỉ lệ: mục "Lớp chữ / Lớp
ngành" trong `source/lasoviet-logomark-colophon-v5.dc.html`.

## Cây thư mục

```
svg/       — mọi biến thể logomark, lockup, chữ hiệu (vector, dùng cho web/in ấn)
png/       — bản raster đã dựng sẵn nhiều cỡ, nền trong suốt (trừ app icon)
favicon/   — favicon.ico, favicon.svg, các cỡ PNG, apple-touch-icon, site.webmanifest
social/    — ảnh chia sẻ mạng xã hội (OG) 1200×630, SVG nguồn đi kèm
source/    — bản Claude Design đã chốt (.dc.html) + support.js + license font, để đối chiếu
build-logo-assets.py — script sinh toàn bộ asset ở trên từ source/
```

## Dùng file nào

| Tình huống | File |
|---|---|
| Header website, nền tối | `svg/lasoviet-logo-ngang-vang-son.svg` |
| Mark đứng riêng, nền tối | `svg/lasoviet-logomark-vang-son.svg` (≥32px) hoặc `svg/lasoviet-logomark-co-nho-vang-son.svg` (<32px, nét đậm hơn để không mất chi tiết) |
| Nhúng inline, tự chỉnh màu bằng CSS | `svg/lasoviet-logomark-currentcolor.svg` / bản `co-nho-currentcolor` |
| In một màu / khắc / đặt trên ảnh | các file `-mot-mau-kem` |
| Nền sáng / giấy | các file `-dao-muc` (mực #14263D) |
| Ảnh chia sẻ mạng xã hội, thumbnail | `social/lasoviet-og-image-1200x630.png` |
| Favicon | copy cả thư mục `favicon/` vào gốc web, xem `<head>` mẫu bên dưới |
| App icon / PWA | `png/lasoviet-app-icon-1024.png`, `png/lasoviet-app-icon-512.png` |
| Kiểm tra tỉ lệ / dựng hình | `svg/lasoviet-logomark-ban-dung-hinh.svg` — chỉ để tham khảo, KHÔNG dùng làm logo |
| Chữ hiệu đứng riêng (không mark) | `svg/lasoviet-chu-hieu-kem.svg` / `-muc.svg` |

Thẻ `<head>` mẫu cho favicon:

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
```

## Lockup — thông số

- **Ngang** (header): mark cao 26px, cách chữ 12px, chữ "Lá Số Việt" Source
  Serif 4 20px/600, letter-spacing 0.01em. Canh theo trục thị giác (giữa mark
  trùng giữa cap-height chữ), không canh theo hộp bao.
- **Dọc** (mạng xã hội): mark trên, chữ hoa rộng chữ dưới, canh giữa theo bề
  ngang phần có mực (không theo hộp bao).
- **Khoảng thở tối thiểu** quanh lockup = chiều cao chữ "L" viết hoa. Xem sơ đồ
  `svg/lasoviet-logo-khoang-tho.svg`.
- **Cỡ tối thiểu:** mark đứng riêng 20px; lockup ngang rộng 120px. Dưới 32px
  luôn dùng biến thể `co-nho` (nét đậm hơn, tương phản mảnh/đậm giảm còn
  ~2.4:1 để sống lá trong hình lá không biến mất).

## Cấm — luật thương hiệu

Không xoay, không lật, không nghiêng, không đổi tỉ lệ mark/chữ, không đổi màu
chi tiết son sang màu khác ngoài #CE5B45 (trừ bản một-màu/đảo), không thêm
viền hay nền tròn quanh mark (trừ app icon), không đặt lên nền hoạ tiết rối,
không tự vẽ lại nét — mọi biến thể mới phải sinh lại từ `source/`.

## Regenerate

```bash
python3 -m venv .venv && .venv/bin/pip install fonttools uharfbuzz Pillow
brew install librsvg imagemagick   # rsvg-convert, magick
.venv/bin/python brand/logo/build-logo-assets.py
```

Script tự tải Source Serif 4 (Adobe, OFL) vào `.build-cache/` nếu chưa có,
rồi xoá cache sau khi build xong — không có gì phát sinh ngoài các thư mục ở
trên. Sửa hình thì sửa toạ độ trong phần "hình học (chép từ v5)" ở đầu script,
chép nguyên văn từ bản Claude Design mới, không tự nắn tay.
