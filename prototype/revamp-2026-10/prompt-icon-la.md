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

## Cách làm
1. Gen 3 đến 4 bản cho mỗi prompt, chọn bản vòng đều và lá cân nhất.
2. Gửi lại cho Claude. Claude xử lý: tách nền trong suốt, tạo bản vàng cho nền tối và bản nâu vàng đậm cho nền sáng (tô sẵn, không dùng mặt nạ), xuất webp và png, đổi sang tên SEO.
3. Tên file gợi ý khi lưu: `bieu-tuong-la-tien-te-lasoviet.png`, `bieu-tuong-la-nho-canh-gia-lasoviet.png`, `huy-hieu-la-vang-son-mai-lasoviet.png`.

## Sẽ dùng ở đâu
Cạnh giá trên thẻ luận giải ("480 [lá]"), nút "Mở – N [lá]", chip số dư, tấm xác nhận và tấm nạp, gói nạp, thông báo đã mở, trang ví. Glyph nhỏ dùng inline, biểu tượng chính dùng khi cần to.
