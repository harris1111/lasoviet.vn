# Lá Số Việt — 3 hướng logomark (vòng 3, dựng theo ref founder gửi)

> Trạng thái: **draft**, chờ founder chốt A / B / C.
> Thay thế `logo-concepts-v2.md` (6 hướng hình học parametric — founder loại vì "quá kỹ thuật,
> kém sang, không có dấu ấn") và `image-prompts-logo.md` (huy hiệu ormolu photoreal — đã bỏ).
> File nguồn: `marks/v3-a-net-viet.svg`, `marks/v3-b-tam-tai.svg`, `marks/v3-c-gio-sinh.svg`.

## Chẩn đoán vòng 2 sai ở đâu

Không sai ở ý niệm mà sai ở **chất liệu**: toàn bộ 6 mark dùng nét mảnh đều 2–2.5px và hình học
parametric (vòng tròn đều, vạch chia đều, node-and-line). Đó là register của icon dashboard SaaS,
không phải của một dấu hiệu thương hiệu tri thức. Nét mảnh đọc ra "nhẹ, rẻ" dù màu vàng–son đã đúng.

Vòng 3 đổi ba biến số: **khối đặc thay wireframe**, **vòng chứa thay hình trôi nổi**, và mỗi hướng
bắt buộc trả lời hai câu — *nó là chữ gì* (L/S/V) và *nó là ký hiệu gì của ngành*.

## Ràng buộc mới do founder đặt

> Dù chọn hướng nào cũng phải có rationale rõ ràng về mặt letter **L, S, V** hoặc các biểu tượng
> hình học có liên quan đến brand / ngành hàng.

Cả ba hướng dưới đây đều đạt cả hai lớp. Vẫn giữ nguyên luật cấm ở `prototype/art-direction.md` §2
và `docs/13` §5.5: thuần hình học, không chữ Hán, không cầu pha lê, không cung hoàng đạo phương Tây,
không mặt người.

---

## A — Nét Việt · chữ **V**

Vòng bút lông hở miệng, khối V đặc bên trong, một hạt son đặt vào chỗ hở.
Dựng theo nhóm ref 1–4 (bút lông + vòng chứa).

| Lớp | Nội dung |
|---|---|
| **Chữ** | **V — Việt.** Khối V đặc, thân vót dần về đáy như nét bút hạ lực, nghiêng 8° để đọc ra chữ viết tay chứ không phải mũi chevron của icon giao diện. |
| **Ngành** | Vòng ngoài là thiên bàn. Chữ V đồng thời là **một cung cắt ra từ vòng 12 cung** — đúng thao tác đọc lá số: chọn một cung để luận, không đọc cả vòng cùng lúc. |
| **Chi tiết** | Vòng dày mỏng không đều (dày dưới trái, mỏng dần lên trên phải) như nét cọ có lực tay thật. Chỗ mỏng nhất **đứt hẳn** — lá số không khép kín người đọc. Hạt son nằm đúng chỗ đứt = dữ liệu sinh của riêng một người. |
| **Nguồn** | `docs/13` §6.1 — "Agency over fatalism". |

Kỹ thuật: ring dựng bằng `mask` (2 vòng lệch tâm + 1 vòng khoét chỗ hở), V là `path` bo cong nhẹ.

## B — Tam Tài · chữ **V** (qua thế xếp)

Ba vòng lồng vào nhau; chỗ cả ba cùng gặp — và chỉ chỗ đó — tô son.
Dựng theo nhóm ref 5–8 (vòng lồng + sơ đồ hệ thống).

| Lớp | Nội dung |
|---|---|
| **Chữ** | **V — Việt**, đọc từ thế xếp: hai vòng trên, một vòng dưới, khối tam giác chúc xuống. |
| **Ngành** | **Tam Tài — Thiên · Địa · Nhân**: thời của trời, vị của đất, phần của người. Không phải hoa văn trang trí — đây là cấu trúc lý luận có thật của ngành luận mệnh Đông phương. |
| **Chi tiết** | Ba vòng để hở ruột, **giữ nguyên đường biên riêng**, chỉ đan qua nhau — không hệ nào tan vào hệ nào. Chỗ hai vòng gặp nhau vẫn rỗng; phải đủ cả ba mới đặc và tô son. |
| **Nguồn** | `docs/02` — "nhiều hệ quy chiếu Đông–Tây trên một hồ sơ sinh, nhưng mỗi hệ vẫn giữ phương pháp riêng". |

Kỹ thuật: 3 `circle` stroke 5.5; vùng giao ba lớp dựng bằng `clipPath` lồng nhau.
**Rủi ro:** đây là hướng bí nhất ở 16px — bản nhỏ đã phải nới nét lên 9.

## C — Giờ Sinh · chữ **L**

Chữ L đặc đứng giữa vòng thiên bàn, khuỷu chữ cẩn một ô son.
Dựng theo nhóm ref 9–12 (khối đặc + vòng chứa + kim loại).

| Lớp | Nội dung |
|---|---|
| **Chữ** | **L — Lá.** Không vẽ bằng nét mà bằng **khối đặc**: thân đứng, chân ngang, góc vuông dứt khoát — đọc được cả khi thu về 16px. |
| **Ngành** | Khuỷu chữ L đặt **đúng tâm vòng**, hai cánh dài bằng nhau toả ra như **hai kim đồng hồ dừng ở một giờ cụ thể** — giờ sinh, dữ liệu gốc mà toàn bộ sản phẩm đứng trên. Cũng chính là hai trục chia thiên bàn ra thành cung. |
| **Chi tiết** | Ô son vuông **cẩn vào đúng khuỷu** — điểm gốc của mọi phép tính, đồng thời là dấu triện thu nhỏ. Vàng chuyển sắc lấy đúng gradient nút CTA trên `homepage.html` nên logo và nút cùng một chất kim loại. |
| **Nguồn** | `docs/13` §6.3 (giờ sinh là trường dữ liệu quyết định); `homepage.html` (gradient vàng CTA). |

Kỹ thuật: `circle` stroke + `path` chữ L + `rect` son; gradient dùng chung id namespace `lsv-c-gold`.

---

## Việc còn treo

- [ ] Founder chốt A / B / C (hoặc chỉ ra phần muốn ghép giữa hai hướng).
- [ ] Vẽ lockup ngang chính thức: mark + wordmark "Lá Số Việt" (Source Serif 4), thay khối
      placeholder trong `header` của `homepage.html` và 9 trang còn lại.
- [ ] Xuất favicon 16/32/48 + app icon 512; kiểm tra thật trên tab trình duyệt, không chỉ trên canvas.
- [ ] Bản mono (một màu, không son) cho các chỗ in/khắc một màu.
- [ ] `docs/13` §5.1–5.2 vẫn mô tả hệ "Giấy — Mực — Son" trong khi bản dựng đã sang hệ sơn mài —
      gộp luôn vào lần cập nhật §5 sau khi khoá logo.
