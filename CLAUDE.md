# CLAUDE.md — Repo-specific instructions

## Git workflow (chốt 2026-08-31)

Quy tắc bắt buộc cho mọi thao tác git trong repo này, áp dụng cho mọi phiên làm việc:

- **Không bao giờ push hoặc merge trực tiếp vào `master` bằng git CLI.** Không `git push origin master`, không `git merge` rồi push thẳng vào `master`.
- Hai branch cố định, dùng xuyên suốt (không tạo mới mỗi việc):
  - `anh` — branch của user (anh/a), chứa docs/concept/spec updates.
  - `an-dev` — branch của An (dev), tạo từ `anh`, dùng để code.
- Flow:
  1. Anh tạo hoặc cập nhật branch `anh` (docs, concept, spec...) và push lên `origin/anh`.
  2. An checkout `anh`, tạo/cập nhật `an-dev` từ đó để code.
  3. Khi anh có update mới trên `anh`, merge `anh` → `an-dev` trước khi An code tiếp.
  4. Khi An code xong một phần việc, merge `an-dev` → `anh`.
  5. Khi sẵn sàng release: mở **Pull Request từ `anh` → `master` trên GitHub**, review rồi bấm merge trên GitHub UI. Không merge `master` bằng CLI.
- Push lên `origin/anh` hoặc `origin/an-dev` được làm tự do (đây là phần "push branch lên git" được cho phép). Chỉ riêng đường vào `master` phải qua PR đã review.
- Nếu chưa có branch `anh`/`an-dev` trên remote, tạo mới từ `master` tại thời điểm bắt đầu việc tiếp theo.
