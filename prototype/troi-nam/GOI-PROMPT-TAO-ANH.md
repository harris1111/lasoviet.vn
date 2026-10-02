# Homepage "Trời Nam" — Gói prompt tạo ảnh cho ChatGPT (bản 2)

Ngày 30/09/2026 · Hướng B đã chốt · Viết dựa trên 62 ảnh tham khảo trong `~/Downloads/troi-nam-ref`

**Cách đọc file này**
- Chữ tiếng Việt = hướng dẫn cho anh.
- Khối chữ tiếng Anh trong khung xám = nội dung **dán nguyên văn** vào ChatGPT. Không sửa, không cắt.
- Mỗi ảnh có mã riêng (L01, T03, P02, …). Anh lưu file theo đúng mã đó.

**Mục lục**
1. Thiết lập ChatGPT (làm 1 lần)
2. Quy trình tạo từng ảnh + cách kiểm tra + câu sửa lỗi
3. Bản đồ 62 ảnh tham khảo (ChatGPT lấy gì, bỏ gì)
4. Nhóm L — Phong cảnh (13 ảnh)
5. Nhóm T — Chất liệu, texture (11 ảnh)
6. Nhóm P — Hoa văn, pattern (5 ảnh)
7. Nhóm S — Tranh 4 nỗi lo (5 ảnh)
8. Nhóm E — Vật thể nhỏ cho hiệu ứng rơi/trôi (6 ảnh)
9. Nhóm I — Bộ icon mẫu (2 ảnh)
10. Nhóm C — Chân dung 15 người đọc (+2 dự phòng)
11. Nhóm O — Ảnh chia sẻ mạng xã hội (1 ảnh)
12. Checklist gửi lại em

**Những thứ em tự dựng bằng code — anh không cần tạo ảnh:** núi 3D chuyển động, mặt nước động, sương bay, tia nắng động, trời chuyển ngày→đêm, sao và chòm sao 12 cung, lá số, các đường nối cung, mọi hiệu ứng chuột/cuộn. Ảnh anh tạo dùng làm: ảnh nền cho máy yếu, "khung hình mẫu" để em dựng 3D cho khớp màu, chất liệu phủ lên bề mặt, hoa văn, tranh minh họa, hạt rơi, icon mẫu, chân dung.

---

# 1. Thiết lập ChatGPT (làm 1 lần)

1. Dùng **ChatGPT gói Plus trở lên**, model mặc định (tạo ảnh bằng GPT-image).
2. Tạo một **Project** mới tên **"Trời Nam"** (thanh bên trái → *Projects* → *New project*).
3. **Tải lên 13 bảng tham khảo** trong thư mục `~/Downloads/troi-nam-ref-boards/`, **không** tải 62 ảnh lẻ. ChatGPT web chỉ nhận tối đa 20 file mỗi lần, nên em đã ghép 62 ảnh thành 13 bảng; dưới mỗi ảnh có in tên (ví dụ `trang-an-3`), nên prompt vẫn gọi đúng từng ảnh.
   - Cách tải: bấm **dấu +** trong ô chat của Project → chọn cả 13 file `BOARD-...jpg` → gửi cùng tin nhắn kiểm tra ở bước 5.
   - **Mỗi cuộc trò chuyện mới** (mỗi nhóm L, T, P, …) cũng đính kèm lại 13 bảng này ở tin nhắn mở đầu, vì ảnh gửi trong chat trước không tự sang chat sau.
   - Bảng nào chứa ảnh nào: `BOARD-trang-an` (trang-an-1→5), `BOARD-ha-long` (1→3), `BOARD-ha-giang` (1→4), `BOARD-hoi-an` (1→4), `BOARD-mu-cang-chai` (1→5), `BOARD-bon-mua-viet-1` (1→6), `BOARD-bon-mua-viet-2` (7→11), `BOARD-son-mai-nguyen-gia-tri` (1→6), `BOARD-vang-la-kieu-ky` (1→4), `BOARD-xa-cu-1` (1→6), `BOARD-xa-cu-2` (7→9), `BOARD-giay-do` (1→5), `BOARD-hoa-van-dong-son` (1→6).
4. Vào Project → **Instructions**, dán **ĐOẠN CHỈ DẪN DỰ ÁN** dưới đây:

```text
You are the image-generation art director for "Troi Nam" (Southern Sky), the homepage of La So Viet, a premium Vietnamese Tu Vi (Vietnamese astrology) website. Every image you create belongs to ONE visual world and must look like it was shot or crafted by the same team.

VISUAL THESIS
The real landscapes and traditional crafts of Vietnam, under a sky that turns into a night full of stars. Sacred, cinematic, quiet awe. Museum-grade craft. Luxury restraint, never kitsch.

BRAND PALETTE (grade every image toward these values)
- Lacquer black shadows: #080706, #0F0D0A, #15120E, #1C1813
- Warm umber midtones: #3A3227, #4A4438
- Antique gold: #9A7730, #A8842F, #C9A44D
- Light gold highlights: #F2DCA0, #F8EBC6
- Cinnabar red accent (use sparingly): #CE5B45, deep #6B211A
- Pearl / mist cream: #F6F1E6, #EAE4D5, warm mist grey #A79E8B
Avoid saturated blue skies, emerald/teal water, purple, magenta, neon, and the teal-orange "Instagram" grade. Night skies are warm ink-black with gold-white stars, not blue.

HOW TO USE THE REFERENCE FILES IN THIS PROJECT
- References are delivered as 13 labelled contact boards named BOARD-<group>.jpg. Each board holds 3–6 reference photos, and the filename of each photo is printed in gold under it (for example "trang-an-3"). When a prompt names a file such as trang-an-3.jpg, find the tile labelled "trang-an-3" on the matching board (BOARD-trang-an.jpg) and study only that tile. The board background and labels are not part of any reference.
- The reference photos are for mood, light direction, composition logic, material and cultural accuracy only.
- Never reproduce any reference photo exactly. Build a new composition that is clearly original.
- Ignore and never copy watermarks, signatures, logos, shop names, website text, Chinese/Han characters, calligraphy, frames or borders that appear in references.
- Re-grade anything taken from a reference to the brand palette above.
- When a prompt names reference files, look at those files specifically before generating.

ALWAYS
- Photorealistic unless the prompt says line art, texture, or icon.
- No text, letters, numbers, captions, logos, watermarks or signatures in any image.
- No modern buildings, cars, power lines, tourists, selfie sticks, drones.
- Keep the exact canvas size the prompt asks for.
- If a prompt asks for a transparent background, output a real transparent PNG (no white or checkerboard painted in).
- After each image, write one short line in English listing which reference files you used and what you took from each.
```

5. Mở một cuộc trò chuyện **trong Project** và gửi câu này để kiểm tra ChatGPT đã thấy ảnh chưa:

```text
I attached 13 reference boards. Read the gold label under every tile and list all tile labels you can see, grouped by board. There should be 62 tiles in total. Do not generate any image yet.
```

Nếu ChatGPT liệt kê đủ 62 tên (trang-an-1 … hoa-van-dong-son-6) là xong phần thiết lập.

> Nếu Project cho phép dán Instructions: dán Đoạn chỉ dẫn dự án vào đó. Nếu không tìm thấy chỗ dán: gửi Đoạn chỉ dẫn dự án làm **tin nhắn đầu tiên** của mỗi cuộc trò chuyện, kèm 13 bảng, rồi mới gửi tin nhắn mở đầu của nhóm.

---

# 2. Quy trình sản xuất theo lô (chế độ Work)

**Memory của Project:** để **Default**. Chế độ *Project-only* đã bị khóa vì Project có chat chế độ Work. Không ảnh hưởng: Đoạn chỉ dẫn dự án đã đủ để ChatGPT bám đúng phong cách.

**Không cần dán từng prompt.** Chế độ **Work** của ChatGPT tự làm nhiều bước liền nhau và xuất được nhiều file, nên anh chỉ cần gửi **một lệnh ngắn cho mỗi lô ảnh**. ChatGPT tự đọc spec trong file này, tạo từng ảnh, tự kiểm tra, tạo lại ảnh lỗi, đặt tên và đóng gói.

### Làm 1 lần
1. Tiếp tục trong **đúng cuộc trò chuyện Work vừa kiểm tra 62 ảnh** (ở đó ChatGPT đã có sẵn 13 bảng tham khảo). Làm hết mọi lô trong cùng cuộc này để phong cách đồng nhất.
2. Đính kèm **chính file này** (`GOI-PROMPT-TAO-ANH.md`, nằm ở `lasoviet.vn/prototype/troi-nam/`) và gửi **LỆNH KHỞI ĐỘNG** dưới đây.

```text
I attached the production spec GOI-PROMPT-TAO-ANH.md. It is the single source of truth for every image. Vietnamese text in it is for the human; you follow only the English code blocks (the project instructions, the group opening blocks, and every item block such as L01, T03, C00).

From now on I will send short batch orders like "RUN BATCH L-A". For every batch, follow this production protocol exactly:

1. SPEC FIDELITY — For each item ID in the batch, read its full English block in the spec plus its group opening block. Follow every line: canvas size, composition percentages, light, hex colours, camera, MUST/MUST NOT. Never shorten, merge or "simplify" an item. Study only the reference tiles the item names, found by their gold labels on the 13 boards.
2. ONE IMAGE PER ITEM — Generate each item as its own separate image at its exact canvas size. Never put several items in one image unless the item itself asks for a grid or a set.
3. BEST OF TWO FOR HERO PLATES — For L01, L02, L04, L06, S01–S04 and C00, generate two candidates and keep the stronger one as the main file; keep the other as "-alt".
4. SELF-QA GATE — Before accepting any image, inspect it and check: (a) zero text, letters, numbers, signatures, watermarks; (b) grade matches the brand palette, no blue sky, teal water, purple or neon; (c) the reserved negative space is where and as large as the spec says; (d) no distorted anatomy, boats, roofs, hands, eyes or teeth; (e) transparent items have a real alpha channel, no painted white or checkerboard; (f) not a near-copy of any reference tile; (g) for portraits: correct gender, apparent age within 5 years, same lighting/lens/colour grade as the series but its OWN distinct background matching the person's stated job and region — flag it as a fail if this portrait's background is near-identical to another portrait already made in this group; (h) overall quality worthy of a luxury brand campaign — if it looks generic, cheap, over-saturated or "AI", it fails; (i) for any item with a reserved text zone: that zone is DARK enough for ivory/cream text on top (average brightness under 35%, mostly between #1C1813 and #4A4438), with bright gold kept to the light source, ray edges and rim highlights only — not spread across the whole zone.
5. RETRY — If any check fails, fix it with a targeted regeneration and re-check. Up to 3 retries per item. Never lower the bar to finish faster. If an item still fails after 3 retries, deliver the best attempt, mark it FAILED and say exactly which check failed.
6. NAMING — Save each final image as exactly {ID}.png (for example L01.png, T03.png, C00.png), the second candidate as {ID}-alt.png. PNG for everything.
7. DELIVERY for each batch — (a) all image files as downloadable outputs; (b) one ZIP named troi-nam-{BATCH}.zip containing them; (c) one review contact sheet image showing every final image with its ID printed under it; (d) a QA table: ID · references used · checks a–h pass/fail · retries · notes.
8. If a batch is too long to finish in one run, stop after a complete item, deliver what is done with the full protocol, and tell me the exact next ID to continue from.

Reply "Protocol confirmed" and wait for my first batch order. Do not generate anything yet.
```

### Mỗi lô ảnh = 1 lệnh
Gửi lần lượt từng dòng dưới đây, **mỗi lần một dòng**. Chờ lô trước xong và tải về rồi mới gửi lô tiếp theo.

| Thứ tự | Gửi nguyên dòng này | Gồm các ảnh | Ghi chú |
|---|---|---|---|
| 1 | `RUN BATCH PILOT: L01, C00` | L01, C00 | **Chạy thử trước.** Gửi 2 ảnh này cho em duyệt chất lượng rồi mới chạy tiếp |
| 2 | `RUN BATCH L-A: L02, L03, L04, L05, L06` | 5 phong cảnh Ưu tiên 1 | |
| 3 | `RUN BATCH C-A: C01, C02, C03, C04, C05, C06, C07` | 7 chân dung | |
| 4 | `RUN BATCH C-B: C08, C09, C10, C11, C12, C13, C14` | 7 chân dung | C15, C16 dự phòng — chỉ chạy khi cần |
| 5 | `RUN BATCH T-A: T01, T02, T03, T04, T07, T08, T11` | chất liệu Ưu tiên 1 | |
| 6 | `RUN BATCH P-A: P01, P02, P04` | hoa văn Ưu tiên 1 | |
| 7 | `RUN BATCH S-A: S01, S02, S03, S04` | 4 tranh nỗi lo | |
| 8 | `RUN BATCH E-A: E01, E02` | lá vàng, hoa đăng | |
| 9 | `RUN BATCH I-A: I01, I02` | 2 bảng icon | |
| 10 | `RUN BATCH L-B: L07, L08, L09, L10, L11, L12, L13` | Ưu tiên 2 | Làm sau |
| 11 | `RUN BATCH REST: T05, T06, T09, T10, P03, P05, S05, E03, E04, E05, E06, O01` | Ưu tiên 2 | Làm sau |

**Vì sao chia lô nhỏ (2–7 ảnh):** lô càng dài thì ChatGPT càng dễ làm ẩu ở cuối lô hoặc bị ngắt giữa chừng. Lô nhỏ giữ được chất lượng từng ảnh.

### Chạy song song bằng 3 tài khoản ChatGPT (rút ngắn thời gian)

Chia việc theo **họ ảnh**, không chia xen kẽ — để mọi ảnh cùng một nhóm (ví dụ toàn bộ chân dung) do cùng một tài khoản làm, giữ phong cách đồng nhất trong nhóm đó.

> **Lưu ý cách đọc mã:** `O01` là **mã của một ảnh** (ảnh chia sẻ mạng xã hội), không phải tên batch. Tên batch luôn có dạng `RUN BATCH <tên>: <danh sách mã ảnh>`. Cột "Lệnh gửi tiếp" dưới đây ghi **nguyên văn dòng cần dán**.

**Tình trạng và việc còn lại — cập nhật 30/09/2026, 08:05**

| Tài khoản | Đã xong | Lệnh gửi tiếp (dán nguyên dòng, mỗi lần một dòng) |
|---|---|---|
| **A** — phong cảnh | PILOT, L-A, L-B | 1. `RUN BATCH S-A: S01, S02, S03, S04`<br>2. `RUN BATCH S-B: S05, O01`<br>3. `REDO L01` (xem ô ghi chú bên dưới) |
| **B** — chân dung, giờ chuyển sang vật thể + icon | C-A, C-B | 1. `RUN BATCH E-A: E01, E02`<br>2. `RUN BATCH I-A: I01, I02`<br>3. `RUN BATCH E-B: E03, E04, E05, E06` |
| **C** — chất liệu + hoa văn | T-A, đang chạy P-A | 1. `RUN BATCH REST: T05, T06, T09, T10, P03, P05` |

Ai xong sớm thì nhận thêm việc của người khác, miễn **không hai tài khoản cùng làm một mã ảnh**. Lần điều chỉnh này: A nhận thêm nhóm S (tranh nỗi lo, cùng chất ảnh chụp cảnh với nhóm L và đã có sẵn chỉnh sửa "vùng chữ đủ tối"); B nhận nhóm E và I (đều là ảnh nền trong suốt, cùng một họ kỹ thuật); C giữ phần chất liệu và hoa văn còn lại. Batch `REST` đã bỏ `S05`, `O01`, `E03`–`E06` để không làm trùng.

**Làm lại L01 (tài khoản A).** L01 được tạo *trước* khi có chỉnh sửa "vùng chữ đủ tối" nên vùng đặt tiêu đề bên trái sáng 71%, trong khi mức cần là dưới 35%; nó cũng sáng lệch hẳn so với 12 ảnh phong cảnh còn lại. Gửi dòng này:

```text
REDO L01 — the approved L01 was made before the dark-text-zone correction. Regenerate it with the full L01 spec plus check (i): the reserved left 45% must average under 35% brightness, mostly between #1C1813 and #4A4438, so ivory headline text reads on top. Match the grade of L09–L12 (the four seasonal versions), which are correct. Keep the same composition: dark rock face on the right, two-tier water pavilion, tiny rower, light shafts, mirror water. Deliver as L01.png plus L01-alt.png, with the usual QA table.
```

**Riêng tài khoản B**, vì cuộc trò chuyện đang đầy ngữ cảnh chân dung, gửi thêm dòng này ngay trước batch đầu tiên:

```text
We are switching from GROUP C (portraits) to GROUP E (sprites) and GROUP I (icons). Read their group opening blocks in the spec and follow those rules instead of the portrait rules: these are isolated objects and line icons on a real transparent background, not photographs of people.
```

**Thiết lập cho mỗi tài khoản mới (B và C), làm y hệt tài khoản A đã làm:**

1. Đăng nhập tài khoản ChatGPT Plus khác (trình duyệt khác hoặc cửa sổ ẩn danh để không lẫn phiên đăng nhập).
2. Tạo Project mới, đặt tên riêng để khỏi nhầm, ví dụ **"Trời Nam — Chân dung"** (tài khoản B) và **"Trời Nam — Chất liệu"** (tài khoản C).
3. Vào **Project settings → Instructions**, dán **ĐOẠN CHỈ DẪN DỰ ÁN** ở mục 1 phần trên (nguyên văn, không đổi).
4. Mở một cuộc trò chuyện **Work** mới trong Project đó, bấm dấu **+** → đính kèm cả **13 file `BOARD-...jpg`** trong `~/Downloads/troi-nam-ref-boards/`.
5. Gửi câu kiểm tra ở mục 1 bước 5 (`I attached 13 reference boards...`). Đủ 62 tên là được.
6. Đính kèm file **`GOI-PROMPT-TAO-ANH.md`** (bản đã cập nhật, đã có sẵn mục kiểm tra "vùng chữ đủ tối" trong bước SELF-QA GATE) và gửi **LỆNH KHỞI ĐỘNG** y hệt mục 2.
7. **Riêng tài khoản B (nhóm C — chân dung):** trước batch C-A, đính kèm thêm 1 ảnh `apps/web/public/images/lasoviet/v12/chan-dung-minh-hoa-doc-gia-homepage.webp` (anh lấy từ máy, gửi qua chat) chỉ để tham khảo **ánh sáng và tông màu** — mỗi người vẫn phải có **bối cảnh riêng** theo đúng cột "Bối cảnh" trong mục 10, không dùng chung một phông nền. C00 đã tạo và đã dùng trên trang rồi, batch C-A bắt đầu từ C01.
8. Gửi lần lượt các dòng `RUN BATCH ...` được phân công ở bảng trên, mỗi lần một dòng, chờ xong mới gửi tiếp — giống hệt cách đang làm ở tài khoản A.

**Khi cả 3 xong:** gửi em biết "xong tài khoản A/B/C", kèm các ZIP đã giải nén vào `~/Downloads/troi-nam-gen/` (gộp chung một thư mục, tên file không trùng nhau nên không đè lên nhau). Em sẽ soi lại toàn bộ một lượt trước khi dựng vào trang.

### Điều chỉnh sau lô chạy thử (gửi 1 lần, trước lô L-A)

Lô chạy thử đạt chất lượng. Chỉ có một điểm: vùng trống để đặt chữ trong L01 **quá sáng** (độ sáng trung bình khoảng 70%), trong khi chữ trên trang là màu kem trên nền tối. Gửi câu dưới đây trước khi chạy `RUN BATCH L-A`:

```text
PILOT REVIEW — L01 and C00 are approved. Keep this exact quality, realism and style for everything that follows.
One correction applies to all remaining landscape plates (L02–L13), story plates (S01–S05) and O01: the website places large IVORY text on top of the reserved negative space, so that space must be DARK, not bright. Grade about one to one-and-a-half stops darker than L01 overall, low-key and moody: the reserved text zone should sit mostly between #1C1813 and #4A4438 (average brightness under 35%), with the bright gold kept to the sun or light source, the edges of the rays and the rim highlights. Keep the glow and the luxury feel — darker, not duller. Also keep vegetation dark olive-umber, less green than L01.
Add this as check (i) in your self-QA gate: "reserved text zone is dark enough for ivory text".
Reply "Correction applied" and wait for the next batch order.
```

### Sau mỗi lô
1. Xem **bảng ảnh tổng hợp** và **bảng QA** ChatGPT gửi. Ảnh nào bị đánh dấu FAILED hoặc anh thấy chưa đẹp, gõ: `Redo {ID}: {lỗi, dùng câu trong Thư viện câu sửa bên dưới}`.
2. **Tải file ZIP** của lô, giải nén vào `~/Downloads/troi-nam-gen/`.
3. Nhắn em "xong lô …". **Em sẽ kiểm tra lại từng ảnh lần hai** (phóng to soi chữ lạ, màu, bố cục so với trang thật) và gửi anh danh sách ảnh cần làm lại kèm câu sửa sẵn, nếu có.

**Kích thước ChatGPT hỗ trợ:** ngang 1536×1024, dọc 1024×1536, vuông 1024×1024. Em sẽ tự phóng to, cắt khung và nén ảnh cho web.

> Nếu chế độ Work không xuất được nhiều ảnh trong một lần: quay về cách thủ công — dán khối prompt của từng ảnh, mỗi tin nhắn một ảnh, rồi dùng Checklist và Thư viện câu sửa bên dưới.

### Checklist chung (kiểm cho mọi ảnh)
- [ ] Không có chữ, số, chữ Hán, chữ ký, watermark, logo ở bất kỳ góc nào.
- [ ] Màu đúng tông: bóng đen ấm, sáng vàng kim, **không** xanh dương rực, **không** xanh ngọc, **không** tím.
- [ ] Vùng trống để đặt chữ nằm đúng chỗ prompt yêu cầu và đủ rộng.
- [ ] Không có người méo, thuyền méo, mái nhà méo, cột đổ nghiêng lạ.
- [ ] Ảnh nền trong suốt: mở ra thấy nền ô caro thật, không phải nền trắng vẽ vào.
- [ ] Không giống hệt một ảnh tham khảo nào.

### Thư viện câu sửa (dán nguyên câu tiếng Anh)

| Lỗi anh thấy | Câu dán vào ChatGPT |
|---|---|
| Có chữ / watermark | `Remove every letter, number, signature and watermark. No text anywhere. Keep everything else identical.` |
| Màu xanh dương / xanh ngọc quá nhiều | `Keep the composition identical. Re-grade: remove the blue and teal cast, shift the sky and water toward warm amber, antique gold #C9A44D and lacquer black #0F0D0A.` |
| Ảnh quá sáng, không sang | `Keep the composition identical. Darker, more low-key: deeper blacks #0F0D0A, fewer midtones, light only on the edges and the sun area.` |
| Vùng trống đặt chữ bị lấp | `Keep the scene, but clear the [left 45% / top 40%] of the frame: only calm mist, sky or water there, no objects.` |
| Trông giả, kiểu AI | `Make it more photographic: natural imperfections, fine film grain, softer contrast in the haze, less saturated, no over-sharpening, no glow halos.` |
| Quá giống ảnh tham khảo | `This is too close to the reference. Keep the mood and light but change the camera angle, the mountain arrangement and the position of the boat.` |
| Nền trong suốt bị trắng | `Output again as a PNG with a truly transparent background (alpha channel). Do not paint a white or checkerboard background.` |
| Người/thuyền bị méo | `Fix the anatomy and proportions of the [rower / boat / pavilion]; keep everything else identical.` |
| Sương/hoa văn quá dày | `Reduce density by half; keep the same style and placement logic.` |

---

# 3. Bản đồ 62 ảnh tham khảo

Phần này để anh và em cùng nắm ảnh nào dùng vào việc gì. ChatGPT đã được dặn lấy gì từ từng ảnh ngay trong prompt.

| File | Nội dung | Lấy gì | Bỏ gì |
|---|---|---|---|
| trang-an-1 | Thủy đình giữa hồ, vách núi phủ cây | Dáng thủy đình mái cong, vách đá cao dựng đứng | Ánh sáng trưa, màu xanh lá gắt |
| trang-an-2 | Núi có lỗ thủng, phản chiếu hồ lúc hoàng hôn | Mặt nước gương, trời hổ phách, bóng núi đối xứng | Cỏ xanh bờ hồ |
| trang-an-3 | Thủy đình, tảng đá nhô ra, nước tối | **Không khí chính của đầu trang**: tối, sâu, đá gần máy ảnh, thủy đình nhỏ | Nước hơi xanh |
| trang-an-4 | Thung lũng tia nắng qua dãy núi đá vôi (Bắc Sơn) | Tia nắng xuyên sương, nhiều lớp núi | Nhà dân, đồng xanh chói |
| trang-an-5 | Tia nắng qua núi, sông uốn giữa đồng | Tia nắng chéo, sông phản sáng | Màu xanh lá gắt |
| ha-long-1 | Người chèo đò, mặt trời hồng, vách đá | Người chèo đò nhỏ, mặt trời thấp giữa hai vách | Nước xanh ngọc, dòng chữ ký góc |
| ha-long-2 | Hòn Trống Mái lúc hoàng hôn | Mặt trời sát chân đá, mặt nước vàng cam | Mây quá kịch tính |
| ha-long-3 | Thuyền buồm, nước xanh ngọc | Hình thuyền buồm nâu đỏ | Toàn bộ màu xanh ngọc |
| ha-giang-1→4 | Ngân hà trên ruộng bậc thang ban đêm | Mật độ sao, dải ngân hà chéo, chân trời núi thấp | Trời tím/xanh, đèn làng, đèn pin, watermark 500px (ha-giang-3) |
| hoi-an-1 | Chùa Cầu đêm, hoa đăng trôi, sương | Sương trên nước, hoa đăng rải rác, vẻ tĩnh | Trời xanh dương, người |
| hoi-an-2 | Thuyền và hoa đăng hình sen | Hình hoa đăng sen, ánh nến, phản chiếu | Đám đông, trời xanh |
| hoi-an-3 | Thuyền lúc hoàng hôn cam | Dải trời cam sát chân trời | Đèn màu xanh tím |
| hoi-an-4 | Nhìn từ trên cao dòng sông đầy hoa đăng | "Dòng sông ánh sáng" | Nhà cao tầng, trời hồng tím |
| mu-cang-chai-1 | Ruộng bậc thang bình minh, lá chè tiền cảnh | Nắng ngược, sương thung lũng | Xanh lá gắt |
| mu-cang-chai-2 | Bậc thang trong sương, chòi nhỏ | Nhịp bậc thang, sương xám | — |
| mu-cang-chai-3 | Bậc thang hoàng hôn, mây | Đường cong bậc thang, mây trôi qua núi | Trời xanh |
| mu-cang-chai-4 | Bậc thang, chòi, người đứng | Hình chòi | Trời xanh |
| mu-cang-chai-5 | Tia nắng, đường mòn uốn, chòi | Con đường uốn lượn, tia nắng | Người làm ruộng |
| bon-mua-viet-1, 2, 5, 10 | Cây hoa gạo đỏ (mùa xuân) | Dáng cây gạo, hoa đỏ trên cành trơ lá | Người, xe đạp, chữ ký |
| bon-mua-viet-3 | Phượng Huế, cầu Tràng Tiền | Hoa phượng đỏ (mùa hạ) | Trời xanh, cầu sắt |
| bon-mua-viet-4 | Người hái chè giữa luống | — (không dùng) | — |
| bon-mua-viet-6, 11 | Hoa đào rừng, người H'Mông | Hoa đào hồng rừng núi | Người |
| bon-mua-viet-7 | Hồ Gươm, Tháp Rùa, lá non | Cành lá non, sương sớm | Tháp Rùa (không đưa vào) |
| bon-mua-viet-8 | Phố Hà Nội tia nắng qua hàng cây | Tia nắng qua tán cây | Xe cộ |
| bon-mua-viet-9 | Hoa mận trắng, em bé H'Mông | Hoa mận trắng | Người |
| son-mai-nguyen-gia-tri-1 | Sen trắng, cò (sơn mài) | Cách vẽ sen, lá sen vàng lục | Chữ ký, con dấu |
| son-mai-nguyen-gia-tri-2 | Cành đào, đàn trâu trên nền vàng | **Nền vàng-nâu ấm của sơn mài**, không gian rộng | — |
| son-mai-nguyen-gia-tri-3 | Tre, nhà, đỏ vàng | Lớp tre dát vàng trên đỏ son | — |
| son-mai-nguyen-gia-tri-4 | Trăng vàng, thác, nền đỏ | Trăng vàng lá, nền đỏ son, cây vàng | — |
| son-mai-nguyen-gia-tri-5 | Cây đào, nhà sàn, nền kem | Nét cành đào | Tông quá sáng |
| son-mai-nguyen-gia-tri-6 | Núi, bản làng nâu vàng | Tông nâu-vàng-đen, núi đá dựng | — |
| vang-la-kieu-ky-1, 2 | Dòng sông/mây vàng lá trên nền đen, cây tùng | **Cách dát vàng lá trên sơn đen**, mép vàng rách tự nhiên | Viền trắng (vang-la-2) |
| vang-la-kieu-ky-3 | Tấm vàng lá phẳng | Bề mặt vàng lá: vệt quét, nếp nhăn nhỏ | — |
| vang-la-kieu-ky-4 | Lá bạch quả vàng | Lá vàng xếp lớp, 2 mặt đậm nhạt | Nút giao diện góc phải dưới |
| xa-cu-1 | Hạc, mây xà cừ trên sơn đen | Mây xà cừ cuộn, viền vàng | Hạc (không dùng) |
| xa-cu-2, 3 | Mặt vỏ xà cừ thô | Ánh ngũ sắc của xà cừ | — |
| xa-cu-4 | Cành hoa hồng xà cừ trên đen | Cành hoa mảnh | Màu xanh lá |
| xa-cu-5 | Đại bàng xà cừ | — (không dùng) | — |
| xa-cu-6 | Uyên ương, gợn nước xà cừ | Gợn nước bằng xà cừ | — |
| xa-cu-7 | Mây xà cừ + hoa | Mây xà cừ | — |
| xa-cu-8 | Hoa diên vĩ xà cừ | — (không dùng) | Nắp hộp kim loại |
| xa-cu-9 | Hoa nhỏ xà cừ rải khắp nền đen | Mật độ rải thưa | Màu xanh dương |
| giay-do-1, 2 | Tấm giấy dó mép xơ | **Mép giấy xơ tự nhiên** | Chữ "Buy it from taipoz" (giay-do-1) |
| giay-do-3 | Mặt giấy dó có sợi | **Bề mặt giấy dó** | — |
| giay-do-4, 5 | Giấy dó có chữ in | Tông giấy | Toàn bộ chữ Hán, chữ Việt, con dấu |
| hoa-van-dong-son-1 | Mặt trống đồng (nét đỏ trên trắng) | **Bố cục vòng đồng tâm, ngôi sao 14 cánh, chim Lạc, hươu** | Màu đỏ-trắng |
| hoa-van-dong-son-2 | Mặt trống đồng thật (đồng) | Độ nổi, chất đồng | — |
| hoa-van-dong-son-3, 4, 6 | Các họa tiết chim Lạc, hươu, người, sao | Hình chim Lạc mỏ dài, hươu đốm | — |
| hoa-van-dong-son-5 | Tấm đồng xanh gỉ, xoắn ốc | Họa tiết xoắn ốc đôi | Màu xanh gỉ |

---

# 4. Nhóm L — Phong cảnh

**Mở cuộc trò chuyện mới trong Project, tên "L — Phong cảnh".** Gửi tin nhắn mở đầu này trước:

```text
We are starting GROUP L — LANDSCAPES for the Troi Nam homepage. All images in this chat are photographic plates of real Vietnamese places, shot like stills from a high-end nature documentary and graded like a luxury film.
Shared rules for every image in this chat:
- One low sun or one moon, raking side light, long soft shadows, volumetric light through mist, deep rich blacks.
- Layered depth: foreground, middle ground, far mountains dissolving into warm haze.
- Photorealistic, 35mm full-frame cinema look, fine natural film grain, no HDR halos, no oversaturation, no over-sharpening.
- Grade toward the project palette: lacquer black shadows #0F0D0A, umber midtones #3A3227, antique gold #C9A44D, light gold #F2DCA0, rare cinnabar #CE5B45, warm mist #A79E8B. No blue sky, no teal water, no purple.
- Every image reserves calm negative space for large headline text exactly where the prompt says.
- No text, logos, watermarks, modern buildings, crowds, drones or power lines.
Reply only "Ready for L01".
```

### L01 · Tràng An bình minh — ảnh đầu trang, máy tính [Ưu tiên 1]
*Dùng làm: ảnh nền đầu trang cho máy yếu, và khung hình mẫu để em dựng cảnh 3D cho khớp.*

```text
L01 — HERO PLATE, DESKTOP. Canvas: 1536x1024 landscape.

REFERENCES TO STUDY FIRST
- trang-an-3.jpg: the overall mood — dark, deep, a massive limestone rock face very close to the camera on one side, a small traditional water pavilion further away, still dark water. This is the main mood reference.
- trang-an-1.jpg: the exact silhouette of the Vietnamese water pavilion (thuy dinh): two tiers of curved roofs with upturned eave tips, dark wooden columns standing in the water.
- trang-an-2.jpg: the mirror-perfect reflection of karst peaks on still water and the warm amber sky.
- trang-an-4.jpg and trang-an-5.jpg: sun rays cutting diagonally through haze between layered karst towers.
- ha-long-1.jpg: the tiny figure of a rower standing in a small wooden boat, seen from behind, and the low sun sitting between two cliffs.
Do not copy any of these photos; combine these ideas into a new, original composition.

SCENE
Dawn at Trang An, Ninh Binh, Vietnam. A wide, calm lagoon of perfectly still water. Tall, steep limestone karst towers with vertical grey-gold rock faces and dark vegetation rise from the water in four depth layers; the farthest layers dissolve into luminous warm mist. On the far right edge, a huge dark rock face with overhanging texture fills the frame from top to bottom, very close to the camera, almost black, with gold light catching only its edges. In the middle distance, right of centre (about 65% from the left, horizon line), a small two-tier Vietnamese water pavilion with curved upturned eaves stands on wooden stilts in the water, its silhouette dark against the mist, a faint warm glow inside. Further left of the pavilion, a tiny wooden sampan with one rower in a conical hat standing and rowing, seen from behind, leaving a single thin V-shaped ripple line across the mirror water.
The sun has just risen behind the karst towers at about 70% from the left, hidden by a tower, so that 5–7 soft volumetric light shafts fan diagonally down-left through the mist. Mirror reflections of towers, pavilion and light on the water.

COMPOSITION (strict)
- Left 45% of the frame: calm, almost empty — soft glowing mist over still water and pale gold sky. Only very faint, far karst silhouettes allowed there. This area will hold a very large headline.
- Horizon at 58–62% of the height.
- Bottom 18%: dark still water with subtle reflections (a form panel may overlap here).
- Strong foreground-to-background depth; the eye travels from the dark rock on the right, to the pavilion, to the boat, into the bright mist on the left.

LIGHT
Single low sun, backlight and rim light. Mist glows gold where the rays pass. Rock faces receive only thin gold rim highlights. Deep shadows stay near-black but still hold detail.

COLOUR GRADE
Shadows #0F0D0A–#1C1813, midtones warm umber #3A3227, mist and sky from #A79E8B to #F2DCA0, brightest sun area #F8EBC6, a faint cinnabar #CE5B45 warmth right around the hidden sun. Vegetation on the rocks reads as dark olive-umber, never bright green. Water: black-gold, not blue, not teal.

CAMERA
Full-frame, 35mm lens, eye level about 1.5 m above the water, f/8 for deep focus, natural film grain.

MUST NOT
No text, no watermark, no signature, no modern boats, no tourists, no bright green, no blue sky, no teal water, no lens flare stars, no birds flock clichés.
```
**Kiểm tra riêng:** bên trái 45% phải gần như trống; thủy đình có 2 tầng mái cong; người chèo nhỏ và nhìn từ phía sau; lá cây trên núi không xanh lè.

### L02 · Tràng An bình minh — bản điện thoại [Ưu tiên 1]

```text
L02 — HERO PLATE, MOBILE. Canvas: 1024x1536 portrait.
Same place, same dawn light, same colour grade and same world as L01 — it must look like a second frame from the same shoot. Study L01 (the image you just made) plus trang-an-3.jpg (mood) and trang-an-2.jpg (reflection).

SCENE
Vertical view of the Trang An lagoon at dawn. Two or three tall karst towers stacked in depth in the middle band of the frame, warm mist between them. The sun hidden behind the tallest tower on the upper right, 4–5 volumetric light shafts falling diagonally down-left. The two-tier water pavilion small in the middle-right, on stilts. The tiny rower in a sampan in the lower middle, seen from behind, a thin ripple behind the boat. Perfect reflections.

COMPOSITION (strict)
- Top 38%: calm glowing gold sky and mist only — reserved for a two-line headline.
- Middle 40%: karst towers, pavilion, light shafts.
- Bottom 22%: dark still water with soft reflections — a form will cover it.

LIGHT, GRADE, CAMERA, MUST NOT: identical to L01.
```

### L03 · Chạng vạng chuyển đêm [Ưu tiên 1]
*Dùng làm: khung hình mẫu cho đoạn cuộn trang từ ngày sang đêm.*

```text
L03 — DUSK TRANSITION PLATE. Canvas: 1536x1024 landscape.

REFERENCES TO STUDY FIRST
- ha-long-2.jpg: the sun sitting right at the base of the rocks and the warm band of light on the water.
- trang-an-2.jpg: the mirror reflection of karst on still water and the amber sky.
- ha-giang-4.jpg: how the first stars appear over mountains at the end of twilight (but ignore its purple colour).

SCENE
The same Trang An lagoon and karst towers as L01, seen from a slightly lower and wider angle, at the very end of dusk. The sun has set. A thin, glowing band of amber and faint cinnabar sits low on the horizon behind the karst silhouettes. Above it the sky deepens smoothly to warm ink-black. The first 15–25 stars are visible high in the upper third, small and warm white. The water still holds a soft amber reflection band and the dark mirror shapes of the towers. Thin low mist lies on the water. The water pavilion from L01 is a tiny dark silhouette on the right with one warm lamp glowing inside; its lamp reflects as a thin line on the water.

COMPOSITION (strict)
- Karst silhouettes occupy only the bottom 35%.
- Upper 65% is open sky, graded from amber at the horizon to near-black #0F0D0A at the top.
- Keep the centre of the sky empty of stars in a soft oval (a star diagram will be drawn there later).

COLOUR GRADE
Horizon band #F2DCA0 → #C9A44D → #CE5B45 at its core; sky above #3A3227 → #15120E → #080706. Silhouettes #080706. No blue hour blue, no purple.

MUST NOT
No text, no watermark, no city lights, no aircraft, no moon, no clouds covering the upper sky.
```

### L04 · Trời sao trên non nước — máy tính [Ưu tiên 1]
*Dùng làm: nền cho khối "108 vì sao. 12 cung." và ảnh thay thế trời 3D.*

```text
L04 — NIGHT SKY PLATE, DESKTOP. Canvas: 1536x1024 landscape.

REFERENCES TO STUDY FIRST
- ha-giang-1.jpg, ha-giang-2.jpg, ha-giang-3.jpg, ha-giang-4.jpg: star density, the texture and structure of the Milky Way core with dark dust lanes, and the relationship between a vast sky and a low mountain horizon. IGNORE their blue/purple colours, village lights, the flashlight person and the 500px watermark on ha-giang-3.jpg.
- ha-long-1.jpg and ha-long-3.jpg: the silhouettes of steep karst islands rising from the sea.

SCENE
Deep night over Ha Long Bay. A vast, dense, realistic starry sky fills most of the frame. The Milky Way arches diagonally from the lower left to the upper right, its core warm cream and pale gold with intricate dark dust lanes. Thousands of fine stars of varying brightness; a few brighter stars with a very subtle warm glow. Steep karst islands form pure black silhouettes along the bottom quarter, some close and large, some far and small. The sea below is calm, holding faint starlight reflections and a thin whisper of mist.

COMPOSITION (strict)
- Sky: top 76% of the frame.
- Keep a soft, slightly less dense oval region in the centre of the sky (around 40% of the frame width) — a golden 12-cell star diagram will be drawn over it later. Do not put the Milky Way core in that oval; let it pass beside it.
- Karst silhouettes and water: bottom 24%.

COLOUR GRADE
Sky base warm ink #080706 → #15120E with umber undertone #3A3227 near the horizon. Stars warm white #F8EBC6 and pale gold #F2DCA0. Milky Way core cream-amber, never magenta, never blue. Silhouettes #080706.

CAMERA
Long-exposure astrophotography look, 20mm lens, pin-sharp stars (no trails), natural noise.

MUST NOT
No text, no watermark, no village lights, no people, no torches, no meteors, no aurora, no moon, no blue, no purple, no magenta.
```

### L05 · Trời sao — điện thoại [Ưu tiên 1]

```text
L05 — NIGHT SKY PLATE, MOBILE. Canvas: 1024x1536 portrait.
Same night, same grade, same star treatment as L04, recomposed vertically. Study L04 plus ha-giang-2.jpg (a near-vertical Milky Way).
The Milky Way runs almost vertically from bottom-left to top-centre. Keep a softer, less dense oval in the middle of the sky (about 60% of the frame width) for a star diagram. Karst silhouettes and calm water in the bottom 18% only.
Same MUST NOT as L04.
```

### L06 · Hội An đêm hoa đăng — khối kết trang, máy tính [Ưu tiên 1]

```text
L06 — CLOSING PLATE, DESKTOP. Canvas: 1536x1024 landscape.

REFERENCES TO STUDY FIRST
- hoi-an-1.jpg: the quiet, misty mood; many small lanterns scattered on dark water; soft mist floating over the river.
- hoi-an-2.jpg: the shape of paper lotus lanterns with pointed petals and a glowing candle inside, and their reflections.
- hoi-an-4.jpg: the idea of a "river of light" — lanterns forming a long flowing path.
- hoi-an-3.jpg: only the thin warm band of light at the horizon.
IGNORE all blue skies, crowds, tourists, modern buildings, coloured LED lights and boats full of people in the references.

SCENE
Night on the Hoai River in Hoi An's old town during the full-moon lantern festival, but completely calm and nearly deserted. Around sixty small paper lotus lanterns (cream, pale pink, soft red and warm yellow petals, each with a candle glowing inside) float on black, glassy water and form a gentle diagonal river of light from the lower left toward the middle right, getting smaller with distance. Low mist floats over the water between the lanterns. On the far bank, traditional two-storey Hoi An shophouses with yellow walls, dark wooden shutters and tiled roofs are soft and out of focus, with a few round silk lanterns (red and amber) hanging from their eaves, rendered as large soft bokeh. A single empty wooden boat is moored at the right edge, dark. A full moon hangs low on the upper left, cream-gold, softly haloed.

COMPOSITION (strict)
- Upper-centre area (from 25% to 75% of the width, top 45% of the height): calm dark sky and soft bokeh only — reserved for a closing headline and a button.
- Lanterns concentrated in the lower 45%, the path leading the eye toward the centre.

COLOUR GRADE
Water and sky #080706–#15120E. Candle light #F8EBC6 → #F2DCA0 → #C9A44D. Silk lanterns #CE5B45 and deep #6B211A. Walls muted ochre, desaturated. No blue, no purple, no neon.

CAMERA
50mm lens, f/1.8, shallow depth of field, rich round bokeh, low angle close to the water surface.

MUST NOT
No text, no shop signs, no people in focus, no crowds, no LED, no fireworks, no watermark.
```

### L07 · Hội An đêm hoa đăng — điện thoại [Ưu tiên 2]

```text
L07 — CLOSING PLATE, MOBILE. Canvas: 1024x1536 portrait.
Same scene, grade and lens as L06, recomposed vertically. Floating lotus lanterns fill the bottom 45% and lead the eye upward; blurred shophouses with silk lantern bokeh sit in the middle band; the top 40% is calm dark sky with a low cream-gold full moon on the upper left, reserved for text.
Same MUST NOT as L06.
```

### L08 · Ruộng bậc thang mùa nước đổ — khối "Năm nay của bạn" [Ưu tiên 2]

```text
L08 — TERRACES PLATE. Canvas: 1536x1024 landscape.

REFERENCES TO STUDY FIRST
- mu-cang-chai-3.jpg: the sweeping curved lines of terraces following the hill contour, and clouds drifting through the mountain passes.
- mu-cang-chai-1.jpg: the backlit golden sunrise and the misty valley depth.
- mu-cang-chai-5.jpg: the winding footpath and the sun rays over the slope.
- mu-cang-chai-2.jpg: the rhythm of the stepped terrace walls in mist.
IGNORE the bright green colour, blue sky and people.

SCENE
Mu Cang Chai rice terraces in water season, at sunset. The terraces are flooded: each curved step is a thin mirror of still water reflecting the amber sky, separated by dark earth walls with a thin line of young rice. The terraces flow in large sweeping curves from the lower right toward the centre. A narrow earthen footpath winds up through them. One small stilt hut with a thatched roof sits on a terrace in the middle distance. Behind, layered dark mountain ridges fade into golden mist; soft clouds drift through a mountain pass. The low sun on the right sends a few gentle rays across the valley.

COMPOSITION (strict)
- Left 40%: soft sky, mist and far ridges only — reserved for text.
- Terrace curves dominate the right 60% and the bottom.

COLOUR GRADE
Earth walls #1C1813–#3A3227, water reflections #C9A44D–#F2DCA0, sun core #F8EBC6 with a faint #CE5B45 edge, young rice muted olive-gold (not bright green).

MUST NOT
No text, no people, no modern houses, no watermark, no bright green.
```

### L09 → L12 · Bốn mùa cho cảnh đầu trang [Ưu tiên 2]
*Làm trong cùng cuộc trò chuyện, ngay sau L01. Mỗi mùa một tin nhắn.*

```text
L09 — SPRING version of L01. Canvas 1536x1024.
Keep EXACTLY the same composition, camera, karst layout, pavilion, rower, light direction and the empty left 45% as L01. Change only the season:
Late spring in northern Vietnam. In the near foreground at the top-left corner, a few bare, dark, gnarled branches of a red silk-cotton tree (hoa gao) carrying clusters of bright cinnabar-red five-petal flowers, softly out of focus, framing the corner without entering the text area deeply. A few red petals floating on the water surface near the bottom. Fresher, slightly softer morning light.
References for the tree and flowers: bon-mua-viet-1.jpg, bon-mua-viet-5.jpg, bon-mua-viet-10.jpg (look at the branch shape and the flower clusters only; ignore people, bicycles, signatures).
Same palette and MUST NOT as L01.
```

```text
L10 — TET / NEW-YEAR version of L01. Canvas 1536x1024.
Keep EXACTLY the same composition as L01. Change only the season:
Tet in the northern mountains. In the near foreground at the top-left corner, soft out-of-focus branches of wild pink peach blossom (hoa dao rung) mixed with a few white plum blossoms (hoa man), framing the corner. A few pink and white petals drifting in the air and resting on the water. Cool-warm soft morning light, slightly thicker mist.
References for the blossoms: bon-mua-viet-6.jpg, bon-mua-viet-11.jpg (pink peach), bon-mua-viet-9.jpg (white plum), son-mai-nguyen-gia-tri-2.jpg (the elegance of a single blossoming branch). Ignore all people.
Same palette and MUST NOT as L01.
```

```text
L11 — SUMMER version of L01. Canvas 1536x1024.
Keep EXACTLY the same composition as L01. Change only the season:
Summer. In the bottom foreground across the width (but lower than the text area), large round lotus leaves lying on the water and three pink lotus flowers (one open, two buds) standing on stems, sharply detailed, dew on the leaves. Warmer, brighter golden mist; a few red flame-tree (hoa phuong) flowers on a branch entering from the top-right edge.
References: son-mai-nguyen-gia-tri-1.jpg (the drawing of lotus leaves and flowers), bon-mua-viet-3.jpg (flame-tree flowers only).
Same palette and MUST NOT as L01.
```

```text
L12 — AUTUMN/WINTER version of L01. Canvas 1536x1024.
Keep EXACTLY the same composition as L01. Change only the season:
Late autumn turning into winter. Thicker, colder white-cream mist lying low on the water and swallowing the farthest karst layers; the sun is a pale gold disc softly visible through the mist. A single bare dark branch enters from the top-left corner. A few yellow leaves float on the water in the foreground. The overall grade is slightly cooler but still warm-neutral (no blue).
Reference for light through tree branches: bon-mua-viet-8.jpg (light rays through foliage only; ignore the street and vehicles).
Same palette and MUST NOT as L01.
```

### L13 · Thung lũng tia nắng — ảnh chuyển cảnh [Ưu tiên 2]

```text
L13 — VALLEY OF LIGHT PLATE. Canvas: 1536x1024 landscape.

REFERENCES TO STUDY FIRST
- trang-an-4.jpg: a panorama of many rounded karst peaks in rows, with strong volumetric sun rays pouring through gaps in low clouds.
- trang-an-5.jpg: the river curving through the valley floor and catching the light.
IGNORE houses, bright green fields and the signature in the corner.

SCENE
A high viewpoint over a wide valley ringed by rows of rounded limestone karst peaks, just after sunrise. A thick layer of cloud sits above the peaks with a bright gold gap near the top centre; from it, 10–14 long, well-defined volumetric sun rays fan down across the valley. A calm river curves through the valley floor as a ribbon of reflected gold light. The valley floor is soft and dark, mostly in shadow, with the fields reading as muted olive-umber.

COMPOSITION
- Top 30%: cloud layer and the bright gap.
- Rays across the middle 50%.
- Keep the centre of the frame uncluttered for a single short line of text.

COLOUR GRADE
Clouds #3A3227 with gold edges #F2DCA0; rays #F8EBC6 at 30–50% opacity feel; peaks #15120E–#1C1813; river #C9A44D.

MUST NOT
No text, houses, roads, vehicles, bright green, blue sky, watermark.
```

---

# 5. Nhóm T — Chất liệu, texture

**Cuộc trò chuyện mới "T — Chất liệu".** Tin nhắn mở đầu:

```text
We are starting GROUP T — MATERIALS & TEXTURES for the Troi Nam homepage. These are traditional Vietnamese craft surfaces: son mai lacquer, gold leaf from Kieu Ky, mother-of-pearl inlay (kham xa cu), do paper. They will be used as website backgrounds, overlays and 3D surface textures.
Shared rules for every image in this chat:
- Unless the prompt says otherwise: flat, top-down, orthographic view, evenly lit with one very soft raking light from the upper left, no perspective, no vignette, no drop shadow, no frame, no central focal point.
- "Seamless tileable" means the left edge continues perfectly into the right edge and the top into the bottom, so the tile can repeat with no visible seam or repeating landmark.
- Subtle and low-contrast: large text must stay readable on top of these surfaces.
- Real craft, not digital: natural irregularities, real material behaviour under light.
- No text, characters, signatures, stamps, logos or watermarks.
Reply only "Ready for T01".
```

### T01 · Nền sơn mài đen (nền chính toàn trang) [Ưu tiên 1]

```text
T01 — BASE LACQUER TILE. Canvas: 1024x1024, seamless tileable.

REFERENCES TO STUDY FIRST
- vang-la-kieu-ky-1.jpg and vang-la-kieu-ky-2.jpg: look only at the black background areas — a deep, polished, slightly layered black lacquer with faint depth.
- son-mai-nguyen-gia-tri-6.jpg: the warm brown-black undertone that lives inside Vietnamese lacquer.

SUBJECT
A polished Vietnamese son mai black lacquer surface, as seen on a museum lacquer panel. The surface is almost uniformly black but has depth: extremely subtle cloudy variations of warm umber inside the black (as if several lacquer layers were sanded and polished), a microscopic crackle network visible only when looking closely, and 6–10 microscopic specks of gold dust scattered randomly. No reflections of windows or objects.

VALUES
90% of the pixels between #0F0D0A and #1C1813. Umber clouds no brighter than #2A241C. Gold specks #C9A44D, each smaller than 3 pixels.

MUST
Perfectly seamless on all four edges, no repeating recognisable blotch, no vignette, no text.
```
**Kiểm tra riêng:** ảnh gần như đen hoàn toàn là đúng. Nhìn gần phải thấy chiều sâu mờ bên trong.

### T02 · Tấm vàng lá Kiêu Kỵ (chất vàng cho chữ, nút, viền) [Ưu tiên 1]

```text
T02 — GOLD LEAF SHEET TILE. Canvas: 1024x1024, seamless tileable.

REFERENCES TO STUDY FIRST
- vang-la-kieu-ky-3.jpg: the surface of real beaten gold leaf — fine vertical brush-stroke streaks, tiny wrinkles, slightly uneven reflectivity.

SUBJECT
A continuous surface of hand-applied Vietnamese gold leaf (vang la Kieu Ky) laid in overlapping square sheets on lacquer. Visible: very faint straight overlap lines where the square leaves meet (in a loose grid of about 4x4 leaves across the tile), fine vertical brushing streaks, micro-wrinkles, soft variation between brighter and slightly duller zones. Antique, warm, noble gold — not yellow plastic, not orange.

VALUES
Base #C9A44D, highlights up to #F2DCA0, darker streaks down to #9A7730. Even overall brightness so it can be used behind text as a gold fill.

MUST
Seamless on all four edges, flat front view, no shadows, no text.
```

### T03 · Vụn vàng lá rời (lớp phủ lấp lánh) [Ưu tiên 1]

```text
T03 — GOLD LEAF FLAKES OVERLAY. Canvas: 1024x1024, TRANSPARENT BACKGROUND PNG.

REFERENCES TO STUDY FIRST
- vang-la-kieu-ky-1.jpg and vang-la-kieu-ky-2.jpg: the torn, organic edges of gold leaf fragments on black lacquer and how the gold catches light unevenly.
- vang-la-kieu-ky-3.jpg: the surface texture of the gold.

SUBJECT
28–36 separate fragments of real gold leaf, torn by hand: irregular shapes with ragged, slightly curling edges, sizes varying from tiny specks (6 px) to a few larger flakes (up to 90 px). Some flakes are flat, some slightly crinkled so one edge catches a brighter highlight. Distribution: denser toward the four corners, nearly empty in the central 50% of the canvas. Only the gold flakes exist in the image — the background is fully transparent.

VALUES
Gold #C9A44D base, edge highlights #F8EBC6, crinkle shadows #755718.

MUST
Real alpha transparency. No background colour, no drop shadow, no text.
```

### T04 · Dải tranh dát vàng trên sơn đen (dải trang trí ngang giữa các khối) [Ưu tiên 1]

```text
T04 — GILDED LACQUER BAND. Canvas: 1536x1024 landscape.

REFERENCES TO STUDY FIRST
- vang-la-kieu-ky-1.jpg and vang-la-kieu-ky-2.jpg: THE key reference — a flowing river/cloud shape made of gold leaf laid on black lacquer, with ragged natural gold edges, and small dark pine trees painted on and around it.
- son-mai-nguyen-gia-tri-6.jpg: layered Vietnamese karst mountains in lacquer painting style.
- son-mai-nguyen-gia-tri-4.jpg: the big round gold-leaf moon.

SUBJECT
An original Vietnamese son mai lacquer artwork, horizontal: a wide river of hammered gold leaf flows from the left edge to the right edge across the middle of the panel like a winding river seen from above, with ragged natural edges and slight texture variation. Along its banks, stylised karst mountain silhouettes and small wind-shaped pine trees are painted in layers of deep black, dark umber and very dark olive lacquer, with thin gold highlights on their ridges. A round gold-leaf moon sits at the upper right. The background is polished black lacquer.

COMPOSITION
The gold river runs through the middle 40% of the height; the top and bottom 30% are mostly black lacquer so the band can be cropped to a thin horizontal strip (1536x400) without losing the idea.

VALUES
Black #0F0D0A, umber #3A3227, gold #C9A44D–#F2DCA0, one tiny touch of cinnabar #CE5B45 on the moon's edge.

MUST
Flat frontal view of the artwork itself (no frame, no wall, no room), handmade lacquer feel, no signature, no stamp, no text.
```

### T05 · Mặt xà cừ thô (chất ánh ngũ sắc) [Ưu tiên 2]

```text
T05 — MOTHER-OF-PEARL SURFACE TILE. Canvas: 1024x1024, seamless tileable.

REFERENCES TO STUDY FIRST
- xa-cu-2.jpg and xa-cu-3.jpg: the raw nacre surface — soft layered ripples and iridescent colour shifts.

SUBJECT
A flat, polished surface of mother-of-pearl nacre, with gentle flowing layered ripples. Iridescence present but restrained and warmed: cream, champagne gold, faint rose and only a whisper of pale green; no strong blue, no violet.

VALUES
Base #EAE4D5–#F6F1E6, iridescent accents up to 15% saturation, gold tint #F2DCA0.

MUST
Seamless edges, flat, even light, no text.
```

### T06 · Sơn đen khảm xà cừ rải thưa [Ưu tiên 2]

```text
T06 — SPARSE PEARL-INLAY LACQUER TILE. Canvas: 1024x1024, seamless tileable.

REFERENCES TO STUDY FIRST
- xa-cu-9.jpg: small flowers and vines of mother-of-pearl scattered across black lacquer — the scattering logic.
- xa-cu-4.jpg: the delicacy and fine gold outlines of the branches.

SUBJECT
Black lacquer with a sparse, delicate scatter of tiny mother-of-pearl inlay pieces: small five-petal blossoms (8–20 px) and thin gold-outlined vine tendrils, covering no more than 12% of the surface, evenly but randomly distributed so there is no visible grid. Pearl pieces are warm cream and champagne with subtle iridescence.

VALUES
Background #0F0D0A–#15120E. Pearl #EAE4D5 with iridescent accents under 15% saturation, no blue. Gold outlines #C9A44D.

MUST
Seamless edges, flat, no focal point, no text.
```

### T07 · Mây khảm xà cừ rời (họa tiết mây trang trí) [Ưu tiên 1]

```text
T07 — PEARL-INLAY CLOUDS. Canvas: 1536x1024, TRANSPARENT BACKGROUND PNG.

REFERENCES TO STUDY FIRST
- xa-cu-1.jpg and xa-cu-7.jpg: the auspicious swirling clouds made of mother-of-pearl pieces with thin gold outlines, and the long flowing wisp-tails trailing from them.

SUBJECT
Four separate, isolated auspicious cloud motifs (may lanh) made of inlaid mother-of-pearl, each outlined with a thin antique-gold line, with curling spiral heads and long tapering wisp tails. Different sizes (from about 200 px to 600 px wide), arranged with generous transparent space between them so each can be cut out individually. Pearl is warm cream-champagne with restrained iridescence (no strong blue or violet). Nothing else in the image: no cranes, no flowers, no background.

MUST
Real transparent background, crisp edges, no text.
```

### T08 · Mặt giấy dó (nền tấm luận giải mẫu) [Ưu tiên 1]

```text
T08 — DO PAPER TILE. Canvas: 1024x1024, seamless tileable.

REFERENCES TO STUDY FIRST
- giay-do-3.jpg: THE key reference — warm cream handmade do paper with visible natural fibres and tiny bark specks.
- giay-do-2.jpg: the soft, thick, slightly matte body of the paper.
IGNORE every character, print, stamp and watermark in giay-do-1.jpg, giay-do-4.jpg and giay-do-5.jpg.

SUBJECT
Flat handmade Vietnamese do paper made from do bark fibre: warm cream, with long, thin, randomly oriented fibres, occasional tiny brown bark specks, very soft cloud-like density variations, matte surface. No folds, no stains, no torn edges, no ink.

VALUES
Base #EAE4D5 → #F6F1E6, fibres slightly darker #DCD4C3 and #C5BCA8, bark specks #6E6656.

MUST
Seamless edges, flat and evenly lit, no text, no characters.
```

### T09 · Tấm giấy dó mép xơ (khung tấm luận giải) [Ưu tiên 2]

```text
T09 — DO PAPER SHEET WITH DECKLE EDGES. Canvas: 1024x1536 portrait, TRANSPARENT BACKGROUND PNG.

REFERENCES TO STUDY FIRST
- giay-do-1.jpg: the natural torn, fibrous deckle edge of a do paper sheet (IGNORE the "Buy it from taipoz" watermark and the shadows of leaves).
- giay-do-2.jpg: the thickness and softness of the edge.
- T08 (the image you made): use the same paper surface.

SUBJECT
A single rectangular sheet of Vietnamese do paper filling about 88% of the canvas, perfectly flat and front-facing, with all four edges naturally deckled: soft, feathery, slightly uneven fibrous borders a few millimetres wide. The surface is the same cream fibrous paper as T08, completely blank. Outside the sheet, the background is fully transparent.

MUST
No shadow, no curl, no perspective, no text, real transparency outside the paper.
```

### T10 · Tranh sơn mài "Trời Nam" (tranh lớn trang trí) [Ưu tiên 2]

```text
T10 — "TROI NAM" LACQUER PAINTING. Canvas: 1024x1536 portrait.

REFERENCES TO STUDY FIRST
- son-mai-nguyen-gia-tri-4.jpg: the big hammered gold-leaf moon, the deep cinnabar-red lacquer sky, the gold trees.
- son-mai-nguyen-gia-tri-6.jpg: the layered karst mountains and small village rendered in brown, gold and black lacquer.
- son-mai-nguyen-gia-tri-2.jpg: the vast warm gold space and the quiet poetry of a single blossoming branch.
- son-mai-nguyen-gia-tri-3.jpg: bamboo painted in gold over red.
Create an ORIGINAL painting in the tradition of Vietnamese son mai lacquer masters — do not copy any of these paintings.

SUBJECT
A vertical Vietnamese lacquer painting: a still river winds through tall karst mountains at night; a large round gold-leaf moon in the upper third; a small sampan with a single rower on the river; a blossoming peach branch enters from the top-left; tiny inlaid eggshell and mother-of-pearl specks form a scatter of stars in the sky. Technique visible: layered lacquer sanded back to reveal colour, gold leaf, silver leaf, eggshell inlay, polished surface.

PALETTE
Sky deep cinnabar-to-black (#6B211A → #0F0D0A), mountains umber and black with gold ridge highlights, moon and river gold #C9A44D–#F2DCA0, blossoms soft pink-cream.

MUST
Flat frontal view of the painting surface only (no frame, no wall), no signature, no seal, no text.
```

### T11 · Sương rời (lớp sương bay trên cảnh 3D) [Ưu tiên 1]

```text
T11 — MIST SPRITES. Canvas: 1536x1024, TRANSPARENT BACKGROUND PNG.

REFERENCES TO STUDY FIRST
- trang-an-5.jpg and mu-cang-chai-1.jpg: how morning mist lies in soft layered bands in valleys and over water.
- hoi-an-1.jpg: thin mist floating just above the river surface.

SUBJECT
Three separate horizontal wisps of realistic mist, each isolated on a transparent background with lots of empty space around it: one long thin band (about 1200x180 px), one medium soft cloud-like mass (about 700x300 px), one small torn wisp (about 400x160 px). Colour warm cream-white #F6F1E6 with a faint gold tint; density highest in the middle of each wisp and fading smoothly to fully transparent at every edge. No landscape, no sky, no background.

MUST
Real alpha transparency, no hard edges, no text.
```

---

# 6. Nhóm P — Hoa văn, pattern

**Cuộc trò chuyện mới "P — Hoa văn".** Tin nhắn mở đầu:

```text
We are starting GROUP P — ORNAMENTS & PATTERNS for the Troi Nam homepage, based on authentic Vietnamese Dong Son bronze-drum motifs and traditional auspicious clouds. They will be used as thin gold line ornaments on a black website.
Shared rules for every image in this chat:
- Clean, precise, vector-like line art in antique gold #C9A44D on a TRANSPARENT background, unless the prompt says otherwise.
- Even stroke weight, crisp edges, no gradients inside strokes, no shading, no 3D.
- Culturally accurate: stay faithful to real Dong Son iconography (the central star, concentric bands, stylised Lac birds with long beaks and feathered crests, spotted deer, tangent circles, zigzag bands). Do not invent Chinese characters, dragons or Western zodiac signs.
- No text, numbers or letters.
Reply only "Ready for P01".
```

### P01 · Mặt trống đồng Đông Sơn — vòng lớn (vòng sáng quanh lá số) [Ưu tiên 1]

```text
P01 — DONG SON DRUM TYMPANUM. Canvas: 1024x1024, TRANSPARENT BACKGROUND PNG.

REFERENCES TO STUDY FIRST
- hoa-van-dong-son-1.jpg: THE key reference for structure — the complete tympanum layout: a central star with pointed rays and small motifs between the rays, then concentric bands of geometric patterns alternating with figurative bands.
- hoa-van-dong-son-2.jpg: the real bronze drum surface, for the proportions of each band.
- hoa-van-dong-son-3.jpg and hoa-van-dong-son-4.jpg: the drawing style of flying Lac birds and spotted deer.

SUBJECT
A perfectly circular, symmetric Dong Son bronze-drum tympanum drawn as thin antique-gold line art:
1. Centre: a 14-pointed star with sharp rays; small feather-like motifs between the rays.
2. Band: a ring of tangent circles with a dot in each.
3. Band: a ring of small zigzag triangles.
4. Figurative band: a procession of 6 spotted deer walking in one direction alternating with 6 small standing Lac birds.
5. Band: tangent circles again.
6. Wide outer figurative band: 16 flying Lac birds with long beaks and long crests, all flying counter-clockwise, evenly spaced.
7. Outer rings: a fine zigzag border and a thin double circle.
Stroke weight uniform (like 2 px at 1024 px), gold #C9A44D, everything centred and radially symmetric.

MUST
Real transparent background, no human figures, no houses or boats, no text, no colours other than gold.
```
**Kiểm tra riêng:** ngôi sao giữa có **14 cánh** (đúng trống đồng Ngọc Lũ); chim bay cùng một chiều; hình tròn đều, không méo.

### P02 · Bộ họa tiết Đông Sơn rời [Ưu tiên 1]

```text
P02 — DONG SON MOTIF SET. Canvas: 1536x1024, TRANSPARENT BACKGROUND PNG.

REFERENCES TO STUDY FIRST
- hoa-van-dong-son-3.jpg, hoa-van-dong-son-4.jpg, hoa-van-dong-son-6.jpg: the individual motifs — flying Lac bird, standing Lac bird, spotted deer, the 14-point star, a feathered boat.
- hoa-van-dong-son-5.jpg: the double spiral (S-shaped) motif.

SUBJECT
A clean sheet of 8 separate Dong Son motifs, arranged in a 4x2 grid with generous transparent space around each, all in the same gold line style:
Row 1: a flying Lac bird (long beak, spread wings, long crest), a standing Lac bird, a spotted deer walking, a 14-point star.
Row 2: a long ceremonial boat with a feathered prow (no people on it), a double S-spiral, a band segment of tangent circles, a band segment of zigzag triangles.
Line colour gold #C9A44D, uniform stroke, filled areas allowed only as solid gold where the original motif is solid.

MUST
Real transparent background, no human figures, no text.
```

### P03 · Dải viền Đông Sơn liền mạch (đường kẻ trang trí ngang) [Ưu tiên 2]

```text
P03 — DONG SON FRIEZE STRIP. Canvas: 1536x1024, TRANSPARENT BACKGROUND PNG.

REFERENCES TO STUDY FIRST
- hoa-van-dong-son-1.jpg: the concentric geometric bands, unrolled into straight lines.

SUBJECT
Three separate horizontal frieze strips stacked with transparent space between them, each exactly 1536 px wide and seamless left-to-right (the right end continues into the left end):
Strip 1 (about 60 px tall): a row of tangent circles with centre dots between two thin lines.
Strip 2 (about 60 px tall): a row of small zigzag triangles between two thin lines.
Strip 3 (about 140 px tall): a procession of Lac birds flying left-to-right, evenly spaced, between two double lines.
Gold #C9A44D thin line art.

MUST
Seamless horizontal repeat, real transparency, no text.
```

### P04 · Mây lành nét vàng (họa tiết mây truyền thống) [Ưu tiên 1]

```text
P04 — AUSPICIOUS CLOUD LINE ORNAMENTS. Canvas: 1536x1024, TRANSPARENT BACKGROUND PNG.

REFERENCES TO STUDY FIRST
- xa-cu-1.jpg and xa-cu-7.jpg: the silhouettes of the traditional curling clouds (spiral heads, long tapering tails) — use only their outline shapes, not the pearl material.
- vang-la-kieu-ky-1.jpg: the elegance of a gilded line on lacquer.

SUBJECT
Three separate auspicious cloud motifs (may lanh) drawn as elegant continuous line art in antique gold #C9A44D, like a gilded carving on a lacquer altar: spiral heads, layered inner curls, long tapering wisp tails. Sizes about 300, 500 and 800 px wide, arranged loosely with transparent space between them.
Uniform thin stroke, no fill, no shading.

MUST
Real transparent background, no text, no characters.
```

### P05 · Vòng 12 phần (khung vòng tròn cho lá số) [Ưu tiên 2]

```text
P05 — 12-SEGMENT RING. Canvas: 1024x1024, TRANSPARENT BACKGROUND PNG.

REFERENCES TO STUDY FIRST
- hoa-van-dong-son-1.jpg: the ring bands of tangent circles and zigzags.
- P01 (the image you made): same stroke and gold.

SUBJECT
A circular ornamental ring, inspired by Dong Son band patterns but divided into exactly 12 equal segments by 12 short radial ticks, like a clock face for the 12 earthly branches. Between ticks: alternating tangent-circle and zigzag band segments. Inner diameter about 70% of the outer diameter; the centre is completely empty and transparent. Thin gold #C9A44D line art, perfectly symmetric.

MUST
Exactly 12 segments, empty transparent centre, no numbers, no characters, no text.
```

---

# 7. Nhóm S — Tranh 4 nỗi lo (thẻ lớn)

**Cuộc trò chuyện mới "S — Tranh nỗi lo".** Tin nhắn mở đầu:

```text
We are starting GROUP S — STORY PLATES for the Troi Nam homepage: four cinematic vignettes, each a poetic visual metaphor for a life question, set in Vietnam at dusk or night, lit by one warm light source (sunset, candle, lantern or moon). They form ONE series: same grade, same lens, same light temperature.
Shared rules:
- Photorealistic, 50mm lens, shallow depth of field, fine grain, museum-quality still-life mood.
- The subject sits in the lower or middle third; the top 35% stays calm and dark for a card title.
- Palette: lacquer black #0F0D0A, umber #3A3227, antique gold #C9A44D, light gold #F2DCA0, one cinnabar accent #CE5B45, jade-grey mist #A79E8B.
- No human faces, no text, no Chinese characters, no logos, no watermarks.
Reply only "Ready for S01".
```

### S01 · Hiểu bản thân — gương đồng soi trời sao [Ưu tiên 1]

```text
S01 — UNDERSTAND YOURSELF. Canvas: 1024x1536 portrait.
References: vang-la-kieu-ky-1.jpg (gold on black lacquer), hoa-van-dong-son-2.jpg (the patina and relief of ancient bronze), ha-giang-1.jpg (star density; ignore colours).
SCENE: An antique round bronze hand mirror with a short handle lies on a polished black lacquer table at night, at the edge of still water. The back rim of the mirror carries a faint Dong Son-style relief (tiny star and rings). The mirror face reflects a dense warm starry sky and a thin crescent moon — the reflection is the brightest thing in the frame. Behind, a line of low mist over black water and faint karst silhouettes. Light: cool dim moonlight from above plus a small warm candle glow entering from the right edge, catching the bronze rim in gold.
Metaphor: seeing yourself clearly under your own sky.
Composition: mirror in the lower-middle third, slightly off-centre; top 35% dark and calm.
```

### S02 · Tình duyên — hai thuyền giấy trên hồ sen lúc hoàng hôn [Ưu tiên 1]

```text
S02 — LOVE. Canvas: 1024x1536 portrait.
References: son-mai-nguyen-gia-tri-1.jpg (lotus leaves and flowers), hoi-an-2.jpg (warm light on dark water and reflections), trang-an-2.jpg (amber sky mirrored on water).
SCENE: Two small folded paper boats drift toward each other on a calm lotus pond at sunset: one made of cream do paper, one of cinnabar-red paper. Their bows are almost touching; their reflections meet on the water. Out-of-focus large lotus leaves in the foreground and one closed pink lotus bud standing on its stem at the left. The water mirrors a warm amber sky; one tiny floating candle lantern glows far behind them.
Metaphor: two paths meeting.
Composition: boats in the lower third, centred slightly right; top 35% dark sky reflection and soft bokeh.
```

### S03 · Công việc & tiền bạc — con đường đá lên núi, đèn lồng [Ưu tiên 1]

```text
S03 — WORK AND MONEY. Canvas: 1024x1536 portrait.
References: mu-cang-chai-5.jpg (a winding path climbing a slope in golden light), trang-an-3.jpg (steep dark karst rock), hoi-an-2.jpg (a red paper lantern glow).
SCENE: An old stone path with worn steps winds up a misty karst mountainside at dusk. Halfway up, a single red paper lantern hangs from a bamboo pole and glows warmly, lighting the steps around it. In the sharp foreground, on the first stone step, three ancient round bronze coins with square holes (no readable characters, surface worn smooth) catch the lantern light. Mist fills the valley below; the peak dissolves into the dark sky.
Metaphor: the climb of a career and the rewards along the way.
Composition: path rising from the bottom-left to the middle-right; coins in the bottom 20%; top 35% calm mist and dark sky.
```

### S04 · Năm nay của bạn — ruộng bậc thang và vầng trăng [Ưu tiên 1]

```text
S04 — THIS YEAR. Canvas: 1024x1536 portrait.
References: mu-cang-chai-3.jpg (curved terraces following the contour), ha-giang-4.jpg (terraces at night; ignore the person and the purple), mu-cang-chai-2.jpg (the rhythm of steps in mist).
SCENE: Flooded rice terraces step down a hillside at twilight; each curved terrace is a mirror holding a reflection of a rising full moon, so the moon repeats step by step down the slope. On a terrace wall in the sharp foreground, one small clay oil lamp glows. Dark ridges and thin mist behind.
Metaphor: the steps of the year ahead, each one lit in turn.
Composition: repeating moon reflections run diagonally from the upper middle to the lower right; lamp in the bottom-left; top 35% calm twilight sky with the real moon small near the top-right.
```

### S05 · (Dự phòng) Cá chép vàng lá [Ưu tiên 2]

```text
S05 — FLOWING WEALTH. Canvas: 1024x1536 portrait.
References: vang-la-kieu-ky-3.jpg (gold leaf surface), xa-cu-6.jpg (ripples rendered as elegant curved lines), vang-la-kieu-ky-1.jpg (gold on black).
SCENE: Seen from directly above, two koi fish made entirely of hammered gold leaf swim in a circle in a black lacquer-dark pond, leaving soft concentric ripples; a few floating peach petals. Gold catches a single warm light from the upper left.
Composition: koi circle in the middle third; top 35% dark water.
```

---

# 8. Nhóm E — Vật thể nhỏ cho hiệu ứng (PNG trong suốt)

**Cuộc trò chuyện mới "E — Vật thể".** Tin nhắn mở đầu:

```text
We are starting GROUP E — SPRITES for animated particle effects on the Troi Nam homepage. Each image contains ONLY the requested objects, photorealistic, lit by a soft warm key light from the upper left, crisp clean edges, on a real TRANSPARENT background (alpha PNG). No ground shadow, no reflection, no background, no text. Objects are arranged in a loose grid with generous transparent space between them so each can be cut out individually.
Reply only "Ready for E01".
```

### E01 · Lá vàng "Lá" — mặt trước và mặt sau [Ưu tiên 1]
*Đây là "Lá", đơn vị tiền của Lá Số Việt. Lá sẽ rơi, xoay lật như lá thật.*

```text
E01 — GOLD "LA" LEAVES. Canvas: 1024x1024, transparent PNG.
References: vang-la-kieu-ky-3.jpg (gold leaf surface), vang-la-kieu-ky-4.jpg (gold leaves overlapping; note the bright front and duller back).
SUBJECT: 6 leaves shaped like a Bodhi leaf (heart-shaped with a long elegant drip tip), covered in real gold leaf.
Row 1: 3 leaves showing the FRONT — polished bright gold #C9A44D–#F2DCA0 with fine raised veins, each rotated differently (-20°, 5°, 30°).
Row 2: the SAME 3 leaves showing the BACK — duller, paler, matte gold #A8842F with more pronounced veins and the stem visible.
Each leaf about 260 px long.
```
**Kiểm tra riêng:** hàng dưới phải là **cùng 3 chiếc lá** ở hàng trên nhưng lật mặt sau, màu xỉn hơn.

### E02 · Hoa đăng hình sen có nến [Ưu tiên 1]

```text
E02 — LOTUS LANTERNS. Canvas: 1024x1024, transparent PNG.
References: hoi-an-2.jpg (the pointed-petal paper lotus lanterns with a candle glowing inside), hoi-an-1.jpg (round floating candles).
SUBJECT: 4 paper lotus lanterns (hoa dang), each with a lit candle inside glowing through the translucent paper petals: one cream, one pale pink, one cinnabar red, one warm yellow. Seen from a low three-quarter angle as if floating. Include the soft warm glow halo around each flame, but no water.
Each lantern about 300 px wide.
```

### E03 · Cánh hoa bốn mùa [Ưu tiên 2]

```text
E03 — SEASONAL PETALS. Canvas: 1024x1024, transparent PNG.
References: bon-mua-viet-10.jpg and bon-mua-viet-1.jpg (red silk-cotton flower, hoa gao), bon-mua-viet-6.jpg and bon-mua-viet-11.jpg (pink wild peach, hoa dao), bon-mua-viet-9.jpg (white plum, hoa man).
SUBJECT:
Row 1: 5 single pink peach-blossom petals at different angles.
Row 2: 5 single white plum-blossom petals at different angles.
Row 3: 2 whole red silk-cotton flowers (thick waxy cinnabar petals), 2 single red silk-cotton petals, 1 whole peach blossom.
```

### E04 · Sen [Ưu tiên 2]

```text
E04 — LOTUS. Canvas: 1024x1024, transparent PNG.
Reference: son-mai-nguyen-gia-tri-1.jpg (the shapes of lotus leaves and flowers), but render photorealistic.
SUBJECT: 2 large round lotus leaves seen from above (dew drops), 1 open pink lotus flower, 1 closed lotus bud on a short stem, 3 single pink lotus petals.
```

### E05 · Lá thu Hà Nội [Ưu tiên 2]

```text
E05 — AUTUMN LEAVES. Canvas: 1024x1024, transparent PNG.
Reference: bon-mua-viet-8.jpg (Hanoi street trees in warm light — for mood only).
SUBJECT: 8 individual autumn leaves from Hanoi: 4 yellow "sau" leaves (small, oval, pointed), 4 red-orange Indian almond "bang" leaves (large, obovate). Each at a different angle, some slightly curled.
```

### E06 · Cành hoa gạo (tiền cảnh mùa xuân) [Ưu tiên 2]

```text
E06 — SILK-COTTON BRANCH. Canvas: 1536x1024, transparent PNG.
References: bon-mua-viet-1.jpg, bon-mua-viet-5.jpg, bon-mua-viet-10.jpg — the gnarled, leafless branches of the red silk-cotton tree carrying clusters of thick cinnabar flowers.
SUBJECT: One dark, gnarled, leafless branch entering from the left edge and spreading to the right with smaller twigs, carrying 9–12 cinnabar-red silk-cotton flowers in clusters and a few buds. Photorealistic, isolated on transparency.
```

---

# 9. Nhóm I — Bộ icon mẫu

*Đây là bản phác để em vẽ lại thành icon vector sắc nét. Ý hình rõ là đủ.*

**Cuộc trò chuyện mới "I — Icon".** Tin nhắn mở đầu:

```text
We are starting GROUP I — ICON SKETCHES for the Troi Nam homepage. A cohesive set of minimalist line icons, antique gold (#C9A44D) lines on a pure black (#0F0D0A) background. Uniform stroke (about 2 px at 64 px icon size), round caps and joins, no fills except tiny accent dots, generous inner spacing, slightly hand-crafted like a gilded engraving, with a subtle Dong Son flavour (see hoa-van-dong-son-3.jpg and hoa-van-dong-son-6.jpg for the rhythm of stylised birds and deer). NOT cartoon, NOT emoji, NOT Western zodiac. Each icon centred in its own cell of a grid with clear gaps. No text, letters, numbers or Chinese characters.
Reply only "Ready for I01".
```

### I01 · 12 icon cho 12 cung [Ưu tiên 1]

```text
I01 — 12 PALACE ICONS. Canvas: 1024x1024. A 4x3 grid of 12 icons, in this exact order, left to right, top to bottom:
1 Menh (self, destiny): a small standing figure inside a circle of 12 dots.
2 Phu Mau (parents): two large arches sheltering a small arch.
3 Phuc Duc (ancestral blessing): a lotus rising from three horizontal lines.
4 Dien Trach (home, land): a Vietnamese roof with upturned eaves over a square.
5 Quan Loc (career): stepped path climbing to a small flag.
6 No Boc (friends, partners): three interlinked rings.
7 Thien Di (travel, outside world): a small sampan under a crescent moon.
8 Tat Ach (health): a leaf with a gentle pulse line through it.
9 Tai Bach (money): an ancient round coin with a square hole and three short rays.
10 Tu Tuc (children): a large leaf with a small sprouting leaf.
11 Phu The (marriage, partner): two interlocking circles.
12 Huynh De (siblings): two parallel bamboo stalks.
```

### I02 · Icon 4 nỗi lo, 3 bước, icon tiện ích [Ưu tiên 1]

```text
I02 — JOURNEY AND UTILITY ICONS. Canvas: 1024x1024. A 4x3 grid of 12 icons, in this order:
Row 1: bronze hand mirror with a small star (understand yourself); two paper boats (love); mountain path with a lantern (work and money); crescent moon over terraces (this year).
Row 2: a square chart of 12 cells (free chart); a bookmark ribbon over a page (save); a single Bodhi leaf (unlock with La); an open scroll (read).
Row 3: calendar with a small moon (lunar calendar); a clock with 12 tick marks (birth hour); a shield with a leaf (privacy); a star with connecting lines to 3 dots (related palaces).
```

---

# 10. Nhóm C — Chân dung 15 người đọc (+2 dự phòng)

Em tự viết prompt theo tuổi, giới tính, vùng miền và nghề của từng người, để ảnh ra đúng người Việt ở độ tuổi đó.

**Mỗi người một bối cảnh riêng, đúng với công việc và vùng miền của họ** (bàn làm việc, xưởng, quán, thư viện, homestay…), không dùng chung một phông nền — dùng chung phông sẽ trông như ảnh chụp dàn dựng trong một buổi chụp studio, giả tạo. Cái giữ cho cả bộ 15 ảnh thấy "cùng một nhiếp ảnh gia" là **ánh sáng, ống kính và tông màu giống nhau**, không phải bối cảnh giống nhau. `C00` (Vũ Đức Trọng) đã tạo và đã dùng trên trang với phông tủ sơn mài — giữ nguyên, không tạo lại. Từ C01 trở đi mỗi người có bối cảnh riêng, ghi trong cột "Bối cảnh".

**Cuộc trò chuyện mới "C — Chân dung".** Đính kèm thêm ảnh `apps/web/public/images/lasoviet/v12/chan-dung-minh-hoa-doc-gia-homepage.webp` chỉ để tham khảo **ánh sáng và tông màu** (không phải để lặp lại đúng phông nền đó). Tin nhắn mở đầu:

```text
We are starting GROUP C — READER PORTRAITS for the testimonial section of the Troi Nam homepage: a consistent series of editorial headshots of real-looking Vietnamese people of different ages, regions and jobs, each shot in their own believable everyday setting.
Shared rules for every portrait:
- Square 1024x1024. Head and shoulders, face centred, eyes at one-third from the top, looking at the camera, natural relaxed genuine expression (soft smile or calm warmth, never posed or glamorous).
- Authentic Vietnamese facial features appropriate to the stated age and region; realistic skin texture, pores, fine lines appropriate to age; no beauty filter, no smoothing, minimal natural makeup for women, none for men.
- Lighting: warm low-key light, soft key from the upper left, gentle warm rim light, deep soft shadows — the SAME light recipe and the SAME warm lacquer-toned colour grade in every portrait (match the mood and grade of the attached portrait grid).
- Background: each portrait uses ITS OWN distinct, believable setting drawn from the person's own job and region (see the "Bối cảnh" / setting note for that person), heavily out of focus (shallow depth of field), so it reads as a real environment, not a repeated studio backdrop. Do not reuse the same background between different people.
- Photorealistic editorial portrait, 85mm lens, f/2.
- Clothing matches the person's job and region, modest, everyday; no logos, no text, no large jewellery.
Reply only "Ready for C01".
```

Mỗi người một tin nhắn, theo mẫu:

```text
Create portrait [MÃ]. Person: [MÔ TẢ] Setting: [BỐI CẢNH]
```

| Mã | Người đọc | `[MÔ TẢ]` | `[BỐI CẢNH]` |
|---|---|---|---|
| C01 | Hoàng Tuấn Anh, 26, Hà Nội, kỹ sư phần mềm | a 26-year-old Vietnamese man from Hanoi, software engineer; slim face, short neat black hair slightly longer on top, thin round metal glasses, smooth youthful skin, curious bright eyes, small smile; dark plain t-shirt under an open grey casual shirt | a home coding desk at night: a warm desk lamp, a dark wooden desk, softly blurred monitor glow kept warm (not blue), a hint of a bookshelf behind |
| C02 | Nguyễn Mai Lan, 38, TP.HCM, quản lý marketing | a 38-year-old Vietnamese woman from Ho Chi Minh City, marketing manager; oval face, shoulder-length layered black hair with soft waves, light natural makeup, confident warm smile showing a little teeth, faint smile lines; simple cream silk blouse, small stud earrings | a modern office lounge at dusk: warm pendant lights, a soft blurred glass wall, a hint of a potted plant |
| C03 | Trần Đình Vinh, 54, Đà Nẵng, kinh doanh vật liệu xây dựng | a 54-year-old Vietnamese man from Da Nang, central coast, owns a construction-materials business; broad weathered face, short greying black hair combed back, sun-tanned skin, deep forehead lines, steady trustworthy gaze, closed-mouth smile; dark olive polo shirt | his own materials warehouse: stacked tile and timber samples softly blurred, warm work-light glow, an open roller door with evening light behind |
| C04 | Lê Thu Hà, 22, Cần Thơ, sinh viên năm cuối | a 22-year-old Vietnamese woman from Can Tho in the Mekong Delta, final-year university student; round youthful face, long straight black hair with soft side bangs, warm sun-kissed skin, bright open smile; light pastel cotton shirt | a riverside cafe terrace at golden hour: warm string lights softly blurred, a hint of the Mekong river and boats in the background |
| C05 | Phạm Thanh Thảo, 31, Đà Lạt, chủ homestay & quán | a 31-year-old Vietnamese woman from Da Lat, central highlands, owns a homestay and a small cafe; heart-shaped face, wavy black hair loosely tied with strands framing the face, rosy cheeks from the cool climate, warm welcoming smile; oatmeal knitted cardigan over a white top | a wooden homestay balcony at dusk: warm fairy lights, blurred pine trees and highland mist beyond the railing |
| C06 | Đặng Quang Huy, 35, Dĩ An – Bình Dương, QA | a 35-year-old Vietnamese man from Binh Duong in the south, quality-assurance engineer at a factory; neat short side-parted hair, clean-shaven, thoughtful composed expression with a slight smile, rectangular face; light grey collared shirt | a factory quality-control corridor: softly blurred machinery and shelving, warm sodium work lighting |
| C07 | Ngô Văn Hùng, 62, Nam Định, cựu giáo viên Văn | a 62-year-old Vietnamese man from Nam Dinh in the Red River Delta, retired literature teacher; thin face, neatly combed grey-white hair, thin-rimmed reading glasses, gentle scholarly eyes with crow's feet, kind closed-mouth smile; dark brown traditional shirt with a mandarin collar | his home study: floor-to-ceiling wooden bookshelves softly blurred, an old brass desk lamp, stacks of books |
| C08 | Bùi Phương Linh, 29, Nha Trang, freelancer UI/UX | a 29-year-old Vietnamese woman from Nha Trang, south-central coast, freelance UI/UX designer; long straight black hair tucked behind one ear, small minimal gold earrings, light tan skin, relaxed creative look, soft smile; simple black top | a cosy home studio by a window at golden hour: a blurred laptop glow, potted plants, soft evening light through sheer curtains |
| C09 | Trịnh Quốc Bảo, 45, Hạ Long – Quảng Ninh, nhà đầu tư tài chính | a 45-year-old Vietnamese man from Ha Long, Quang Ninh, financial investor; well-groomed short side-parted black hair with a touch of grey, clean-shaven, composed confident look, faint smile; charcoal blazer over an open-collar white shirt | a high-floor office lounge at dusk: a floor-to-ceiling window softly blurred, distant warm bay lights, a leather armchair edge |
| C10 | Trần Minh Khoa, 24, TP. Huế, sáng tạo nội dung | a 24-year-old Vietnamese man from Hue, content creator; youthful face, slightly longer styled black hair with texture, easy bright smile showing teeth, expressive eyebrows; casual beige overshirt over a white tee | a small creative studio: a warm ring-light glow (kept amber, not white), softly blurred camera gear and a backdrop stand |
| C11 | Đỗ Mỹ Hạnh, 36, Vũng Tàu, hoạch định tài chính | a 36-year-old Vietnamese woman from Vung Tau, southern coast, financial planner; oval face, black hair in a low neat bun with a few loose strands, poised professional expression with a gentle smile, light natural makeup; soft white blouse with a small collar | a modern meeting room: warm light through half-open blinds, a blurred glass table edge and a chart on a distant wall |
| C12 | Lê Thị Kim Oanh, 58, Thái Nguyên, hưu trí & kinh doanh gia đình | a 58-year-old Vietnamese woman from Thai Nguyen in the northern midlands, retired and running a family tea business; round face, short permed black hair with some grey strands, laugh lines, kind motherly smile; patterned burgundy silk scarf over a dark cardigan | a traditional tea-drying room: woven bamboo trays of tea leaves softly blurred, warm lantern light, wooden beams |
| C13 | Phan Anh Dũng, 33, TP. Vinh – Nghệ An, kỹ sư giải pháp CNTT | a 33-year-old Vietnamese man from Vinh, Nghe An, north-central Vietnam, IT solutions engineer; short hair, short neatly trimmed beard and moustache, friendly focused look, slight smile; olive-green casual shirt | a server room doorway: softly blurred server racks with small warm amber indicator lights (no blue LEDs), a desk edge in the foreground |
| C14 | Võ Thùy Trang, 40, Quy Nhơn – Bình Định, luật sư doanh nghiệp | a 40-year-old Vietnamese woman from Quy Nhon, Binh Dinh, south-central coast, corporate lawyer; chin-length black bob haircut, defined brows, sharp but warm intelligent expression, subtle smile; deep red blouse with a simple neckline | a law office: softly blurred shelves of bound law books, a warm brass desk lamp, a hint of a window with evening light |

> Em thêm **C15 và C16** dưới đây để có dự phòng khi một ảnh bị hỏng (anh có thể bỏ qua).

| Mã | Vai trò | `[MÔ TẢ]` | `[BỐI CẢNH]` |
|---|---|---|---|
| C15 | (dự phòng nam trung niên) | a 48-year-old Vietnamese man from Hanoi, small-business owner; short black hair greying at the sides, round glasses, calm friendly smile; dark knit polo | his own small shop: softly blurred shelves of goods, warm shop lighting |
| C16 | (dự phòng nữ trẻ) | a 27-year-old Vietnamese woman from Hanoi, office worker; black hair in a mid-length straight cut, light natural makeup, gentle smile; light beige blouse | an open-plan office at golden hour: softly blurred desks and a window with warm evening light |

**Kiểm tra riêng cho chân dung:** đúng giới tính; tuổi nhìn hợp lý (sai lệch không quá 5 tuổi); không méo mắt, răng, tai; **bối cảnh của mỗi người phải khác nhau** và đúng nghề/vùng miền ghi trong bảng; **ánh sáng, ống kính và tông màu phải giống nhau** xuyên suốt cả 15 ảnh dù bối cảnh khác nhau — đây là thứ duy nhất giữ cho bộ ảnh thấy cùng một nhiếp ảnh gia.

---

# 11. Nhóm O — Ảnh chia sẻ mạng xã hội [Ưu tiên 2]

Làm trong cuộc trò chuyện **L — Phong cảnh**.

```text
O01 — SOCIAL SHARE IMAGE. Canvas: 1536x1024 landscape.
Use the same world as L04 (night over karst and still water) — same grade, same stars.
In the upper half of the sky, 12 bright warm-gold stars are connected by thin, softly glowing gold lines into a square 12-cell grid (4 cells per side around an empty centre square) — a Vietnamese Tu Vi chart drawn in starlight — centred horizontally, subtle and elegant, not neon.
Karst silhouettes and still water with star reflections along the bottom 25%. Leave the centre-bottom area calm for a logo.
No text, no letters, no logos, no watermark.
```

---

# 12. Checklist gửi lại em

| Nhóm | Số ảnh | Ưu tiên 1 (cần cho bản xem thử đầu tiên) |
|---|---|---|
| L Phong cảnh | 13 | L01, L02, L03, L04, L05, L06 |
| T Chất liệu | 11 | T01, T02, T03, T04, T07, T08, T11 |
| P Hoa văn | 5 | P01, P02, P04 |
| S Tranh nỗi lo | 5 | S01, S02, S03, S04 |
| E Vật thể | 6 | E01, E02 |
| I Icon | 2 | I01, I02 |
| C Chân dung | 15 (+2 dự phòng) | **C00 làm ngay**, rồi C01 → C14 |
| O Chia sẻ | 1 | — |

**Tối thiểu để em dựng bản xem thử:** 24 ảnh Ưu tiên 1 + 15 chân dung.

**Cách gửi lại:**
- Để tất cả ảnh vào `~/Downloads/troi-nam-gen/`, tên file bắt đầu bằng mã (`L01.png`, `T03.png`, `C00.png`, …). Có nhiều bản thì thêm `-v2`, `-v3`; em sẽ chọn bản đẹp nhất hoặc hỏi lại anh.
- Nhắn em "đã xong nhóm …" sau mỗi nhóm. **Không cần chờ đủ hết:** có L01–L06 và C00 là em bắt đầu dựng được.
- Em sẽ đổi tên chuẩn SEO (ví dụ `trang-an-binh-minh-suong-nui-da-voi-lap-la-so.webp`), phóng to, nén, tách từng vật thể/icon, rồi dựng vào trang.
