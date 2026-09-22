---
title: Lá Số Việt — Light Theme Color Spec (build-ready)
version: 1.0
status: founder-approved
date: 2026-09-20
owner: Harris/Product (spec) · An/Development (build)
depends_on:
  - docs/22-art-direction.md
  - docs/13-brand-experience-guideline.md §5.2
  - apps/web/src/styles/tokens.css
decision_ref: FD-088
---

# 24 — Light Theme Color Spec

Spec này để **build thẳng**, không cần vòng thiết kế nào nữa. Mọi giá trị đã
được đo WCAG 2.2 AA và ghi tỷ lệ kèm theo. An build code + production.

> **Lưu ý về quy trình:** founder yêu cầu dùng skill `ui-ux-pro-max` và
> `design-taste-frontend` cho spec này. Hai skill đó không nạp được nội dung
> trong phiên làm việc ngày 2026-09-20 (chỉ trả về dòng khởi chạy). Spec được
> viết trực tiếp, mọi tỷ lệ tương phản là **số đo thật**, không ước lượng.

## 0. Ba việc phải làm trước khi nói đến light theme

Audit ngày 2026-09-20 cho thấy codebase **chưa đổi theme được**, và có lỗi
đang chạy trên production. Ba việc này là điều kiện tiên quyết.

### 0.1 LỖI ĐANG CHẠY — 14 token được dùng nhưng chưa bao giờ định nghĩa

104 lượt sử dụng. Trong đó **6 token không có cả giá trị dự phòng**, nên CSS
không hợp lệ và chữ **kế thừa màu của thẻ cha** thay vì màu đúng:

| Token | Số lượt | Hệ quả |
|---|---:|---|
| `--pearl-300` | 13 | Không fallback → chữ sai màu. `global.css:144`, `:553`, `birth-profile-wizard.css:1397` |
| `--pearl-100` | 12 | Không fallback → chữ sai màu. Tiêu đề trang Chính sách bảo mật, `.palace-title`, `.report-fact-item dd` |
| `--pearl-500` | 4 | Không fallback |
| `--gold-300` | 5 | Không fallback |
| `--pearl-800` | 1 | Không fallback |
| `--lacquer-950` | 2 | Không fallback |
| `--teal` | 37 | Rơi về `#6e9c97` |
| `--teal-tint` | 7 | Rơi về **hai giá trị khác nhau** |
| `--teal-deep` | 2 | Rơi về `#33504c` |
| `--oxblood` | 14 | Rơi về `#9b6358` |
| `--oxblood-deep` | 2 | Rơi về `#4a2e29` |
| `--oxblood-tint` | 1 | Rơi về `rgba(123,67,61,.18)` |
| `--son-deep` | 3 | Rơi về `#6b211a` |
| `--accent-seal` | 4 | Rơi về **hai màu khác nhau**: 3 lần `#ce5b45` (son, đúng), 1 lần `#c9a44d` (vàng, **sai**) tại `good-days-preview.tsx:804` |

§1 dưới đây định nghĩa đủ cả 14, **giữ nguyên giá trị đang hiển thị** để việc
sửa không làm đổi giao diện — trừ `--accent-seal` ở `good-days-preview.tsx:804`
là sửa lỗi thật.

### 0.2 Lớp semantic đang nằm sai file

`--surface-*`, `--text-*`, `--border-*`, `--accent-*` được định nghĩa trong
`discipline-pages-foundation.css` — **chỉ áp cho trang bộ môn**. Phải nâng lên
`tokens.css` để toàn cục. Không có bước này thì đổi theme chỉ đổi được một phần
site.

### 0.3 43 hex trần trong 7 file `.tsx`

Nằm ngoài mọi token, đổi theme sẽ **không đổi**. Phải quy về token trước khi
bật light theme, nếu không sẽ có những mảng màu tối đứng giữa nền sáng.

## 1. Kiến trúc token — ba lớp

```
Lớp 1 PRIMITIVE   giá trị màu thật, không đổi theo theme
Lớp 2 SEMANTIC    ánh xạ theo theme  ← component CHỈ được dùng lớp này
Lớp 3 COMPONENT   dùng var(--surface-panel) v.v.
```

Đổi theme = đổi **duy nhất lớp 2**. Đó là mục tiêu của toàn bộ spec này.

### 1.1 Primitives — dán vào `tokens.css`

```css
:root {
  /* Sơn mài — bề mặt tối */
  --lacquer-950: #080706;
  --lacquer-900: #0f0d0a;
  --lacquer-800: #15120e;
  --lacquer-700: #1c1813;
  --lacquer-line: #3a3227;

  /* Giấy — bề mặt sáng (nguồn: docs/13 §5.2) */
  --paper-50:  #fffdf7;
  --paper-100: #f7f1e5;
  --paper-200: #eee5d6;
  --paper-300: #d7cdbd;
  --control-border: #958a7c;

  /* Vàng */
  --gold-300: #f8ebc6;
  --gold-400: #f2dca0;
  --gold-500: #c9a44d;
  --gold-600: #a8842f;
  --gold-700: #9a7730;
  --gold-800: #755718;   /* MỚI — vàng đủ tương phản cho chữ trên nền sáng */

  /* Son */
  --son: #ce5b45;
  --son-deep: #6b211a;
  --cinnabar-700: #a63d2f;   /* MỚI — son cho nền sáng (docs/13 §5.2) */

  /* Ngọc trai — chữ trên nền tối */
  --pearl-50:  #f6f1e6;
  --pearl-100: #eae4d5;
  --pearl-200: #dcd4c3;
  --pearl-300: #c5bca8;
  --pearl-400: #a79e8b;
  --pearl-500: #8a8270;
  --pearl-600: #6e6656;
  --pearl-800: #4a4438;

  /* Mực — chữ trên nền sáng (docs/13 §5.2) */
  --ink-900: #14263d;
  --ink-800: #263445;
  --ink-600: #5e6873;
  --ink-400: #7a8592;   /* MỚI — chữ mờ cho nền sáng */
}
```

### 1.2 Semantic — theme sơn mài (mặc định)

```css
:root, :root[data-theme="lacquer"] {
  --surface-deep:    var(--lacquer-900);
  --surface-canvas:  var(--lacquer-800);
  --surface-panel:   var(--lacquer-700);
  --border-hairline: var(--lacquer-line);
  --border-control:  var(--pearl-600);

  --text-heading: var(--pearl-50);
  --text-body:    var(--pearl-200);
  --text-muted:   var(--pearl-400);
  --text-faint:   var(--pearl-600);

  --accent-gold: var(--gold-500);
  --accent-seal: var(--son);

  --status-link:    #7fb2d8;
  --status-success: #6fbf96;
  --status-warning: #e0ae52;
  --status-error:   #e8798a;

  --cta-fg: var(--lacquer-900);
}
```

### 1.3 Semantic — theme sáng

```css
:root[data-theme="paper"] {
  /* Giữ nguyên quan hệ độ cao: panel nổi nhất, deep lùi nhất */
  --surface-deep:    var(--paper-200);
  --surface-canvas:  var(--paper-100);
  --surface-panel:   var(--paper-50);
  --border-hairline: var(--paper-300);
  --border-control:  var(--control-border);

  --text-heading: var(--ink-900);
  --text-body:    var(--ink-800);
  --text-muted:   var(--ink-600);
  --text-faint:   var(--ink-400);

  --accent-gold: var(--gold-800);      /* KHÔNG dùng gold-500: chỉ 2.10:1 */
  --accent-seal: var(--cinnabar-700);

  --status-link:    #174f7a;
  --status-success: #2f6f57;
  --status-warning: #8a5a12;
  --status-error:   #8f2737;

  --cta-fg: var(--lacquer-900);        /* giữ nguyên — xem §3 */
}
```

### 1.4 Màu nhấn từng bộ môn

Màu hiện tại chỉnh cho nền tối, **trượt AA trên nền sáng** nên bắt buộc có bản riêng.

| Bộ môn | Sơn mài | Trên nền sáng | Bản sáng | Đo trên `--paper-200` |
|---|---|---|---|---|
| Jade (Bát Tự) | `#4f7a68` | 4.33 ✗ | `#2f5446` | **6.79:1** ✓ |
| Bronze (Kinh Dịch) | `#8a7450` | 3.98 ✗ | `#5c4a2e` | **6.80:1** ✓ |
| Mineral (Chiêm Tinh) | `#6e93ac` | 2.90 ✗ | `#33566b` | **6.26:1** ✓ |
| Indigo (Thần Số Học) | `#7a82a0` | 3.38 ✗ | `#454b63` | **6.89:1** ✓ |
| Ochre | `#b08a4a` | 2.84 ✗ | `#6e5214` | **5.84:1** ✓ |
| Teal | `#6e9c97` | — | `#33504c` | **7.03:1** ✓ |
| Oxblood | `#9b6358` | — | `#6e3a32` | **7.27:1** ✓ |

`-tint` (nền mờ) giữ cùng hệ màu, alpha `0.10` trên nền sáng thay vì `0.16–0.18`
trên nền tối — nền sáng cần ít alpha hơn để đạt cùng độ nổi.

## 2. Số đo tương phản

### 2.1 Theme sơn mài — đo lần đầu 2026-09-20

Trước ngày này **chưa ai đo**. Kết quả: đạt, trừ hai chỗ.

| Cặp màu | Trên `canvas` | Trên `panel` |
|---|---|---|
| `text-heading` | 16.58 ✓ | 15.67 ✓ |
| `text-body` | 12.67 ✓ | 11.98 ✓ |
| `text-muted` | 7.03 ✓ | 6.65 ✓ |
| `accent-gold` | 7.91 ✓ | 7.48 ✓ |
| **`text-faint`** | **3.29 ✗** | **3.11 ✗** |
| **`accent-seal`** | 4.63 ✓ | **4.38 ✗** |

**Hai ràng buộc bắt buộc:**
- `--text-faint` **không được dùng cho chữ mang thông tin**. Chỉ dùng cho chữ ≥18.66px bold hoặc ≥24px, hoặc yếu tố trang trí. Cần chữ nhỏ mà mờ → dùng `--text-muted`.
- `--accent-seal` **không được dùng làm chữ thường trên `--surface-panel`**. Trên panel chỉ dùng làm viền, icon lớn, hoặc nền có chữ tối đè lên.

### 2.2 Theme sáng — đo khi thiết kế

| Cặp màu | `panel` P50 | `canvas` P100 | `deep` P200 |
|---|---|---|---|
| `text-heading` ink-900 | 15.02 ✓ | 13.58 ✓ | 12.23 ✓ |
| `text-body` ink-800 | 12.44 ✓ | 11.25 ✓ | 10.13 ✓ |
| `text-muted` ink-600 | 5.57 ✓ | 5.04 ✓ | 4.54 ✓ |
| `accent-seal` cinnabar-700 | 6.20 ✓ | 5.61 ✓ | 5.05 ✓ |
| `accent-gold` gold-800 | 6.59 ✓ | 5.96 ✓ | 5.37 ✓ |
| `status-link` | — | — | 6.90 ✓ |
| `status-success` | — | — | 4.76 ✓ |
| `status-warning` | — | — | 4.73 ✓ |
| `status-error` | — | — | 6.69 ✓ |
| `border-control` | — | 3.01 ✓ (UI ≥3.0) | — |

`text-muted` trên `deep` = 4.54:1, sát ngưỡng. Nếu đổi `--paper-200` đậm hơn
phải đo lại ngay.

**Cảnh báo:** `--gold-500` (`#c9a44d`) trên nền sáng chỉ **2.10:1**. Tuyệt đối
không dùng làm chữ ở theme sáng. Đó là lý do có `--gold-800`.

## 3. Nút CTA gradient vàng — dùng chung cả hai theme

Gradient vàng với chữ `--lacquer-900` đạt AA trên **toàn bộ** dải gradient:

| Điểm gradient | Tỷ lệ |
|---|---|
| `--gold-400` sáng nhất | 14.34:1 ✓ |
| `--gold-500` giữa | 8.22:1 ✓ |
| `--gold-700` tối nhất | 4.67:1 ✓ |

Nút CTA chính **không cần biến thể theme**. Đây là điểm neo thương hiệu: dù
nền sáng hay tối, nút hành động vẫn là vàng dát trên nền tối — giữ đúng ý
"vàng bắt sáng ở rìa, đỏ son như con dấu" ở `docs/22` §1.

## 4. Thứ tự build cho An

1. **Sửa lỗi trước** — định nghĩa đủ 14 token ở §1.1, giữ nguyên giá trị đang
   hiển thị. Sửa `--accent-seal` tại `good-days-preview.tsx:804` từ vàng về son.
   *Bước này độc lập với light theme và nên làm ngay.*
2. Nâng lớp semantic từ `discipline-pages-foundation.css` lên `tokens.css`.
3. Quy 43 hex trần về token.
4. Thêm khối `[data-theme="paper"]` ở §1.3 + §1.4.
5. Thêm nút đổi theme, lưu lựa chọn, tôn trọng `prefers-color-scheme` ở lần
   đầu truy cập. Mặc định vẫn là sơn mài.
6. Đo lại bằng công cụ thật sau khi ảnh và nội dung thật vào chỗ. Số trong spec
   này tính trên màu phẳng; **ảnh nền có thể phá tương phản chữ đè lên**, đúng
   cảnh báo ở `docs/22` §6.

## 5. Điều spec này KHÔNG quyết

- **Không cho phép build ngay.** Thời điểm do founder quyết. Ưu tiên hiện tại
  vẫn là luồng Tử Vi (`docs/23` §0).
- Không đổi typography, icon, motion (`docs/13` §5.3, §5.6, §5.8) hay layout/spacing (spec FD-091).
- Không quyết art direction ảnh cho theme sáng. Ảnh hiện tại chụp trên nền sơn
  mài sẫm; theme sáng cần hướng ảnh riêng, **không suy ra bằng cách đảo màu**.
  Việc đó thuộc `docs/22`, làm khi founder mở light theme.
