---
title: Lá Số Việt — Handoff viết prompt hình ảnh (cho ChatGPT qua Git MCP)
version: 1.0
status: active-handoff
date: 2026-09-02
branch: product/experience-spec-v1
tool: ChatGPT web + Git MCP — đọc được repo, không đọc được file local
owners: Harris/Product (giao việc), ChatGPT (viết prompt), Claude Design (dựng trang — xem docs/16)
---

# Handoff — ChatGPT viết prompt hình ảnh cho các trang còn lại

> Bạn làm việc qua Git MCP trên repo `harris1111/lasoviet.vn`, branch **`product/experience-spec-v1`**.
> **Việc của bạn là viết prompt sinh ảnh — không dựng trang.** Claude Design lo phần dựng trang.

---

## 0. Phân vai

| Ai | Làm gì |
|---|---|
| Claude Design | Dựng 9 trang còn lại, để placeholder ảnh có mã (`LS01-D`, `FM01`...) |
| **Bạn (ChatGPT)** | **Đọc repo, viết Production Image Bible cho từng trang — prompt hoàn chỉnh, copy-paste một lần ra một ảnh** |
| Founder | Gen ảnh bằng công cụ ảnh, đổi tên file, đưa vào trang |

Bạn đã làm đúng việc này cho trang chủ rồi. Lần này lặp lại quy trình đó cho 9 trang còn lại.

---

## 1. Thứ tự đọc bắt buộc

| # | Đường dẫn trong repo | Bạn lấy được gì |
|---|---|---|
| 1 | `prototype/homepage/image-prompts-homepage.md` | **Khuôn mẫu của chính bạn.** Bám sát cấu trúc này: creative thesis, image map table, prompt hoàn chỉnh, ma trận Địa Chi, strict exclusions, filename + alt |
| 2 | `docs/16-claude-design-page-build-handoff.md` | Chín khối trang Claude Design đang dựng — mỗi khối đã ghi sẵn mã ảnh và tỷ lệ cần cho trang đó |
| 3 | `docs/14-sitemap-seo-wireframes.md` §6 | Wireframe chi tiết từng trang — để hiểu ảnh nằm cạnh nội dung gì, cần chừa copy-safe zone ở đâu |
| 4 | `prototype/art-direction.md` | Art direction gốc + **quy tắc đặt tên file ảnh bắt buộc** (§0) |
| 5 | `docs/13-brand-experience-guideline.md` §5.5, §7 | Ràng buộc hình ảnh và trust/safety |
| 6 | `prototype/homepage/homepage.html` | Xem ảnh trang chủ đang được đặt vào layout thế nào (`<picture>` desktop/mobile, `object-fit`, `object-position`) |

**Đừng đọc `prototype/_archive/`** — brief cũ đã bị thay thế, đọc vào sẽ mâu thuẫn.

---

## 2. Nhắc lại luật đã chốt từ vòng trang chủ

Giữ nguyên, không nới lỏng:

- **Ba tiêu chuẩn kiểm mọi ảnh:** có ý niệm (nhìn ảnh hiểu section đang nói gì) · có nguồn gốc (đúng
  cấu trúc Tử Vi, chữ Hán chỉ khi kiểm chứng được) · có nhiệm vụ giao diện (đúng tỷ lệ, đúng vùng
  crop, đúng khoảng tối, không cạnh tranh với copy).
- **Không prompt nào yêu cầu khung trống** để tự ghép chữ lên sau. Ảnh phải là một scene có nội dung
  hoàn chỉnh.
- **Ma trận Địa Chi cố định** khi ảnh có lá số — mỗi chữ đúng một lần, không thêm Thiên Can, không
  thêm tên cung, không thêm chữ Hán nào khác:
  ```
  巳  午  未  申
  辰  [khối trung tâm]  酉
  卯  [khối trung tâm]  戌
  寅  丑  子  亥
  ```
- **Khối strict exclusions** lặp lại ở mọi prompt: no luopan, no bagua, no yin-yang, no Western
  zodiac, no horoscope wheel, no tarot, no fortune teller, no incense, no smoke, no candles, no
  crystal ball, no starscape, no magical glow, no floating symbols, no dragon or phoenix, no hands,
  no recognizable face, no logos, no watermark, no Latin or Vietnamese text, no numbers, no
  pseudo-writing, no blue/green/purple lighting.
- **Copy-safe zone** phải nêu cụ thể theo phần trăm khung hình nếu có chữ đè lên ảnh.
- **Con dấu/triện: không yêu cầu chữ Hán.** Dùng hoạ tiết vuông-lồng-vuông khớp icon `i-trien`.
  Lý do: đã thử 2 lần yêu cầu chữ 信 (Tín), model trả về 福 (Phúc) cả hai lần vì 福 áp đảo trong dữ
  liệu huấn luyện. Đừng lặp lại thí nghiệm đó.
- **Palette bắt buộc trong mọi prompt:** matte black-brown lacquer #0F0D0A và #1C1813, aged cream
  paper #F6F1E6, restrained antique bronze-gold #C9A44D, một điểm cinnabar #CE5B45.

---

## 3. Quy tắc đặt tên file — bắt buộc

```
[mo-ta-noi-dung-anh]-[ngu-canh-hoac-tu-khoa-trang].webp
```

Chữ thường, không dấu tiếng Việt, gạch ngang nối từ, mô tả nội dung + ngữ cảnh trang. Ví dụ đã dùng ở
trang chủ: `menh-thu-khai-quang-hero-lasoviet-desktop.webp`,
`la-so-mien-phi-ba-diem-noi-bat-co-can-cu-homepage.webp`.

`alt` viết tiếng Việt **có dấu**, mô tả tự nhiên, không nhồi từ khoá. Filename và alt là hai lớp khác
nhau, cả hai đều phải đúng.

---

## 4. Định mức ảnh mỗi trang — đừng lấp đầy mọi khoảng trống

Guideline nói rõ: khoảng nghỉ thị giác là chủ ý. Trang chủ có 12 ảnh vì là trang thương hiệu; trang
chức năng thì ít hơn nhiều. Bám đúng định mức này, đừng tự tăng:

| Trang | Mã | Số ảnh | Ghi chú |
|---|---|---|---|
| Calculator landing `/la-so-tu-vi` | `LS` | 4 | LS01-D + LS01-M (hero 12:7 / 4:5) · LS02 (bối cảnh lá số mẫu 3:2) · LS03 (lịch pháp Can-Chi 3:2) |
| Form 3 bước | `FM` | 1 | FM01 (rail giải thích bước 02, 3:2) |
| Kết quả miễn phí | `KQ` | 0 | lá số là dữ liệu thật, dựng SVG |
| Paid topic landing | `LG` | 3 | LG01-D/-M (hero) · LG02 (trang mẫu báo cáo 3:2) · LG03 (dấu triện/đóng gói 1:1) |
| Checkout | `TT` | 0 | trang tin cậy, không trang trí |
| Report reader | `BC` | 1 | BC01 (frontispiece/bìa báo cáo 3:2) |
| Knowledge hub | `KT` | 2 | KT01-D/-M (hero hub) |
| Knowledge article | `KT` | 1 | KT10 (hero bài viết 3:2) — sơ đồ trong bài dựng SVG, không gen ảnh |
| Account & privacy | `TK` | 0 | |

Tổng: **12 ảnh** cho 9 trang. Nếu bạn thấy một trang cần thêm ảnh mà định mức không có, nêu lý do
trước, đừng tự thêm.

**Ranh giới quan trọng:** sơ đồ mang thông tin (lá số 12 cung, sơ đồ giải thích trong bài kiến thức,
biểu đồ chu kỳ) dựng bằng SVG trong code — không viết prompt gen ảnh cho chúng. Bạn chỉ viết prompt
cho ảnh không khí.

---

## 5. Deliverable

Với mỗi trang có ảnh, tạo một file và commit vào branch `product/experience-spec-v1`:

```
prototype/<ten-trang>/image-prompts.md
```

Ví dụ: `prototype/la-so-tu-vi/image-prompts.md`, `prototype/luan-giai-tu-vi/image-prompts.md`.

Cấu trúc mỗi file — giống hệt file trang chủ:

1. **Creative thesis** — ảnh của trang này kể chuyện gì, khác trang chủ thế nào
2. **Image map table** — Mã | Vị trí | Ý niệm | Tỷ lệ master (px cụ thể) | Trạng thái
3. **Từng prompt** — mỗi prompt một code block hoàn chỉnh, copy-paste một lần ra một ảnh, không
   placeholder, không bắt nối thêm style suffix hay negative prompt rời
4. Ngay dưới mỗi prompt: `Filename:` và `Alt:`

Commit message: `docs: add image prompts for <ten-trang>`. Mỗi trang một commit, đừng gộp.

---

## 6. Kiểm tra trước khi commit

1. Mỗi prompt copy-paste được một lần ra một ảnh, không cần chỉnh thêm gì.
2. Có nêu tỷ lệ và kích thước pixel cụ thể.
3. Có copy-safe zone nếu ảnh có chữ đè lên.
4. Có khối strict exclusions đầy đủ.
5. Nếu ảnh chứa lá số: ma trận Địa Chi đúng, mỗi chữ đúng một lần, không chữ Hán nào khác.
6. Con dấu/triện: không có yêu cầu chữ Hán.
7. Filename đúng quy tắc §3, alt tiếng Việt có dấu.
8. Palette và ngôn ngữ ánh sáng khớp trang chủ — cùng một thế giới hình ảnh, không lệch tông.
9. Không vượt định mức ảnh ở §4.
10. Không viết prompt cho sơ đồ mang thông tin.

---

## 7. Khi mâu thuẫn

Brand guideline `docs/13` thắng ở phần brand/tone/trust/safety. Wireframe `docs/14` thắng ở phần cấu
trúc trang và vị trí ảnh. Nếu conversion xung đột với trust/safety: **trust/safety luôn thắng**.

Không rõ thì hỏi founder, đừng đoán rồi viết 12 prompt theo một giả định sai.
