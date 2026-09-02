# Handoff — Nâng cấp trang chủ lasoviet.vn lên chuẩn world-class

> Đọc file này trong một phiên Claude mới (design/canvas) cùng với `/design-taste-frontend`.
> File tự chứa đủ ngữ cảnh — không cần đọc lại toàn bộ lịch sử chat trước đó.

---

## 0. Việc cần làm

Trang chủ `prototype/homepage.html` đã qua 2 vòng: (1) build đúng wireframe + brand tokens gốc,
(2) đổi sang hệ sơn mài vàng-kim/nền tối theo yêu cầu founder. Founder đánh giá bản (2) **"khá hơn
nhưng vẫn thô sơ, giống wireframe fill màu, chưa đạt đẳng cấp hàng đầu thế giới."**

Nhiệm vụ: chạy `/design-taste-frontend` một vòng nữa trên `prototype/homepage.html`, nhưng lần này
sửa đúng nguyên nhân gốc bên dưới — không chỉ thêm chi tiết trang trí.

## 1. Chẩn đoán thật — vì sao nó vẫn giống wireframe fill màu

Đây là phần quan trọng nhất của handoff này. Đổi bảng màu từ Paper-Ink sang sơn mài vàng-kim đã đổi
**lớp da**, nhưng **bộ khung trang** thì không đổi — và bộ khung mới là thứ khiến mắt người nhận ra
ngay "đây là landing page SaaS mẫu":

```
Header → Hero (copy trái/art phải) → Trust strip 4 cột → 3-col feature →
3 step số → card grid 4 cột → 3-col trust block → card grid 3 cột → FAQ accordion → CTA cuối → Footer
```

Đây là cấu trúc landing-page mặc định có thể dán vào bất kỳ SaaS B2C nào — fintech, app thiền, khoá
học online — chỉ cần đổi copy. Bảng vàng-kim, icon riêng và dấu triện là chi tiết tốt, nhưng chúng
đang trang trí lên trên một bộ khung generic, chứ chưa tự bản thân bộ khung nói lên "đây là Tử Vi,
đây là tàng thư, đây là sơn mài."

**Việc phải làm là phá vỡ bộ khung này ở ít nhất 2-3 điểm**, không phải thêm chi tiết vào nó. Gợi ý
cụ thể (không bắt buộc theo đúng thứ tự, nhưng buộc phải có ít nhất một moment thật sự khác biệt):

1. **Hero không phải "copy trái / art phải".** Thử: thiên bàn 12 cung chiếm toàn bộ chiều rộng làm
   nền, chữ nổi lên trên vùng tối của nó; hoặc một khoảnh khắc tương tác thật — người dùng gõ ngày
   sinh và thấy kim la bàn xoay tới đúng cung ngay trên hero, thay vì một form card bo góc chuẩn SaaS.
2. **"Bạn nhận được gì" đừng là chart-trái/list-phải.** Đây là cơ hội cho một layout không đối xứng
   thật — chart lớn hơn, insight card chồng lấn lên rìa chart, hoặc insight xuất hiện như ghi chú tay
   bên lề một trang tàng thư (marginalia), không phải card đóng khung đều nhau.
3. **"Report topics" đang là 4 card đều nhau kiểu pricing table.** Tàng thư cổ không trưng hàng hoá
   như SaaS pricing. Thử trình bày như một mục lục sách thật — số trang, tiêu đề canh lề, dòng chấm
   dẫn (leader dots) tới giá — gần với danh mục một cuốn cổ thư hơn là card thương mại.
4. **Footer và trust-block vẫn là 3-cột/4-cột chuẩn.** Ít quan trọng hơn 3 điểm trên, nhưng nếu còn
   thời gian, đáng phá luôn.

**Nguyên tắc chọn khi build lại:** giữ nguyên toàn bộ token (màu, font, spacing) và toàn bộ nội dung/
copy tiếng Việt đã viết — chỉ đổi **hình dạng lưới và cách các khối quan hệ với nhau**. Nếu một khối
mới nhìn vẫn giống thứ có thể dán vào trang SaaS khác, chưa xong.

## 2. Token hệ sơn mài — ĐÃ CHỐT, không đổi trừ khi founder yêu cầu

```css
--lacquer-900:#0F0D0A;  --lacquer-800:#15120E;  --lacquer-700:#1C1813;  --lacquer-line:#3A3227;
--gold-400:#F2DCA0;     --gold-500:#C9A44D;     --gold-600:#A8842F;    --gold-700:#9A7730;
--son:#CE5B45;          --son-deep:#9E3D2C;
--pearl-50:#F6F1E6;     --pearl-200:#DCD4C3;    --pearl-400:#A79E8B;   --pearl-600:#6E6656;

font-display: "Source Serif 4", Georgia, serif;   /* heading, lead, quote */
font-ui:      "Be Vietnam Pro", system-ui;         /* body, form, nav */
font-mono:    "JetBrains Mono", ui-monospace;      /* eyebrow, giá, nhãn, số liệu — giọng thứ 3 */
```

**Ràng buộc contrast bắt buộc kiểm lại nếu đổi bất kỳ giá trị nào ở trên:**
- Gold-gradient chỉ dùng cho heading lớn / nút / nét vẽ trang trí. Stop tối nhất của gradient
  (`#9A7730`) đo được 4.58:1 trên `--lacquer-800` — vừa đạt AA cho text thường. Nếu chỉnh gradient,
  đo lại contrast của stop tối nhất.
- Body/label luôn dùng `--pearl-200`/`--pearl-400` đặc, không bao giờ dùng gradient hay `--gold-*`
  trực tiếp cho đoạn văn dài.
- `color-scheme: dark` — đây là quyết định **light-only chủ đích** (không phải thiếu sót): brand
  guideline gốc loại dark mode khỏi MVP, nhưng hệ sơn mài này *là* nền tối theo chủ đích thẩm mỹ, nên
  không cần media query theo `prefers-color-scheme` — trang cam kết một thế giới hình ảnh duy nhất.

## 3. Signature element — giữ nguyên, có thể đào sâu thêm

**Dấu triện** (`#i-trien`, con dấu vuông viền đôi màu son) đứng cạnh mọi "Vì sao có nhận định này?"
— đây là chi tiết lấy nguyên văn từ brand guideline ("Cinnabar hoạt động như dấu triện: ít nhưng có
lực") nên **không đổi ý tưởng**, chỉ có thể đào sâu cách thể hiện: hiệu ứng "đóng dấu" khi hover/click
(scale nhẹ + đổi opacity như mực vừa in xuống giấy), hoặc dấu triện thật sự để lại "vết mực" nhẹ khi
evidence drawer mở ra.

**Thiên bàn 12 cung** (SVG hero + free-value section) hiện đang là sơ đồ hình học đúng nhưng hơi
mỏng/kỹ thuật. Nếu nâng cấp: thêm lớp chi tiết chạm khắc (không phải hoa văn trang trí ngẫu nhiên —
phải trông như *bản vẽ kỹ thuật của một khí cụ thật*, giữ tinh thần "có căn cứ" của brand), có thể
animate xoay chậm ở vòng ngoài cùng (tôn trọng `prefers-reduced-motion`).

## 4. Ràng buộc brand KHÔNG được phá dù đổi bảng màu

Những điều này thuộc lớp LOCKED/non-negotiable trong `docs/13-brand-experience-guideline.md` và
**không nằm trong phạm vi founder cho phép đổi** (founder chỉ đổi palette/dark-mode, không đổi các
mục dưới đây):

- Copy không dùng ngôn ngữ chắc chắn/định mệnh ("sẽ", "chắc chắn") — luôn "có xu hướng", "có thể".
- Không fear-based upsell, không countdown, không fake urgency/scarcity.
- AI disclosure phải hiển thị nguyên văn copy chuẩn (đã có trong file, đừng paraphrase lại).
- Giá luôn kèm "thanh toán một lần" / "không tự động gia hạn".
- WCAG 2.2 AA là release gate — bất kỳ hiệu ứng mới nào (hover, gradient, animation) đều phải giữ
  contrast pass, giữ `:focus-visible` rõ ràng, và tôn trọng `prefers-reduced-motion`.
- Touch target tối thiểu 44×44px.
- Không dùng chữ Hán–Nôm chưa kiểm chứng nghĩa (áp dụng cả cho SVG trang trí, không chỉ ảnh chụp).

## 5. Tài nguyên đã có sẵn — dùng lại, đừng làm lại từ đầu

| Tài nguyên | Vị trí | Ghi chú |
|---|---|---|
| Bản hiện tại (code) | `prototype/homepage.html` | Base để sửa tiếp, không viết lại từ đầu |
| Bản hiện tại (xem trực quan) | https://claude.ai/code/artifact/d07f7ed9-9ab9-425d-9888-8dfa38b284fd | Publish lại cùng file_path này sẽ update link, không tạo link mới |
| Art direction + prompt ảnh | `prototype/art-direction.md` | 5 prompt sinh ảnh (Midjourney/Nano Banana/Flux) + ~25 keyword tìm ảnh thật + bộ lọc chọn ảnh. 4 ô ảnh trong trang đã đánh số Ảnh 01–04 khớp với prompt. |
| Brand guideline gốc (LOCKED, trừ palette/dark-mode) | `docs/13-brand-experience-guideline.md` | Đặc biệt: §4 tone-of-voice, §7 trust/privacy/safety, §8 component recipes |
| Wireframe 9 loại trang (đã duyệt v1.1/FD-019) | `docs/14-sitemap-seo-wireframes.md` §6 | Trang chủ = §6.1. 8 trang còn lại chưa build, chờ trang chủ chốt xong |
| Báo cáo research 3 site ref (CHANI/Astro·Charts/The Pattern) | `/private/tmp/claude-501/-Users-admin--Projects-lasoviet-vn/384f8a15-66d3-4bfc-bca3-e198f32e39ee/scratchpad/design-system-extraction.md` | File tạm — nếu cần giữ lâu dài, copy nội dung liên quan vào repo trước khi session hết hạn |

## 6. Brief để dán trực tiếp vào `/design-taste-frontend`

```
Nâng cấp prototype/homepage.html (lasoviet.vn — nền tảng lập/luận giải Tử Vi tiếng Việt) từ mức
"wireframe fill màu" lên world-class. Token hệ sơn mài (màu/font) đã chốt — xem mục 2 của
prototype/HANDOFF-design-revision.md, KHÔNG đổi token. Vấn đề không phải là thiếu chi tiết trang
trí, mà là bộ khung trang (header/hero/trust-strip/3-col/step/card-grid/footer) vẫn là cấu trúc
landing-page SaaS mặc định — xem chẩn đoán chi tiết ở mục 1 của file handoff, và phá vỡ bộ khung ở
ít nhất 2-3 điểm cụ thể đã liệt kê (hero, "bạn nhận được gì", report topics). Giữ nguyên toàn bộ
copy tiếng Việt, toàn bộ ràng buộc brand ở mục 4 (đặc biệt: WCAG AA, không fear-based copy, AI
disclosure nguyên văn). Ảnh thật chưa có — 4 ô đã đánh số Ảnh 01-04, dùng placeholder gradient tối
như hiện tại, đừng chặn tiến độ vì thiếu ảnh. Tự phê bình trước khi build: nếu một khối bất kỳ vẫn
có thể dán sang trang SaaS khác mà không ai nhận ra khác biệt, chưa xong.
```

## 7. Việc còn treo (không thuộc phạm vi handoff này, nhắc để không quên)

- [ ] Cập nhật chính thức `docs/13-brand-experience-guideline.md` §5.2/§5.5/§5.8 sang hệ sơn mài +
      entry decision log (lý do, tác động, điều kiện rollback) — founder đã chọn "đổi chính thức
      ngay" nhưng chưa thực hiện, cố ý hoãn tới khi visual chốt hẳn.
- [ ] Logo thật — founder tự làm, sẽ thay wordmark + icon thiên bàn ở header/footer.
- [ ] Sau khi trang chủ chốt: nhân rộng hệ thống sang 8 loại trang còn lại trong
      `docs/14-sitemap-seo-wireframes.md` §6 (đã được founder chọn "toàn bộ 9 loại trang" cho đợt
      này).
- [ ] Ảnh thật (AI-gen hoặc stock) theo `prototype/art-direction.md`, đưa vào 4 ô Ảnh 01-04.
