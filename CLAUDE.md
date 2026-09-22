# CLAUDE.md — Repo-specific instructions

## Git workflow (FD-097, 2026-09-22)

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
  `docs/14`, `docs/19`, `docs/20`, `docs/22` (art direction), `docs/23` (điều kiện index), `docs/24` (token màu + light theme), `docs/15`, và spec trang `docs/superpowers/specs/2026-09-13-aituvi-ui-adaptation-for-lasoviet.md` (FD-091). **Never read `docs/archive/`**
  unless the founder names an exact file there. See `AGENTS.md` §1.1.
- Vai trò: **Harris/Product** ("anh") — chốt concept, brand, sitemap, UX, acceptance criteria. **An/Development** — code, test, sửa theo review. FD-084: An và Lãm quyền ngang nhau.
- Flow (FD-097, 2026-09-22): mỗi việc một nhánh ngắn → PR thẳng vào `master` → anh hoặc An duyệt và cho phép merge. Không còn hai nhánh cố định `product/experience-spec-v1` / `feature/site-foundation`.
- Ownership khi conflict: brand/copy/sitemap/user flow/acceptance criteria → Harris quyết; implementation/framework/component/test strategy → An quyết; URL/data contract/privacy/analytics/accessibility → cả hai cùng review; conflict giữa doanh thu/conversion và trust/safety → doanh thu thắng nếu hợp pháp (FD-064: được dùng dark pattern/chiêu trò hợp pháp); các giới hạn sau vẫn luôn thắng doanh thu: pháp luật Việt Nam theo FD-089 (không giá gốc gạch ngang bịa, không khan hiếm/đếm ngược giả, không nói về chết/tuổi thọ, không bán giải hạn/hoá giải/vật phẩm, không bịa hạn mà engine không tính ra; nói điều xấu theo tử vi truyền thống và nêu hạn có thật để mời mua là được phép), quyền riêng tư (FD-053), toàn vẹn thanh toán và tự phục hồi (FD-043), bảo mật nội dung khoá (FD-059), quyền sở hữu nội dung đã mua.
- Commit convention: `docs:`, `feat:`, `fix:`, `test:`, `refactor:` — nhỏ, một mục đích, không trộn thay đổi scope với refactor không liên quan.
- A separate PR review cycle is optional and runs only when the founder asks
  for it. Explicit merge authorization and plan-required Terra reviews remain
  mandatory.
