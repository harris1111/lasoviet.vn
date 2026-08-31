# CLAUDE.md — Repo-specific instructions

## Git workflow (chốt 2026-08-31, superseded cùng ngày bởi bản dưới đây khi nhập `AGENT_HANDOFF.md`)

Nguồn sự thật đầy đủ: `docs/15-collaboration-branch-workflow.md`. Tóm tắt bắt buộc cho mọi phiên làm việc:

- **Không bao giờ commit hoặc push trực tiếp vào `master`.** Mọi thay đổi vào
  `master` phải qua Pull Request và được founder cho phép merge; vòng review PR
  riêng chỉ chạy khi founder yêu cầu hoặc plan bắt buộc.
- `AGENTS.md` controls source precedence. Blueprint v1.1 approval is binding
  through `FD-019`; approved technical decisions remain authoritative where
  older business material conflicts.
- Vai trò: **Harris/Product** ("anh") — chốt concept, brand, sitemap, UX, acceptance criteria. **An/Development** — code, test, sửa theo review.
- Hai branch làm việc cố định:
  - `product/experience-spec-v1` — owner Harris/Product; source of truth cho docs, decisions, acceptance criteria; nhánh integration trước release.
  - `feature/site-foundation` — owner An/Development; code implementation và test.
- Flow: Product cập nhật `product/experience-spec-v1` → An merge spec đó vào `feature/site-foundation` trước khi code/trước khi mở PR → An code/test/fix → An mở PR `feature/site-foundation` → `product/experience-spec-v1` → Product review/acceptance → merge vào `product/experience-spec-v1` → Product mở PR `product/experience-spec-v1` → `master` (release PR cuối, cần CI/build/test pass).
- Ownership khi conflict: brand/copy/sitemap/user flow/acceptance criteria → Harris quyết; implementation/framework/component/test strategy → An quyết; URL/data contract/privacy/analytics/accessibility → cả hai cùng review; conflict giữa conversion và trust/safety → trust/safety thắng.
- Commit convention: `docs:`, `feat:`, `fix:`, `test:`, `refactor:` — nhỏ, một mục đích, không trộn thay đổi scope với refactor không liên quan.
- Đọc đầy đủ `docs/15-collaboration-branch-workflow.md` trước khi thao tác branch protection, definition-of-done hoặc PR checklist chi tiết.
- A separate PR review cycle is optional and runs only when the founder asks
  for it. Explicit merge authorization and plan-required Terra reviews remain
  mandatory.
