# Đặt ảnh nền và hoa văn cho lá số

**Ngày:** 2026-09-28
**Dùng cho:** lá số trong báo cáo trả phí (FD-106a), và sau này cho trang kết quả miễn phí.
**Người đặt:** anh Lãm, order qua ChatGPT rồi gửi file lại.
**Ràng buộc:** theo `docs/22-art-direction.md` §1 và §2, và quy tắc đặt tên file ảnh ở §0.

---

## Cách dùng tài liệu này

Năm ảnh dưới đây. Mỗi ảnh có: **tên file phải đặt**, **khổ và định dạng**, **prompt để dán vào ChatGPT**, và **cách kiểm tra khi nhận về**.

Dán nguyên khối trong ô prompt, không sửa. Nếu ChatGPT trả về ảnh có chữ Hán bị méo hoặc bịa, **bỏ, order lại** — đừng dùng, vì quy tắc thương hiệu cấm chữ Hán không đọc được nghĩa.

Với ảnh cần nền trong suốt, nếu ChatGPT không trả PNG trong suốt được thì cứ nhận bản nền trắng hoặc nền đen, em tách nền sau.

---

## Ảnh 1 — Nền giấy cũ cho lá số (giao diện nền sáng)

**Tên file:** `nen-la-so-giay-co-lien-mach-lasoviet.png`
**Khổ:** 1024 × 1024, PNG, **phải lặp được liền mạch** (seamless tile)

```
A seamless tileable texture of aged East Asian handmade paper, warm cream and ivory tone
(#fffdf7 to #f7f1e5), showing fine visible paper fibers, faint irregular mottling, and very
subtle horizontal laid lines from the paper mould. The texture must be extremely subtle and
low contrast, suitable as a background behind black body text at 100% opacity without
reducing legibility. No creases, no folds, no tears, no stains, no burn marks, no drawings,
no characters, no text, no border, no vignette, perfectly flat even lighting with no shadows
and no highlights, edges must tile seamlessly in all four directions, high resolution, top
down flat scan of paper, 1024x1024 square.
```

**Kiểm khi nhận:** đặt cạnh nhau 4 bản thấy không lộ đường nối. Không có vết bẩn hay nếp gấp nào nổi bật (vì khi lặp, vết đó sẽ lặp theo và lộ ngay).

---

## Ảnh 2 — Nền sơn mài cho lá số (giao diện nền tối)

**Tên file:** `nen-la-so-son-mai-lien-mach-lasoviet.png`
**Khổ:** 1024 × 1024, PNG, **phải lặp được liền mạch**

```
A seamless tileable texture of a dark East Asian lacquer surface, near black with a warm
brown undertone (#0f0d0a to #1c1813), showing the fine natural crackle pattern of aged
lacquer and a very faint depth of layered translucent coats. Extremely subtle and low
contrast, suitable as a background behind cream colored body text at 100% opacity without
reducing legibility. No gold flecks, no inlay, no mother of pearl, no drawings, no
characters, no text, no border, no vignette, perfectly flat even lighting with no specular
highlights and no visible light source, edges must tile seamlessly in all four directions,
high resolution, top down flat view, 1024x1024 square.
```

**Kiểm khi nhận:** như ảnh 1. Đặc biệt không được có điểm sáng nào, vì điểm sáng lặp lại trông rất giả.

---

## Ảnh 3 — Hoa văn la kinh ở giữa lá số (quan trọng nhất)

Đây là hoa văn hình tròn nằm chìm sau ô thông tin giữa lá số, giống vòng tròn mờ của AiTuvi nhưng là của mình.

**Tên file:** `hoa-van-la-kinh-trung-tam-la-so-lasoviet.png`
**Khổ:** 2000 × 2000, PNG **nền trong suốt**

```
A flat vector line art ornament of a traditional East Asian geomantic compass rose, drawn as
thin uniform single weight outlines only, no fill, no shading, no gradient, no texture, no
perspective, viewed perfectly straight from above and perfectly centered.

Structure from the center outward:
1. A small empty circle at the very center.
2. A ring divided into eight equal sectors, each sector containing one Bagua trigram drawn
   purely as three short horizontal bars, where a solid bar is one unbroken line and a broken
   bar is two short line segments with a gap. Use all eight distinct trigram combinations,
   evenly spaced. These are geometric bars only, never written characters.
3. A plain thin circle.
4. A ring of twenty four evenly spaced fine radial tick marks, every third tick slightly longer.
5. A ring divided into twelve equal sectors by thin radial dividing lines, each sector empty.
6. Two concentric thin outer circles close together forming the outer rim.

Everything is a single flat color: warm antique gold (#C9A44D) lines on a fully transparent
background. Absolutely no Chinese characters, no Han characters, no Vietnamese text, no
numbers, no letters, no arrow, no magnetic needle, no drop shadow, no glow, no background
fill. Symmetrical, precise, technical drawing quality, like an engraved diagram plate.
2000x2000 square, transparent PNG.
```

**Kiểm khi nhận:**
- Phải **không có chữ nào**. Nếu có chữ Hán, bỏ, order lại.
- Tám quẻ phải là các vạch ngang, mỗi quẻ khác nhau, không quẻ nào lặp.
- Hình phải tròn đều và nằm chính giữa khung.

---

## Ảnh 4 — Dấu triện Lá Số Việt

Con dấu son đỏ đặt ở ô giữa lá số, thay cho triện chữ Hán của AiTuvi. Đây là dấu **của mình**, không được giống họ.

**Tên file:** `dau-trien-la-so-viet-son-do.png`
**Khổ:** 1200 × 1200, PNG **nền trong suốt**

```
A traditional East Asian seal impression, square with softly rounded corners, stamped in
cinnabar red ink (#CE5B45) on a fully transparent background. Inside the square border, the
design is purely geometric and abstract: a circle whose upper portion is formed by two
separate curved arcs with a gap between them at the top, and whose lower portion contains a
single V shape formed by two straight strokes meeting at a point at the bottom center. The
strokes are thick, blocky and evenly weighted, in the manner of carved archaic seal script,
but they form no written character in any language.

The impression has the natural imperfection of a real hand stamped seal: slightly uneven ink
coverage, a few tiny gaps where the carved surface did not fully transfer, and a subtly
irregular outer edge. No paper, no background, no shadow, no gloss, no text, no letters, no
Chinese characters, no Japanese characters, no Korean characters, no numbers. Flat single
color cinnabar red only. Centered, 1200x1200 square, transparent PNG.
```

**Kiểm khi nhận:**
- Bên trong dấu **không được là chữ của bất kỳ ngôn ngữ nào**. Chỉ là hình: hai cung tròn ở trên, chữ V ở dưới. Đây là hình rút từ logo của mình.
- Nếu ChatGPT vẽ ra chữ Hán, bỏ, order lại và nhấn mạnh "no characters, geometric shapes only".

---

## Ảnh 5 — Hoa văn bốn góc khung lá số

Hoa văn nhỏ đặt ở bốn góc khung lá số cho đỡ trống.

**Tên file:** `hoa-van-goc-khung-la-so-lasoviet.png`
**Khổ:** 800 × 800, PNG **nền trong suốt**

```
A flat vector corner ornament for a document border, drawn as thin uniform single weight
outlines only, no fill, no shading, no gradient. The design is a classical East Asian angular
fretwork motif, also called a meander or key pattern, made of straight lines meeting at right
angles and turning inward in a spiral, occupying only the top left corner region of the
square canvas and fading out toward the center. Purely geometric, strictly right angles and
straight segments, no curves, no flowers, no leaves, no dragons, no clouds, no animals.

Single flat color: warm antique gold (#C9A44D) on a fully transparent background. No text, no
characters, no numbers, no shadow, no glow. Precise technical drawing quality. 800x800 square,
transparent PNG.
```

**Kiểm khi nhận:** chỉ có hoa văn ở góc trên bên trái, ba góc còn lại trống. Em sẽ xoay để dùng cho cả bốn góc.

---

## Sau khi anh gửi file về

Em sẽ:
1. Đổi tên file đúng như trên, chuyển sang `.webp` cho nhẹ.
2. Đặt vào lá số với độ mờ rất thấp, sao cho chữ vẫn đọc rõ, và chỉnh lại cho cả nền sáng lẫn nền tối.
3. Chụp lại màn hình để anh duyệt trước khi đưa vào web thật.

Nếu ảnh 3 và ảnh 4 không ra được như ý sau vài lần order, nói em biết. Hai hình đó thuần hình học nên em vẽ tay bằng code được, chỉ là vẽ tay sẽ đều đặn quá, thiếu cái nét của bản in cũ.
