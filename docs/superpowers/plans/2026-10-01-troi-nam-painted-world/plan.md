---
title: "Troi Nam painted scroll world"
description: "Dựng lại hiệu ứng cuộn trang chủ Trời Nam từ tranh/ảnh đã gen thay vì hình khối vẽ bằng code, áp dụng bộ skill 3d của MengTo/Skills"
status: pending
priority: P1
branch: "feat/troi-nam-homepage"
tags: [troi-nam, 3d, assets, homepage]
blockedBy: []
blocks: []
created: "2026-09-30T23:39:28.336Z"
createdBy: "ck:plan"
source: skill
---

# Trời Nam — thế giới cuộn dựng từ tranh vẽ

## 1. Chẩn đoán thật (đọc trước khi làm bất cứ thứ gì)

Plan 4 cũ (Task 1–5, đã push vào PR #239) có **hai vấn đề độc lập nhau**, cần tách bạch:

**Vấn đề A — thẩm mỹ.** Núi/trời/nước được dựng bằng hình học vector tô màu phẳng
(`ShapeGeometry` + `MeshBasicMaterial`). Đặt cạnh ảnh chụp Tràng An và phần chữ/form tinh
xảo, nó lộ ra rẻ tiền và giả. Founder bác ngày 2026-10-01. Đây là lỗi phán đoán của Claude:
bản đặc tả `docs/superpowers/specs/2026-09-30-troi-nam-effects-contract.md` nói "ẩn ảnh tĩnh
khi world sẵn sàng" và Claude làm theo mà không tự đánh giá kết quả nhìn có đẹp hơn ảnh gốc
không.

**Vấn đề B — hiệu ứng chưa từng chạy thật.** `.tn-world-backdrop` dùng `overflow: hidden`,
mà theo spec CSS `overflow: hidden` tạo ra scroll container, nên `position: sticky` bên trong
bám vào backdrop chứ không bám viewport. Đo thực tế trên trang đang chạy:

| scroll (tỉ lệ hero→explore) | `.tn-world-sticky` top so với viewport |
|---|---|
| 0 | +75px |
| 0.25 | **−577px** |
| 0.50 | **−1229px** |
| 0.75 | **−1880px** |
| 0.95 | **−2402px** |

Canvas trôi khỏi màn hình ngay sau hero. **Toàn bộ cảnh hoàng hôn → đêm → sao tụ về lá số
chưa bao giờ hiển thị trên trang thật** — nó chỉ chạy được trong trang thử nghiệm riêng
(`prototype/revamp-2026-09/troi-nam-world/`). Lúc nghiệm thu Task 4, Claude chụp ảnh giữa
trang, thấy ảnh tĩnh của Story và kết luận "canvas bị section đục che, đúng như thiết kế" —
kết luận sai; thực tế canvas đã ở trên đầu màn hình cả nghìn pixel.

**Hệ quả có lợi:** vì chưa ai từng thấy world 3D trên trang thật, việc thay toàn bộ cách
dựng cảnh **không phá vỡ trải nghiệm nào đang chạy**. Phần engine (vòng đời, tiến độ cuộn,
suy giảm chất lượng, mất context GPU) vẫn dùng lại được; chỉ phần *nội dung cảnh* bị thay.

## 2. Ba tính từ để nghiệm thu

Mọi khung hình của world phải đạt: **được bảo tồn · có nguồn gốc · được chiếu sáng có chủ đích**
(`docs/22-art-direction.md` §1). Thêm một tiêu chí do lần hỏng này sinh ra:

> **Không pixel nào trong world được vẽ bằng màu phẳng do code sinh ra.** Mọi thứ nhìn thấy
> phải bắt nguồn từ một tấm tranh/ảnh đã qua QA. Code chỉ được phép: đặt lớp, di chuyển
> camera, pha trộn, che khuất, và tính ánh sáng.

## 3. Quyết định kiến trúc

Skill `web-design/scroll-world-storytelling` bắt chọn **một** chế độ dựng. Ba lựa chọn cho
Trời Nam:

| Chế độ | Được gì | Mất gì | Chi phí |
|---|---|---|---|
| **A. Crossfade DOM thuần** (mở rộng Plan 3): L01 bình minh → L03 hoàng hôn → **L04 trời sao** + lớp phủ tranh có alpha | Đẹp ngay, chất lượng = chất lượng ảnh gốc, không WebGL, không rủi ro máy yếu | Không có chiều sâu thật, không có tia nắng phản ứng theo camera | ~1 ngày, 0 ảnh mới |
| **B. Thế giới lớp tranh (2.5D)**: các lớp núi PNG có alpha đặt ở độ sâu khác nhau trong Three.js, trời là ảnh, nước là ảnh, **tia nắng thật bị núi che** | Chiều sâu thật khi cuộn, god-ray đúng hình núi, sao tụ về vòng vàng P05 | Cần ảnh mới có alpha; rủi ro hiệu năng mobile | ~4–6 ngày + ảnh mới |
| C. Video scrub (render sẵn 1 cú máy 8–12s) | Điện ảnh nhất | ChatGPT không gen được video nhất quán; file nặng; sửa nhỏ = render lại | Không khả thi với công cụ hiện có |

**Chọn: A trước, rồi B.** Lý do thẳng thắn: **phần lớn cái đẹp đến từ chính tấm tranh, không
phải từ WebGL.** A dùng được ngay L04 (trời sao Ngân Hà — ảnh đẹp nhất trong kho, đang bỏ
không) và sửa được toàn bộ 6 lỗi, cho kết quả đẹp hơn hiện tại trong 1 ngày. B chồng thêm
chiều sâu + tia nắng — thứ CSS không làm được — nhưng chỉ nên đầu tư sau khi A đã đứng vững
và ảnh lớp mới về tay có chất lượng đạt.

Nếu ảnh lớp gen ra không đạt, dừng ở A: trang vẫn đẹp, không có nợ kỹ thuật treo.

## 4. Tận dụng kho ảnh đã gen (deliverable #1)

Kho `/Users/admin/Downloads/troi-nam-all` có 78 file; **pipeline đã đưa 100% vào manifest**
(`apps/web/public/images/troi-nam/manifest.json`) — không ảnh nào bị bỏ sót ở khâu xử lý.
Vấn đề là **code chỉ gọi tới một phần**. Bảng dưới là kế hoạch dùng hết:

### 4.1 Đang dùng (giữ nguyên)

| ID | Nội dung | Đang dùng ở |
|---|---|---|
| L01 / L02 | Tràng An bình minh sương vàng (desktop/mobile) | Hero plate |
| L03 | Tràng An hoàng hôn chuyển đêm | Hero crossfade + Story |
| L06 / L07 | Hội An đêm hoa đăng | Section nền |
| C00–C14 | 15 chân dung độc giả | Testimonials |
| I02 (12 icon) | Icon hành trình | Value / USP |
| E01, E02 | Lá vàng rơi, hoa đăng | Hiệu ứng CSS Plan 3 |
| P02 | Hoa tiết Đông Sơn chim lạc | Trang trí |
| S01–S04 | 4 tranh nhu cầu | Needs |
| T01, T04, T08 | Nền sơn mài, dải tranh, giấy dó | Nền section |

### 4.2 Chưa dùng → phân bổ trong kế hoạch này

| ID | Nội dung | Dùng vào đâu | Phase |
|---|---|---|---|
| **L04 / L05** | **Hạ Long Ngân Hà trời sao** (desktop/mobile) | **Tấm "đêm" của hero crossfade — mảnh ghép còn thiếu của hành trình bình minh→đêm** | 1 |
| **L13** | Thung lũng tia nắng xuyên núi đá vôi | Nền beat "mở khóa bằng Lá" + ảnh tham chiếu hướng sáng cho god-ray | 1, 4 |
| **T11** | Sương mờ bay (có alpha, 3 dải rời) | Lớp sương giữa các lớp núi | 1 (CSS), 3 (3D) |
| **T03** | Vụn vàng lá rơi (có alpha) | Hạt vàng bay ở beat chuyển cảnh — skill `3d-falling-leaves` | 4 |
| **T07** | Mây khảm xà cừ (có alpha) | Mây tầng cao lúc hoàng hôn | 4 |
| **P05** | **Vòng 12 phần nét vàng (có alpha)** | **Vòng lá số hiện ra khi sao tụ — thay cho 12 cụm chấm vẽ bằng code** | 5 |
| **P01** | Mặt trống đồng Đông Sơn (có alpha) | Vòng ngoài của khoảnh khắc bàn giao lá số | 5 |
| **I01** (12 icon) | 12 icon cung số | 12 ô `.hv3-cell` của Explore (hiện chỉ có chữ) | 5 |
| **T10** | Tranh sơn mài Trời Nam (dọc) | Panel "về Trời Nam" / About | 1 |
| **L09–L12** | Tràng An xuân / Tết / hạ sen / đông sương | Dải "bốn mùa" — skill `3d-four-seasons`, hoặc nền luân phiên theo mùa | 5 (tuỳ chọn) |
| **L08** | Mù Cang Chải mùa nước đổ | Nền beat "vận hạn năm nay" | 5 (tuỳ chọn) |
| **S05** | Cá chép vàng lá hồ sơn mài | Beat tài lộc / bảng giá | 5 (tuỳ chọn) |
| **O01** | Ảnh chia sẻ trời sao + lá số | Ảnh OG mạng xã hội (`opengraph-image`) | 1 |
| **T02, T05, T06, T09** | Vàng lá, xà cừ, giấy dó mép xơ | Bề mặt thẻ/panel — nâng chất liệu DOM | 5 (tuỳ chọn) |
| **P03, P04** | Đai viền Đông Sơn, mây lạnh nét vàng | Đường phân cách section | 5 (tuỳ chọn) |

Sau kế hoạch này: **0 ảnh nằm không** trong nhóm bắt buộc; nhóm "tuỳ chọn" là phần mở rộng
nếu founder muốn đi tiếp.

### 4.3 Bộ ảnh lớp W01–W11 — ĐÃ GIAO 2026-10-01

L01/L03/L04 là **ảnh phẳng đã bẹt**: núi, nước, trời dính liền một tấm. Không tách được thành
lớp → không có parallax thật, và không có mặt nạ che để làm god-ray. Vì vậy Phase 2 đặt gen
thêm 11 ảnh lớp có alpha.

**Kết quả:** đủ 11 ảnh (bản chính + alt), đã kiểm chứng độc lập — alpha thật trên cả 8 ảnh cần
alpha, đúng kích thước, trời sạch không dính núi. Chi tiết số đo + 3 phát hiện ảnh hưởng tới
Phase 3 (nguồn gen ở độ phân giải thấp rồi phóng to; W07 gần như đục; dải sáng đáy trời):
[phase-02 § Nghiệm thu](./phase-02-asset-generation.md#nghiệm-thu-đợt-giao-2026-10-01).

| Ảnh | Nội dung | Vai trò trong world |
|---|---|---|
| W01/W02/W03 | Trời bình minh / hoàng hôn / Ngân Hà (opaque, 2560×1440) | 3 tấm trời pha theo tiến độ cuộn |
| W04/W05/W06 | Núi đá vôi lớp xa / giữa / gần (alpha) | Chiều sâu parallax + **mặt nạ che cho god-ray** |
| W07 | Mặt nước phản chiếu vàng (alpha mép trên) | Mặt nước tiền cảnh |
| W08 | Khung vách đá + tán lá (alpha) | Lớp gần camera nhất, tạo chiều sâu mạnh nhất |
| W09 | Thuỷ đình + thuyền nan (alpha, đã tách 2 file) | Vật thể trung cảnh |
| W10 | Đĩa mặt trời + quầng (alpha, đối xứng xuyên tâm) | Nguồn sáng dùng chung cho trời và god-ray |
| W11 | 6 hạt sao (alpha, đã tách 6 file) | Hạt sao tụ về vòng lá số |

## 5. Sáu lỗi ChatGPT báo — đã kiểm chứng

| # | Lỗi | Kiểm chứng | Sửa ở |
|---|---|---|---|
| 1 | `overflow: hidden` khiến sticky không bám viewport | **ĐÚNG** — đo được, canvas trôi tới −2402px | Phase 1 |
| 2 | Bật reduced-motion lúc đang tải Three.js vẫn khởi tạo 3D | **ĐÚNG** — `onReducedMotionChange` không đặt `cancelled = true` | Phase 1 |
| 3 | Sao không hội tụ đúng vào lá số khi cuộn | **ĐÚNG** — `setChartTarget` chiếu theo camera tại thời điểm gọi; cuộn đổi cả camera lẫn vị trí lá số nhưng không chiếu lại | Phase 1 (hạ tầng), Phase 5 (hiệu ứng thật) |
| 4 | Tier "low" không giới hạn 30fps | **ĐÚNG** — bỏ mỗi RAF thứ hai chỉ cho 30fps trên màn 60Hz; màn 120/144Hz vẫn chạy 60/72fps | Phase 1 |
| 5 | Builder lỗi giữa chừng không giải phóng tài nguyên đã tạo | **ĐÚNG** — 4 lệnh `create*` không nằm trong try/catch | Phase 1 |
| 6 | Lỗi render sau frame đầu không lùi về ảnh tĩnh | **ĐÚNG** — chỉ frame đầu có try/catch | Phase 1 |

Cả 6 lỗi nằm ở phần **engine được giữ lại**, nên phải sửa dù chọn chế độ A hay B. Gom hết
vào Phase 1.

## 6. Skill áp dụng

| Skill (MengTo/Skills, đã cài sẵn) | Dùng cho | Phase |
|---|---|---|
| `scroll-world-storytelling` | Chọn chế độ dựng, viết beat ledger | 1 |
| `scroll-scrubbed-visual-sequence` | Sân khấu sticky + tiến độ cuộn chuẩn hoá, có thể đảo chiều | 1 |
| `3d-sky-background` | Trời bằng ảnh, pha trộn bình minh/hoàng hôn/đêm theo trọng số liên tục, sRGB/linear đúng, có nền dự phòng khi ảnh lỗi | 3 |
| `3d-high-resolution-textures` | Mật độ texel, mipmap, anisotropy, sRGB vs linear, tải tăng dần, ngân sách bộ nhớ GPU | 3 |
| `3d-sky-rays` | God-ray có mặt nạ che thật từ lớp núi alpha, cùng một hướng mặt trời với trời và đèn | 4 |
| `3d-falling-leaves` | Vụn vàng T03 rơi | 4 |
| `3d-retina-resolution` | DPR, đồng bộ renderer/composer, fallback đo được | 4 |
| `build-threejs-scroll-worlds` | Kiến trúc chapter ledger, conductor, ngân sách hiệu năng, QA | 3–5 |
| `3d-four-seasons` | Dải bốn mùa L09–L12 (tuỳ chọn) | 5 |

## 7. Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [foundation-fixes](./phase-01-foundation-fixes.md) | Pending |
| 2 | [asset-generation](./phase-02-asset-generation.md) | **Ảnh đã giao — còn khâu nhập kho** |
| 3 | [painted-layer-world](./phase-03-painted-layer-world.md) | Pending |
| 4 | [rays-and-atmosphere](./phase-04-rays-and-atmosphere.md) | Pending |
| 5 | [chart-handoff-and-qa](./phase-05-chart-handoff-and-qa.md) | Pending |

**Điểm dừng quyết định:** cuối Phase 1 trang đã đẹp hơn hiện tại và hết lỗi. Founder xem rồi
mới quyết có đi tiếp Phase 3–5 hay không.

**Thứ tự chạy khuyến nghị:** Phase 1 (sửa lỗi, CSS thuần) → nhập kho W01–W11 → Phase 3. Phase 1
và khâu nhập kho độc lập nhau, làm song song được.

## 8. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Ảnh lớp gen ra không tách nền sạch (viền răng cưa, cây cối bệt) | Cao | QA alpha bắt buộc trước khi nhập; có phương án dự phòng: tách lớp từ L01/L04 bằng luminance key (pipeline đã có kỹ thuật này cho I01/I02) |
| God-ray làm tụt fps trên điện thoại | Trung bình | Buffer nửa độ phân giải, 24–32 mẫu, tắt hẳn ở tier low; đã có sẵn cơ chế suy giảm 3 bậc |
| Lớp tranh nhìn như "sân khấu giấy bồi" (paper-doll) khi camera đi quá xa | Trung bình | Biên độ camera nhỏ, có sương xen giữa các lớp, không xoay ngang nhiều |
| Làm hỏng trang chủ `/` đang chạy | Thấp | Mọi thay đổi nằm trong `/troi-nam` (noindex) và file `troi-nam-*`; không đụng component dùng chung |
| Founder vẫn thấy chưa đẹp sau Phase 3 | Trung bình | Điểm dừng quyết định cuối Phase 1; mỗi phase đều chụp ảnh nghiệm thu trước khi đi tiếp |

## 9. Quy ước thực thi

- **Không viết code production trên Opus.** Kế hoạch này viết trên Opus; khâu code giao cho
  Sonnet (hoặc đổi model) — theo quy ước đã chốt 2026-09-30.
- Mỗi hiệu ứng: dựng → chụp ảnh → tự đánh giá đẹp/xấu → rồi mới đi tiếp. **Không tin bản đặc
  tả về chuyện đẹp/xấu.**
- Mỗi slice commit riêng, gộp vào PR #239.
- Mỗi phase kết thúc bằng bằng chứng ảnh chụp thật ở 390 và 1440, cộng reduced-motion.

## Dependencies

Thay thế phần "cách dựng cảnh" của `docs/superpowers/plans/2026-09-30-troi-nam-plan-4-world.md`
và `docs/superpowers/specs/2026-09-30-troi-nam-effects-contract.md` §"Local world construction".
Phần hợp đồng vòng đời (`WorldHandle`, tiến độ cuộn, reduced-motion, suy giảm) của hai tài liệu
đó **vẫn còn hiệu lực**.
