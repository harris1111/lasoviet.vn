# Handoff prompt: continue the UX funnel overhaul in a new session

Paste everything inside the fence as the first message of a new Claude Code session opened on this worktree
(`/Users/admin/_Projects/lasoviet.vn/.claude/worktrees/ui-buttons-logic-errors-9b16bb`). Written 2026-10-03.

```text
Bạn đang tiếp tục một việc dở dang. Đọc kỹ rồi làm theo thứ tự. Nói chuyện với tôi bằng tiếng Việt đời thường, không pha thuật ngữ; chi tiết kỹ thuật để trong commit/PR/ticket.

## 0. Bối cảnh
Dự án Lá Số Việt (pnpm monorepo, Next.js 16 ở apps/web, API ở apps/api). Worktree: /Users/admin/_Projects/lasoviet.vn/.claude/worktrees/ui-buttons-logic-errors-9b16bb, nhánh claude/ui-buttons-logic-errors-9b16bb. Đọc CLAUDE.md của repo trước (đừng đọc docs/_archive và prototype/_archive).
Việc: sửa toàn diện luồng UX từ form nhập ngày sinh ở trang chủ → lá số miễn phí (đọc trước, che mờ đúng chỗ tò mò) → mở khoá bằng Lá → nạp Lá/thanh toán → đọc luận giải; tối ưu doanh thu; ưu tiên điện thoại, desktop cùng logic.
Kế hoạch gốc (9 giai đoạn, đã được tôi đồng ý): docs/superpowers/plans/2026-10-03-ux-funnel-overhaul/plan.md và phase-01..09-*.md. Đọc plan.md và phase đang làm trước khi viết code.
Quyết định ràng buộc: docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md (FD-064/065/069/105/108/109/109a...). Giá nội dung chỉ bằng Lá (FD-065), trang chủ không có giá (FD-069), thân trang lá số miễn phí không có giá (FD-109a).

## 1. Đã xong (đừng làm lại)
- Giai đoạn 1 (sửa lỗi luồng tiền) và giai đoạn 2 (đo từng bước): code xong, nằm trong PR https://github.com/harris1111/lasoviet.vn/pull/270 (vào master), CI "verify" đã xanh, chưa ai duyệt/merge. Cần An hoặc anh Lãm duyệt mới được merge. Không tự merge.
- Giai đoạn 3: mới có BẢN MẪU HTML, chưa có code thật: prototype/revamp-2026-09/lap-la-so-mot-buoc.html (2 commit 7858739d và e5c6180b, CHƯA đẩy lên remote). Đã ghi trong README prototype và phase-03.
Việc còn mở của giai đoạn 1-2 (cần người có môi trường thật): thử hộp mở khoá + tab Căn cứ trên bản thử nghiệm với lá số thật; điền số baseline trong docs/runbooks/funnel-dashboard.md (cần đọc database thật); An tìm mã WALLET_ trong nhật ký API ngày 03/10 để xác nhận nguyên nhân lỗi "Có lỗi xảy ra".

## 2. Việc đầu tiên trong session này: revise bản mẫu giai đoạn 3 bằng 2 skill
Bản mẫu đã được áp dụng sơ bộ ui-ux-pro-max + design-taste-frontend trong session trước (đọc thẳng SKILL.md vì công cụ Skill khi đó trả nội dung trống). Giờ hãy gọi lại bằng công cụ Skill: /ui-ux-pro-max và /design-taste-frontend. Nếu Skill vẫn trả về chỉ dòng "Launching skill" mà không có nội dung, đọc thẳng ~/.agents/skills/ui-ux-pro-max/SKILL.md và ~/.agents/skills/design-taste-frontend/SKILL.md (xem mục 6 về lỗi liên kết skill).
Xem bản mẫu: chạy server tĩnh rồi mở trong trình duyệt tích hợp:
  cd prototype && python3 -m http.server 8765   (mở http://localhost:8765/revamp-2026-09/lap-la-so-mot-buoc.html; có thanh BẢN MẪU trên cùng để chuyển trạng thái: Form / Lỗi nhập / Xem cho người khác / Đang lập)
Kiểm tra ở 390x844 và 1440x900. Giữ thương hiệu: nền sơn mài tối + vàng, chữ tiêu đề có chân của thương hiệu (docs/22-art-direction.md, docs/24-light-theme-color-spec.md), không dấu gạch dài trong chữ hiển thị.
Sau khi revise: cho tôi xem và chốt 3 điểm còn mở (đã hỏi tôi, chưa trả lời):
 (a) ô đồng ý dữ liệu là ô tick tay không tick sẵn (đề xuất giữ), 
 (b) thứ tự ô: ngày sinh, giờ sinh, giới tính, bận tâm (đã đổi so với wizard cũ để ô ngày sinh nằm trong màn hình đầu),
 (c) tên gọi mặc định "bạn" và nơi sinh mặc định Việt Nam (giờ Việt Nam).
Đừng viết code thật cho giai đoạn 3 trước khi tôi chốt bản mẫu.

## 3. Sau đó: thực thi các giai đoạn còn lại (theo thứ tự trong plan.md)
- GĐ3 (code thật) → GĐ4 (free result: tổng quan dài ~1.000 chữ + đoạn "Năm 2026 và đại vận" cắt giữa câu có che mờ + nút mở tại chỗ) → GĐ5 (nút "Mở – N Lá" ngay trong tấm xem trước của cung/chủ đề, trang chọn gói thành bậc thang giá, đổi tên "Toàn diện" thành "Tử Vi trọn đời", API báo giá) → GĐ6 (thiếu Lá thì nạp ngay trong tấm mở khoá, QR trong tấm, nạp xong tự mở) → GĐ7 (phòng chờ + gợi ý nâng cấp trong bài đọc) → GĐ8 (nhắc khách bỏ dở) → GĐ9 (kiểm thử toàn luồng + triển khai từng đợt).
- GĐ4/5/6/7 có sản phẩm phụ thuộc catalog: Tình duyên/Công việc/Vận hạn 2026/Combo/Hội viên đang availability "reserved" trong packages/contracts/src/la-catalog.ts, nên giao diện hiện "Sắp mở"; không được bán thứ chưa bật. Cung lẻ 120 Lá, Bản mệnh 240 Lá, Trọn đời 960 Lá đang bật.
- Tôi đã duyệt 2 quyết định thiết kế (ghi trong plan.md): (1) nút mở ngay trong tấm xem trước, thân trang miễn phí vẫn không có giá; (2) bỏ wizard 3 bước sau form trang chủ. Hãy ghi chúng vào tracker thành FD mới và xoá chữ cũ mâu thuẫn trong docs/superpowers/specs/2026-09-28-free-result-page-design.md khi làm GĐ5 (quy tắc: viết đè chữ cũ, tracker giữ lịch sử theo trạng thái).

## 4. Quy tắc làm việc (bắt buộc)
- Không push/commit thẳng vào master. Mỗi giai đoạn một nhánh ngắn → PR vào master → test xanh → An hoặc Lãm duyệt. Commit tiếng Anh kiểu conventional (feat:, fix:, docs:, test:). Cuối commit: "Co-Authored-By: Claude <model> <noreply@anthropic.com>" theo hướng dẫn của phiên.
- Sonnet viết code, Opus duyệt (không viết production code bằng Opus; giao cho Sonnet hoặc nhờ tôi đổi model).
- Trước khi bắt đầu phần giao diện thật: báo tôi trước. Mọi phần giao diện phải nói rõ ưu tiên điện thoại.
- Prototype trước, code sau (FD-098): giao diện mới phải có bản mẫu trong prototype/revamp-2026-09/ và tôi xem một lần.
- Mỗi kế hoạch chỉ một lần tôi ký duyệt, không hỏi lặp từng task. Chỉ hỏi khi thật sự cần tôi quyết.
- Dùng Kaneo (workspace Cash Cow Ey2EBYm4Oeq2rhZoVpGYKLLoXEeZfJ2G, project "La so viet" rcaikczb8v3h693a37g0zlzl) để tạo task cho từng giai đoạn; chỉ chuyển Done khi có bằng chứng đã triển khai/smoke test, hoặc khi phần của tôi và bạn đã xong và chỉ còn việc merge/deploy của An (ghi chú cho An).
- Ảnh dùng trong trang phải đổi tên chữ thường gạch ngang chuẩn SEO trước khi dùng.
- Sau khi mở PR: dùng công cụ ccd_pr (get_status, bind_pr nếu chưa gắn), đọc CI và đề nghị Auto-fix; không tự poll CI, không bật auto-merge nếu tôi không yêu cầu.
- Hành động ra ngoài (push, mở PR, gửi tin, cài đặt) hỏi tôi trước, trừ khi tôi đã bảo làm.

## 5. Mẹo môi trường (đã tốn thời gian ở session trước)
- Máy không có corepack. Dùng pnpm trực tiếp. Lần đầu trong worktree: pnpm install --frozen-lockfile, rồi build các package: pnpm --filter "{packages/**}" -r --if-present run build. Sau khi sửa packages/contracts phải build lại contracts trước khi typecheck web.
- Chạy test: npx vitest run <đường dẫn> ở thư mục gốc repo (không chạy từ apps/web). Chạy cả bộ: npx vitest run (≈2 phút). Có test chập chờn do quá tải (packages/database *.integration, knowledge-v4) – chạy riêng thì xanh. tests/deployment/cd-scripts.test.ts luôn trượt trên macOS (mã 127, thiếu lệnh GNU) – không liên quan.
- Kiểm tra trước khi đẩy: pnpm i18n:check, pnpm lint (0 lỗi; 4 cảnh báo cũ), pnpm -r --if-present run typecheck, và build production nếu đụng ranh giới server/client.
- Test tests/web/no-public-api-reference.test.ts cần bản build production (.next/static) – chạy: cd apps/web rồi next build với env tạm (chuỗi ngẫu nhiên tự sinh, KHÔNG dùng khoá thật): NODE_ENV=production DATABASE_URL=postgresql://qa:qa@127.0.0.1:5999/qa REDIS_URL=redis://127.0.0.1:6999 INTERNAL_ACTOR_SECRET=$(openssl rand -hex 24) BETTER_AUTH_SECRET=$(openssl rand -hex 24) BETTER_AUTH_URL=http://127.0.0.1:3000 PRIVATE_API_URL=http://127.0.0.1:3001 SEPAY_ENV=disabled GARAGE_PDF_ENABLED=false pnpm exec next build. Chạy thật: thay "build" bằng "start -p 3000" (hoặc "dev"); dùng http://localhost:3000 (không dùng 127.0.0.1 với dev, bị chặn HMR). Trang /nap-la chạy được không cần DB thật (như khách).
- Playwright đã có chromium: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/topup-selection.spec.ts (8 test xanh ở GĐ1).
- Bài học kiến trúc: hàm server action phải nằm trong file có "use server" riêng nếu component client import nó (create-topup-order-action.ts). Module có "server-only" không được import từ client (checkout-offer.ts, purchase-offer-presentation.ts chỉ import type). Phần tương tác của trang chọn gói là component client paid-topic-selector-client.tsx; paid-topic-selector.tsx là lớp server mỏng.
- Registry sự kiện đo: config/analytics-events.json + packages/contracts/src/analytics-event-v1.ts + 2 test (packages/config/src/analytics-events.test.ts, tests/analytics/event-contract.test.ts) phải khớp thứ tự. Truy vấn funnel: docs/runbooks/funnel-dashboard.md.
- Docker có sẵn, test tích hợp backend dùng testcontainers (packages/backend/src/commerce/wallet-unlock.repository.integration.test.ts, 30 test).

## 6. Lỗi liên kết skill (nếu còn)
~/.claude/skills là liên kết sang /Users/admin/dev/lieulam-agent-skills/skills, nên hai liên kết tương đối ui-ux-pro-max và design-taste-frontend trong đó bị hỏng; nội dung thật (ui-ux-pro-max v2.13.0 đã nâng cấp) nằm ở ~/.agents/skills/. Nếu tôi chưa chạy lệnh sửa, nhắc tôi chạy:
  cd /Users/admin/dev/lieulam-agent-skills/skills && for d in ui-ux-pro-max design-taste-frontend; do [ -L "$d" ] && rm "$d" && cp -R ~/.agents/skills/$d "$d"; done
Đừng tự sửa trong repo đó (hệ thống đã chặn một lần). Bản cũ đã sao lưu ở ~/.claude/skill-install-backups/20261003-152010-import-uiux-taste.

## 7. Bắt đầu
1) Chạy git status, git log -5, và mcp ccd_pr get_status để xác nhận trạng thái. 2) Hỏi tôi đúng một câu nếu cần: đẩy 2 commit bản mẫu lên PR #270 hay mở PR riêng cho bản mẫu. 3) Làm mục 2.
```

## Giữ bản mẫu local

- Bản mẫu nằm trong repo: `prototype/revamp-2026-09/lap-la-so-mot-buoc.html` (2 commit local, chưa push).
- Server xem thử chạy bằng `cd prototype && python3 -m http.server 8765`. Server hiện tại là tiến trình nền của session này, có thể tắt khi đóng session, cứ chạy lại lệnh trên.
