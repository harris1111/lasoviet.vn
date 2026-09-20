---
title: "Audit: luồng \"Đăng nhập để lưu lá số\" bị văng về wizard trống sau Google OAuth"
version: 1.1
status: partially-resolved
date: 2026-09-12
reporter: Harris/Product
assignee: An/Development
related: docs/15-collaboration-branch-workflow.md
---

# Audit: tạo tài khoản / đăng nhập Google giữa luồng lập lá số

## 1. Triệu chứng quan sát được

1. Điền đầy đủ ngày giờ sinh trong wizard "Lập lá số".
2. Đến bước tạo tài khoản (`Đăng nhập để lưu lá số`), bấm **"Tiếp tục với Google"**.
3. Hoàn tất Google OAuth.
4. Thay vì quay lại điểm đang dở (lưu lá số / bước Review), hệ thống bung thẳng về
   `/tao-la-so/tu-vi` bước 1 ("Người được lập lá số") — **trắng hoàn toàn**, không có
   banner "Đang sử dụng thông tin sinh đã lưu" (banner này chỉ xuất hiện khi có cache hợp lệ).

Đây là dấu hiệu cho thấy: (a) toàn bộ dữ liệu vừa nhập bị mất, và (b) trang đích sau
OAuth không phải là nơi thao tác lẽ ra phải quay về.

## 2. Kết luận root cause (đã trace trực tiếp trong code, không đoán)

Có **3 lỗi độc lập cộng dồn**, không phải một lỗi đơn lẻ. Sửa lỗi (1) một mình sẽ không
khắc phục triệu chứng nếu không xử lý luôn (2) và (3).

### (1) Trang kết quả lá số không có nút "Đăng nhập" thật — chỉ là text tĩnh

`apps/web/src/app/[locale]/la-so/[chartId]/page.tsx:97-105`

```tsx
{actor.kind === "anonymous" ? (
  <div className="result-privacy-note">
    <p>
      ...Đăng nhập để lưu lại, hoặc xóa ngay bên dưới.
    </p>
  </div>
) : null}
```

Dòng "Đăng nhập để lưu lại" **không có `<Link>`/`href` nào cả**. Đã `grep` toàn bộ
`features/reports`, `features/ziwei`, `features/privacy` (các component được trang này
render: `FreeIdentityPreview`, `ZiweiResultSummary`, `AnonymousDataDeletionControl`) —
không nơi nào có link tới `/dang-nhap`. Nghĩa là: **từ trang kết quả lá số (guest), hiện
không có cách nào bấm để bắt đầu luồng lưu tài khoản đúng cách.** Đây khác hẳn cách
`bao-cao/[reportId]/page.tsx:18-20` và `thanh-toan/[orderId]/page.tsx` làm — hai chỗ đó
build link kiểu:

```ts
`${prefix}/dang-nhap?callbackURL=${encodeURIComponent(currentPath)}`
```

→ đúng, quay lại đúng trang sau khi login. Trang `la-so/[chartId]` thì chưa được nối dây
theo pattern này.

### (2) Link "Đăng nhập" trên header chính không mang `callbackURL`

`apps/web/src/components/site-header.tsx:262` (desktop) và `:315` (mobile):

```ts
href: route(locale, "/dang-nhap")
```

Không có `?callbackURL=...`. Nếu người dùng bấm "Đăng nhập" ở đây (chỗ duy nhất thực sự
có thể bấm được trong lúc đang thao tác trên homepage), `callbackURL` gửi lên server là
`undefined`.

`apps/web/src/features/auth/auth-callback-resolver.ts:6-12`:

```ts
const fallback = locale === "en" ? "/en/tao-la-so/tu-vi" : "/tao-la-so/tu-vi";
if (typeof rawUrl !== "string") {
  return fallback;
}
```

→ **fallback cứng luôn là `/tao-la-so/tu-vi`** — đúng chính xác cái wizard trống mà anh
thấy sau khi OAuth xong. Đây giải thích tại sao trang đích lại đúng y hệt route đó, không
phải trùng hợp.

Lưu ý: `resolveAuthCallbackUrl` bản thân nó *không* có allowlist theo route, chỉ chặn
`//`, backslash, control-char, khác-origin. Nên nếu (1) được nối dây đúng
(`callbackURL=/la-so/{chartId}`), resolver này chấp nhận bình thường, không phải sửa gì
thêm ở đây.

### (3) Wizard/hero-form không autosave — mất dữ liệu ngay cả khi (1)+(2) được sửa

- `apps/web/src/features/homepage/homepage-hero.tsx`: form mini ở homepage chỉ gọi
  `saveHomepageBirthPrefill(...)` **bên trong `handleSubmit`** (dòng 120), tức chỉ lưu khi
  bấm nút submit chính ("Tạo lá số"). Gõ dở rồi bấm sang chỗ khác (kể cả bấm "Đăng nhập")
  → dữ liệu bay mất, không có `onBlur`/autosave nào khác.
- `apps/web/src/features/birth-profile/birth-profile-form.tsx`: wizard 3 bước chỉ gọi
  `saveBirthCache(...)` **một lần duy nhất, sau khi `submitBirthProfile` thành công ở bước
  3** (dòng 441-449) — tức là sau khi đã tạo xong lá số, không phải trong lúc đang điền.
  Rời trang giữa chừng (kể cả để đi đăng nhập) trước khi bấm submit cuối cùng → dữ liệu
  cũng mất, độc lập với mọi thứ ở (1)/(2).
- Bản thân `BirthProfileForm` cũng luôn mount cứng `useState<1 | 2 | 3>(1)` — **không có
  cơ chế nào để quay lại đúng bước 3/Review** sau khi round-trip qua trang khác. Kể cả nếu
  cache birth-date tồn tại và được prefill lại, người dùng vẫn bị đẩy về bước 1, phải bấm
  Tiếp tục lại từ đầu.

## 3. Vì sao ảnh chụp lại "trắng hoàn toàn" đúng y hệt

Ghép (2) + (3): người dùng gõ ngày sinh → bấm "Đăng nhập" (link không mang callbackURL,
và hành động này cũng không trigger save nào) → hoàn tất Google OAuth → server fallback về
`/tao-la-so/tu-vi` (đúng theo (2)) → wizard mount lại bước 1, cache rỗng vì chưa từng được
ghi (đúng theo (3)) → đúng y hệt hình 2 gửi kèm: trống, không banner "đã lưu thông tin".

## 4. Việc backend (auth linking) có vẻ ổn, vấn đề nằm ở tầng UI/wiring

`apps/web/src/auth/auth.ts` có plugin `anonymous()` với `onLinkAccount` gọi
`linkAnonymousActorToAccount` — tức thiết kế đúng hướng "guest tạo lá số ẩn danh → đăng ký
tài khoản → actor ẩn danh được gắn vào tài khoản mới, giữ nguyên dữ liệu". Nhưng
`docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/phase-01-data-identity-and-birth-profile.md`
ghi rõ: việc verify linking này **"No browser/Playwright, Google OAuth, live SMTP, UI
work... occurred"** — nghĩa là cơ chế linking phía DB có test, nhưng **chưa từng được kiểm
qua browser thật với Google OAuth thật**. Bug này chính là hệ quả: phần nối dây UI
(button/link/callbackURL/autosave) chưa từng được người thật đi qua từ đầu đến cuối.

Cũng đã kiểm tra: commit `bbd0d7f fix(auth): complete verified account sign-in flow` (đã
merge vào `product/experience-spec-v1`) chỉ sửa `auth-panel.tsx`, `auth-client-actions.ts`,
`auth-callback-resolver.ts`, `dang-nhap/page.tsx` — tức các thứ *bên trong* trang
`/dang-nhap`. Không đụng gì tới `la-so/[chartId]/page.tsx` hay `site-header.tsx`, nên
không giải quyết 3 lỗi trên.

## 5. Đề xuất hướng cho An (không phải fix sẵn — An quyết định implementation)

1. Nối `la-so/[chartId]/page.tsx` với một link/button thật tới
   `/dang-nhap?callbackURL=/la-so/{chartId}` (theo đúng pattern `localizedSignInPath` đã có
   ở `bao-cao/[reportId]/page.tsx`), thay cho đoạn text tĩnh hiện tại.
2. Cân nhắc: link "Đăng nhập" trên `site-header.tsx` có nên luôn mang `callbackURL` trỏ về
   trang hiện tại không (ví dụ dùng `usePathname()` phía client)? Nếu không, ít nhất cần
   quyết định rõ: link header là "đăng nhập chung chung" (chấp nhận về trang mặc định) hay
   phải giữ ngữ cảnh.
3. Xem lại chiến lược autosave cho `HomepageHero` và `BirthProfileForm` — có thể ghi
   `sessionStorage`/`localStorage` theo debounce mỗi khi field đổi, thay vì chỉ tại thời
   điểm submit, để rời trang giữa chừng không mất trắng.
4. Nếu muốn hỗ trợ "quay lại đúng bước Review sau khi round-trip login", `BirthProfileForm`
   cần đọc step ban đầu từ cache/query thay vì hard-code `useState(1)`.
5. Viết ít nhất 1 test E2E (Playwright) đi hết luồng: điền wizard → click nút lưu → Google
   OAuth (có thể mock provider) → xác nhận quay lại đúng trang kết quả với dữ liệu còn
   nguyên. Đây là khoảng trống test duy nhất khiến bug này lọt qua tới giờ.

## 6. Trạng thái khắc phục và bằng chứng đối soát (Cập nhật 2026-09-12)

### (a) Các hạng mục đã được xử lý (Fixed)
- **Bảo lưu callbackURL từ trang kết quả lá số (Nguyên nhân 1):** Đã khắc phục trong lineage commit `2deb64d` (và merge `9661eb2`). Trang `apps/web/src/app/[locale]/la-so/[chartId]/page.tsx` sử dụng thẻ `Link` trực tiếp với `href` được tạo từ `localizedSignInPath` / `signInHref` (trỏ tới `/dang-nhap?callbackURL=/la-so/{chartId}` hoặc `/en/la-so/{chartId}`) thay vì dùng text tĩnh và không dùng `SiteHeaderSignInLink` tại trang này; có unit test tại `apps/web/src/app/[locale]/la-so/[chartId]/page.test.tsx`.
- **Bảo lưu callbackURL trên site header (Nguyên nhân 2):** Đã khắc phục trong lineage commit `2deb64d` / `9661eb2`. Component helper `apps/web/src/components/site-header-sign-in-link.tsx` sử dụng hook `usePathname` (không dùng `useSearchParams`) để đọc đường dẫn hiện tại và nhận `currentPath` được truyền từ `site-header.tsx`, từ đó tạo `callbackURL` chính xác theo ngữ cảnh; được kiểm chứng bởi `apps/web/src/components/site-header.test.tsx` và Playwright E2E test `tests/e2e/chart-sign-in-return.spec.ts`.

### (b) Các hạng mục chưa xử lý và cần theo dõi tiếp (Unresolved Follow-up)
- **Autosave dữ liệu form dở dang (Nguyên nhân 3):** `HomepageHero` và `BirthProfileForm` chưa có cơ chế autosave theo debounce vào `sessionStorage`/`localStorage`. Người dùng nhập dở thông tin sinh rồi rời trang/bấm đăng nhập trước khi submit vẫn bị mất dữ liệu.
- **Quay lại đúng bước wizard (Exact wizard-step resume):** `BirthProfileForm` vẫn khởi tạo cứng `useState(1)` thay vì khôi phục bước từ query/cache, chưa hỗ trợ quay lại đúng bước 3/Review sau khi hoàn tất đăng nhập.

### (c) Kết luận phạm vi
Luồng này **chưa được coi là hoàn tất toàn bộ (the complete OAuth flow is NOT claimed to be fixed)**. Chỉ có việc bảo lưu callback điều hướng (chart-page / header callback preservation) là đã hoàn tất qua lineage `2deb64d`/`9661eb2`. Hai vấn đề về dữ liệu in-flight (autosave và exact wizard-step resume) vẫn là việc tồn đọng cần xử lý trong các hạng mục tiếp theo (unresolved follow-up work).
