# Prompt tạo icon "Lá" (đơn vị tiền trong Lá Số Việt)

Dùng cho ChatGPT (tạo ảnh). Mọi ảnh xong phải đổi tên SEO viết thường có gạch ngang trước khi đưa vào web (docs/22 mục 0).

## Ý tưởng
"Lá" vừa là chiếc lá, vừa là đơn vị tiền của Lá Số Việt, vừa nằm trong chữ "lá số". Biểu tượng: **một chiếc lá nhọn, gân khắc, đặt trong vòng đôi có hạt tròn kiểu mặt trống đồng Đông Sơn**. Vòng tròn làm nó đọc ra là "đồng tiền", chiếc lá làm nó đọc ra là "Lá". Hợp với bộ ảnh đã duyệt (vòng huy hiệu, dấu triện, hoa văn Đông Sơn). Không dùng đồng tiền lỗ vuông kiểu Trung Hoa.

## Ảnh mẫu đính kèm khi gen
Đính kèm vòng vàng đã duyệt `mau-1-vong-12-phan-trang-chu.png` (hoặc `vong-huy-hieu-cung-nang-do-lasoviet.png`) làm STYLE REFERENCE, như các lần trước.

## Prompt 1: biểu tượng chính (dùng ở tấm mở khoá, thẻ lớn, ví)
```
Use the attached gold ring as the STYLE REFERENCE (Vietnamese Dong Son bronze-drum band: concentric circles, small bead dots, engraved double outlines). Design ONE ICON MARK for a currency unit called "La" (Vietnamese for "leaf").

Subject: a single pointed-oval LEAF, slightly asymmetric with a gentle S-curve toward the tip, a short curved stem at the lower left, tilted so the tip points to the upper right. Engraved center vein and exactly three pairs of side veins, clean geometric lines. The leaf sits inside a thin DOUBLE RING (two parallel circles close together). Between the two circles run small evenly spaced bead dots, like the Dong Son drum rim. Nothing else.

Canvas: 1024 x 1024 px, perfectly centered, about 10 percent empty margin all around. Perfectly symmetrical ring, leaf optically centered.

Line quality: crisp engraved etching on lacquer, consistent stroke weight (about 14 px at 1024), rounded line ends, clean geometric construction, not calligraphic, not hand-drawn wobble.
Colors: pure white lines (#FFFFFF) on a flat pure black background (#000000). Only these two colors. No grey pixels, no anti-glow.

It must stay recognizable when scaled down to 64 px wide.

Strictly avoid: Chinese or Japanese coin with a square hole, Chinese cloud scrolls, dragons, phoenix, lotus, bamboo, Victorian or Baroque ornaments, flowers, hearts, sparkles, any text, letters, numbers, currency symbols, gradients, glow, shadow, 3D, texture, photo realism.
```

## Prompt 2: glyph nhỏ (đứng cạnh số giá, cỡ chữ 16 đến 24 px: "480 [lá]")
```
Use the attached gold ring only as a loose STYLE REFERENCE for line character. Design a SMALL UI GLYPH of one LEAF for use next to prices at 16 to 24 px.

Subject: the same pointed-oval leaf as the main mark (gentle S-curve, short curved stem at lower left, tip to the upper right), but SIMPLIFIED: a solid filled leaf silhouette with a single engraved center vein cut out in black and only two short side veins cut out. NO ring, NO bead dots.

Canvas: 512 x 512 px, centered, about 8 percent margin. Bold shapes only: the thinnest cut-out line must be at least 22 px wide so it survives shrinking to 16 px.
Colors: pure white shape (#FFFFFF) on flat pure black (#000000). Only these two colors, hard edges, no grey.

Strictly avoid: ring, beads, text, numbers, gradients, glow, shadow, 3D, texture, flowers, lotus, Chinese motifs.
```

## Prompt 3 (tuỳ chọn): bản vàng nổi để làm khoảnh khắc "Đã mở"
```
Use the attached gold ring as the STYLE REFERENCE for the metal, engraving and mood. Render the same ICON MARK (a pointed-oval leaf with engraved center vein and three pairs of side veins, inside a thin double ring with small bead dots between the rings, leaf tip pointing to the upper right) as a polished engraved GOLD MEDALLION on dark lacquer.

Look: warm antique gold, soft raking light from the upper left, crisp engraved highlights on the rim, restrained and elegant, like the approved gold ring. Background: deep black-brown lacquer, flat, almost no texture, so the medallion can be cut out cleanly.

Canvas: 1536 x 1536 px, medallion centered with about 12 percent margin. Square composition, nothing else in the frame.

Strictly avoid: text, numbers, a square coin hole, Chinese motifs, lotus, flowers, sparkles, lens flare, heavy glow, multiple coins, hands, people, extra props, watermark.
```

## Kiểm kê: chỗ nào trong luồng Lá và thanh toán cần icon

Em đã rà toàn bộ luồng (trang chọn luận giải, tấm mở khoá, nạp trong tấm, VietQR, hoàn tất nạp, tài khoản, trang Nạp Lá, trang chủ). Hiện **không có icon Lá nào xuyên suốt**: chỗ nào cũng chỉ viết chữ "Lá", ngoài hai nét vẽ đường viền đơn giản cũ (`la-balance` dùng ở bảng so sánh Trời Năm, `gift-la`) chưa gắn vào luồng thanh toán.

| # | Chỗ trong luồng | Hiện tại | Cần | Cỡ |
|---|---|---|---|---|
| 1 | Giá trên thẻ luận giải, tấm xem thử ("480 Lá") | chữ | glyph nhỏ | 16 đến 20 |
| 2 | Nút "Mở – N Lá →", nút "Mở luận giải — N Lá" | chữ | glyph nhỏ trước số | 18 |
| 3 | Chip số dư ("Số dư: 300 Lá"), trên thanh trang chọn luận giải và (đề xuất) cạnh tên ở đầu trang | chữ | glyph nhỏ + biểu tượng ví | 18 đến 24 |
| 4 | Tấm xác nhận mở khoá: dòng Giá, Số dư, Còn lại sau khi mở, Thiếu | chữ | glyph nhỏ ở từng dòng; biểu tượng chính ở đầu tấm | 18 và 64 |
| 5 | Nạp trong tấm (InlineTopUp) và chọn gói nạp (4 gói: Nhập Môn 300, Khởi Đọc 1.100, Khám Phá 3.000, Tàng Thư 8.000) | chữ + nút chọn | **4 hình minh hoạ tăng dần theo số lá** + glyph cạnh số Lá và "+N Lá tặng" | 96 đến 128 |
| 6 | Trang Nạp Lá (tab "Nạp Lá"), phần giới thiệu gói trên trang chủ ("Gói nạp Lá") | chữ + thẻ | biểu tượng chính, 4 hình gói, ví | 64 đến 160 |
| 7 | Bước thanh toán VietQR: chờ chuyển khoản, đã nhận tiền, "Lá đã vào ví" | chữ, vòng xoay | biểu tượng chính có trạng thái (chờ: vòng quay; xong: dấu tích) | 56 |
| 8 | Hoàn tất nạp và mở xong ("Phần bạn chọn đã mở. Ví còn N Lá") | chữ | huy hiệu vàng nổi + dấu triện (khoảnh khắc thành công) | 120 |
| 9 | Báo "Đã hoàn N Lá, phần đọc đã khoá lại" (báo cáo lỗi, đánh dấu không đúng) | chữ | biểu tượng chính có mũi tên quay về | 40 |
| 10 | Lá tặng chào mừng (60 Lá), lượt tặng "Hôm nay", "+N Lá tặng" khi nạp | chữ | biểu tượng quà Lá | 40 và 16 |
| 11 | Trang Tài khoản: thẻ "Số dư Lá", lịch sử đơn, thư viện đã mở | chữ số lớn | biểu tượng ví + biểu tượng chính cỡ lớn | 40 đến 64 |
| 12 | Khoá và mở khoá (thẻ chưa mở, thẻ đã mở) | chữ "Chưa mở" | dùng bộ icon ổ khoá sẵn có, không cần vẽ mới | 16 |
| 13 | Hội viên (đang ẩn) | chữ | không cần, để sau | — |

Những chỗ **không cần vẽ thêm**, em ghép từ hai icon chính bằng mã: chấm trạng thái chờ / thành công / hoàn Lá (7, 9), dấu "+" nạp thêm, mũi tên, ổ khoá.

**Cần vẽ: 6 tài sản**, theo thứ tự ưu tiên: (1) biểu tượng chính, (2) glyph nhỏ, (3) bộ 4 hình gói nạp, (4) biểu tượng ví, (5) biểu tượng quà Lá, (6) huy hiệu vàng nổi (tuỳ chọn, cho khoảnh khắc thành công).


## Prompt 4: biểu tượng ví (chip số dư, thẻ "Số dư Lá" ở tài khoản, tab Nạp Lá)
```
Use the attached gold ring as the STYLE REFERENCE (Vietnamese Dong Son bronze-drum band: concentric circles, small bead dots, engraved double outlines). Design ONE ICON of a small drawstring POUCH, a traditional Vietnamese cloth money pouch, shown as a wallet for a currency called "La" (leaf).

Subject: a rounded pouch with a gathered neck tied by a cord, two short cord ends hanging, a few soft fold lines. On the belly of the pouch, a small engraved leaf inside a thin double ring with tiny bead dots (the same leaf mark: pointed oval, curved stem at lower left, tip to the upper right, one center vein and two side veins). Front view, symmetrical, calm and sturdy.

Canvas: 1024 x 1024 px, centered, about 10 percent margin.
Line quality: crisp engraved etching, consistent stroke about 14 px at 1024, rounded line ends, clean geometric construction.
Colors: pure white lines (#FFFFFF) on a flat pure black background (#000000). Only these two colors, no grey.
Must stay recognizable at 64 px wide. Keep inner detail simple.

Strictly avoid: modern leather wallet, credit card, coin stack, dollar or any currency symbol, Chinese ingot or red envelope, clouds, dragons, lotus, text, numbers, gradients, glow, shadow, 3D, texture.
```

## Prompt 5: bộ 4 hình gói nạp, tăng dần (một tờ, 2 x 2)
```
Use the attached gold ring as the STYLE REFERENCE (Vietnamese Dong Son bronze-drum band, engraved double outlines, small bead dots). Design a SET OF FOUR matching ILLUSTRATIONS on ONE square sheet, arranged 2 x 2 with equal spacing, that show an increasing amount of "La" (leaf), for four top-up packs. Each illustration is centered in its own quarter of the sheet and sits inside a thin double ring with tiny bead dots, so the four look like four medallions of the same family.

1) top-left, smallest: ONE single leaf.
2) top-right: THREE leaves on a short sprig.
3) bottom-left: a fuller SPRIG with about SEVEN leaves.
4) bottom-right, largest: a lush BRANCH with about TWELVE leaves, still clearly readable.

All leaves use the same pointed-oval shape (gentle S-curve, curved stem, engraved center vein and a few side veins). Leaves grow toward the upper right. Keep the same stroke weight in all four.

Canvas: 2048 x 2048 px square sheet; each quarter 1024 x 1024; about 10 percent margin inside each quarter.
Line quality: crisp engraved etching, consistent stroke about 12 px, rounded line ends, clean geometric construction, not calligraphic.
Colors: pure white lines (#FFFFFF) on a flat pure black background (#000000). Only these two colors, no grey.
Each medallion must stay recognizable when shown at 96 px.

Strictly avoid: coins stacked, money symbols, Chinese motifs, lotus, flowers, fruit, clouds, dragons, text, numbers, labels, gradients, glow, shadow, 3D, texture, different styles between the four.
```

## Prompt 6: biểu tượng quà Lá (Lá tặng chào mừng, lượt tặng, "+N Lá tặng")
```
Use the attached gold ring as the STYLE REFERENCE (engraved double outlines, small bead dots, Dong Son character). Design ONE ICON of a GIFT of "La" (leaf): a single pointed-oval leaf (gentle S-curve, curved stem, engraved center vein and two side veins) tied across its middle with a small simple ribbon bow, as if the leaf were wrapped as a present. The leaf and the bow together fit inside a thin double ring with tiny bead dots.

Canvas: 1024 x 1024 px, centered, about 10 percent margin.
Line quality: crisp engraved etching, consistent stroke about 14 px at 1024, rounded line ends, clean geometric construction.
Colors: pure white lines (#FFFFFF) on a flat pure black background (#000000). Only these two colors, no grey.
Must stay recognizable at 40 px wide.

Strictly avoid: gift box with lid, balloon, confetti, stars, sparkles, hearts, Chinese red envelope, text, numbers, gradients, glow, shadow, 3D, texture.
```

## Cách làm
1. Gen 3 đến 4 bản cho mỗi prompt, chọn bản vòng đều và lá cân nhất. **Giữ cùng một cuộc trò chuyện ChatGPT cho cả 6 prompt** để nét và dáng lá đồng nhất; sau khi có biểu tượng chính, đính kèm luôn nó làm ảnh mẫu thứ hai cho các prompt còn lại ("the same leaf as the attached main mark").
2. Gửi lại cho Claude. Claude xử lý: tách nền trong suốt, tạo bản vàng cho nền tối và bản nâu vàng đậm cho nền sáng (tô sẵn, không dùng mặt nạ để tránh nháy khối vàng khi đang tải), xuất webp và png, cắt tờ 2 x 2 thành 4 hình, đổi sang tên SEO.
3. Tên file gợi ý khi lưu (chữ thường, có gạch ngang):
   - `bieu-tuong-la-tien-te-lasoviet.png`
   - `bieu-tuong-la-nho-canh-gia-lasoviet.png`
   - `huy-hieu-la-vang-son-mai-lasoviet.png`
   - `bieu-tuong-vi-la-tui-gam-lasoviet.png`
   - `bo-bon-goi-nap-la-tang-dan-lasoviet.png` (sau đó cắt thành `goi-nap-la-nhap-mon-...`, `goi-nap-la-khoi-doc-...`, `goi-nap-la-kham-pha-...`, `goi-nap-la-tang-thu-...`)
   - `bieu-tuong-qua-tang-la-lasoviet.png`
4. Em gắn vào luồng theo bảng kiểm kê, từng chỗ một, mỗi chỗ kèm kiểm tra sáng/tối và điện thoại 390.
