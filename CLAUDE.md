# CLAUDE.md — Repo-specific instructions

## Git workflow (chốt 2026-08-31, superseded cùng ngày bởi bản dưới đây)

Nguồn sự thật đầy đủ: `docs/15-collaboration-branch-workflow.md`. Tóm tắt bắt buộc cho mọi phiên làm việc:

- **Không bao giờ commit hoặc push trực tiếp vào `master`.** Mọi thay đổi vào
  `master` phải qua Pull Request và được founder cho phép merge; vòng review PR
  riêng chỉ chạy khi founder yêu cầu hoặc plan bắt buộc.
- `AGENTS.md` controls source precedence. Blueprint v1.1 approval is binding
  through `FD-019`; approved technical decisions remain authoritative where
  older business material conflicts.
- **Business/concept reading scope (chốt 2026-09-20).** For any business,
  concept, brand, or business-model question read only: the founder-decision
  tracker (`docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`,
  the only binding register), `MASTER_CONCEPT.md`, `docs/11`, `docs/13`,
  `docs/14`, `docs/19`, `docs/20`, `docs/22` (art direction), `docs/23` (điều kiện index), `docs/24` (token màu + light theme), `docs/15`. **Never read `docs/archive/`**
  unless the founder names an exact file there. See `AGENTS.md` §1.1.
- Vai trò: **Harris/Product** ("anh") — chốt concept, brand, sitemap, UX, acceptance criteria. **An/Development** — code, test, sửa theo review.
- Hai branch làm việc cố định:
  - `product/experience-spec-v1` — owner Harris/Product; source of truth cho docs, decisions, acceptance criteria; nhánh integration trước release.
  - `feature/site-foundation` — owner An/Development; code implementation và test.
- Flow: Product cập nhật `product/experience-spec-v1` → An merge spec đó vào `feature/site-foundation` trước khi code/trước khi mở PR → An code/test/fix → An mở PR `feature/site-foundation` → `product/experience-spec-v1` → Product review/acceptance → merge vào `product/experience-spec-v1` → Product mở PR `product/experience-spec-v1` → `master` (release PR cuối, cần CI/build/test pass).
- Ownership khi conflict: brand/copy/sitemap/user flow/acceptance criteria → Harris quyết; implementation/framework/component/test strategy → An quyết; URL/data contract/privacy/analytics/accessibility → cả hai cùng review; conflict giữa doanh thu/conversion và trust/safety → doanh thu thắng nếu hợp pháp (FD-064: được dùng dark pattern/chiêu trò hợp pháp); các giới hạn sau vẫn luôn thắng doanh thu: pháp luật Việt Nam (không giá gốc gạch ngang bịa, không khan hiếm/đếm ngược giả, không phán tai hoạ để ép mua), quyền riêng tư (FD-053), toàn vẹn thanh toán và tự phục hồi (FD-043), bảo mật nội dung khoá (FD-059), quyền sở hữu nội dung đã mua.
- Commit convention: `docs:`, `feat:`, `fix:`, `test:`, `refactor:` — nhỏ, một mục đích, không trộn thay đổi scope với refactor không liên quan.
- Đọc đầy đủ `docs/15-collaboration-branch-workflow.md` trước khi thao tác branch protection, definition-of-done hoặc PR checklist chi tiết.
- A separate PR review cycle is optional and runs only when the founder asks
  for it. Explicit merge authorization and plan-required Terra reviews remain
  mandatory.
