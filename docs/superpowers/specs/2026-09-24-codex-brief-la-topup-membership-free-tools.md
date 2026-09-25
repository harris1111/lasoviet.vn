# Brief cho Codex: Nạp Lá, Hội viên và công cụ miễn phí

> Ngày: 2026-09-24. Người giao việc: Lãm (founder). Repo: `harris1111/lasoviet.vn`, nhánh nền `master`.
> Việc này giao cho agent có quyền GitHub. **Làm tới đâu thì làm, theo đúng thứ tự ưu tiên ở mục 3.** Mỗi mục xong là một PR riêng, không gộp.

## 1. Vì sao có brief này

Homepage V3 đã lên `master` (PR #175). Footer mới cố tình **không** link tới các trang dưới đây vì chưa có trang thật:

- Nạp Lá (mua gói Lá)
- Hội viên
- Công cụ miễn phí ngoài 7 bản xem thử hiện có: Tử vi hôm nay, Thần số học (công cụ), Bói tình yêu

Khi mỗi trang xong và deploy, **thêm link vào footer** (`apps/web/src/components/site-footer.tsx`, hàm `footerGroups`, hai ngôn ngữ) trong cùng PR.

## 2. Luật bắt buộc

Đọc trước khi code. Bản đầy đủ nằm trong `CLAUDE.md` ở gốc repo.

- **Không push hay commit thẳng vào `master`.** Mỗi việc một nhánh ngắn (`feat/...`), mở PR vào `master`, test qua rồi chờ An hoặc Lãm duyệt merge. Commit tiếng Anh theo kiểu `feat:`, `fix:`, `docs:`, `test:`.
- **Nguồn quyết định duy nhất:** `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md`. Các FD liên quan: FD-064, 065, 066, 069, 089, 090, 093, 094, 099, 100, 101, 102.
- **Không đọc** `docs/_archive/` và `prototype/_archive/`.
- **Nguồn giao diện đã duyệt (FD-098):** thư mục `prototype/revamp-2026-09/`. Riêng `trang-chu.html` đã bị Homepage V3 thay (FD-100), không dùng.
- **Hình ảnh:** mọi ảnh mới phải đặt tên chữ thường, gạch nối, có nghĩa SEO (ví dụ `lich-am-thang-9-2026.webp`) trước khi dùng.
- **Lệnh kiểm phải chạy trước khi mở PR:** `pnpm i18n:check && pnpm lint && pnpm typecheck`, sau đó `pnpm test` (một số test cần cơ sở dữ liệu, xem mục 6), và `node scripts/public-claim-check.mjs`. i18n VI và EN phải khớp khóa (mỗi file trong `apps/web/messages/vi/` có bản `en/`).
- **Nguồn danh sách route:** chỉ `config/route-registry.yml`. Thêm trang mới thì thêm route vào đây và tạo nội dung công khai tương ứng, rồi chạy `node scripts/check-public-content.mjs`.
- **Giọng văn:** `docs/13-brand-experience-guideline.md`. Ấm, gần đời sống người Việt, không viết như tài liệu hệ thống. Ưu tiên doanh thu khi hợp pháp (FD-064).
- **Giao diện sáng/tối (FD-102):** header và footer đã theo theme. Trang mới nếu chưa làm bản sáng thì **không** gắn thuộc tính `data-light-ready` (trang sẽ luôn tối, nút sáng/tối tự ẩn). Muốn có bản sáng, làm theo `docs/24-light-theme-color-spec.md` và mẫu token trong `apps/web/src/styles/homepage-v3.css`.

### Những điều tuyệt đối cấm (giới hạn pháp lý, FD-089)

- Không phán về cái chết, tuổi thọ, "khắc chết". Không chẩn đoán bệnh cụ thể.
- Không bán bùa chú, đồ phong thủy, cúng giải hạn.
- Không chế sự kiện hay ngày tháng mà engine không tính ra.
- Không tạo số đề, số lô, không giá gạch chéo, không đếm ngược giả, không đánh giá hay chuyên gia giả.
- Không hiện điểm số may rủi tổng hợp (FD-063) trong công cụ bói tình yêu.
- **Trang chủ không hiện giá** (FD-069). Giá VND chỉ xuất hiện ở gói nạp Lá, đơn thanh toán và hóa đơn. Giá nội dung, mở khóa, nâng cấp chỉ hiện bằng **Lá**, không kèm quy đổi tiền (FD-065).

## 3. Thứ tự ưu tiên

| Ưu tiên | Việc | Vì sao trước |
|---|---|---|
| 1 | Nạp Lá (trang chọn luận giải, tab Nạp Lá) | Backend ví và đơn nạp đã có, ra doanh thu trực tiếp |
| 2 | Hội viên | Cần Nạp Lá xong; cần quyết định về "Hôm nay của bạn" |
| 3 | Lịch âm và ngày tốt (nâng bản xem thử thành công cụ chạy thật) | Tính bằng thư viện lịch, không cần engine |
| 4 | Thần số học (công cụ) | Công thức thuần, dữ liệu gốc đã có trong prototype |
| 5 | Bói tình yêu (rule-based, không điểm số) | Cần bảng quan hệ con giáp và nạp âm |
| 6 | Tử vi hôm nay | Phụ thuộc engine hạn ngày (ticket #39). **Chỉ làm khung nếu engine chưa xong** |

Không làm mục 6 thành trang "thật" nếu chưa có dữ liệu hạn ngày do engine tính. Có thể dựng khung và để `noindex`, hiện nhãn "Sắp có".

## 4. Chi tiết từng trang

### 4.1 Nạp Lá

- **Prototype:** `prototype/revamp-2026-09/chon-luan-giai.html`, tab "Nạp Lá". Thư viện tài khoản `thu-vien.html` có khối số dư và lịch sử Lá.
- **Ticket Kaneo:** #23 (UI-05), xem `plan/2026-09-24_kaneo-tickets-execution-plan.md`. Kaneo: workspace `Cash Cow`, project `La so viet`. **Không chuyển ticket sang `Done` khi chưa có bằng chứng deploy và smoke test.**
- **Route:** `/la-so/{opaque_id}/chon-luan-giai` đã đăng ký trong `config/route-registry.yml`. Nếu cần trang nạp độc lập (không gắn lá số), đề xuất route mới và ghi vào PR, đừng tự chọn tên khi chưa hỏi.
- **Gói (FD-066), khớp CHECK trong `packages/database/src/schema/commerce.ts`:**

| Gói | SKU | Giá | Lá nhận |
|---|---|---|---|
| Nhập Môn | `LA-ENTRY-300` | 29.000 đ | 300 |
| Khởi Đọc | `LA-START-1100` | 99.000 đ | 1.100 (1.000 + 100 tặng) |
| Khám Phá | `LA-DISCOVER-3000` | 249.000 đ | 3.000 (2.500 + 500 tặng) |
| Tàng Thư | `LA-LIBRARY-8000` | 599.000 đ | 8.000 (6.000 + 2.000 tặng) |

- **Giá nội dung:** Bản mệnh 240 Lá, Toàn diện 960 Lá, nâng cấp Bản mệnh → Toàn diện trong cửa sổ FD-041 là 720 Lá. Chỉ hiện bằng Lá.
- **Hành vi:** khi số dư không đủ, nút chính chọn sẵn gói nhỏ nhất bù đủ phần thiếu (FD-066); không còn "nạp đúng số thiếu". Thanh trả tiền dính đáy trên mobile.
- **Thanh toán:** dùng luồng VietQR/SePay có sẵn: `apps/web/src/features/commerce/` (`checkout-purchase-form`, `vietqr-checkout`, `payment-self-claim`) và trang `apps/web/src/app/[locale]/thanh-toan/[orderId]`. **Không xây luồng thanh toán mới.** Đơn nạp có loại `wallet_topup` trong bảng `commerce_orders`; ví ở `packages/backend/src/wallet/`.
- **Không có vận hành thủ công:** không ai đối soát tay. Mọi đường tiền phải tự phục hồi hoặc tự dừng (ghi nhớ của founder). Nếu phát hiện lỗ hổng, dừng lại và báo, không vá bằng thao tác tay.
- **Kiểm thử:** E2E chọn gói, chuyển tab, mobile 390px; test đơn vị cho việc chọn gói nhỏ nhất đủ bù.

### 4.2 Hội viên (FD-093)

- **Prototype:** khối `#hoi-vien` trong `cong-cu-mien-phi.html`, tab "Hội viên" trong `chon-luan-giai.html`, khối hội viên trong `thu-vien.html`.
- **Gói:** Hội viên tháng **1.500 Lá / 30 ngày**, Hội viên năm **8.000 Lá / 365 ngày**. Mua bằng số dư Lá, **không tự gia hạn**. Giá hiện bằng Lá.
- **Quyền lợi (giả thuyết khởi điểm, chưa chốt):** "Hôm nay của bạn" (đọc theo ngày trên lá số), luận giải tháng (nguyệt vận), bản trả phí của mọi công cụ, giảm 20% khi mở khóa báo cáo. **Không** gồm báo cáo Toàn diện (vẫn mua riêng, dùng trọn đời).
- **Phạm vi làm được ngay:** trang giới thiệu Hội viên, luồng mua bằng Lá, trạng thái hội viên còn hạn trong tài khoản. **Chưa làm** "Hôm nay của bạn" và nguyệt vận nếu engine hạn chưa xong (ticket #39). Trong trường hợp đó ghi rõ trên trang quyền lợi nào "sắp có". Không hứa tính năng chưa có.
- **Cần quyết định của founder trước khi code phần backend:** chưa có bảng hội viên trong schema. Hãy đề xuất thiết kế (bảng, quy tắc hết hạn, giảm giá) trong mô tả PR và **dừng chờ duyệt** trước khi viết migration.

### 4.3 Lịch âm và Ngày tốt

- **Prototype:** `cong-cu-lich-am.html`, dữ liệu mẫu `lich-2026-09.json` (sinh bằng `lunar-typescript`).
- **Đã có:** bản xem thử `lunar-calendar-preview.tsx`, `good-days-preview.tsx`; route `/lich-am`, `/ngay-tot` (trạng thái `preview`, noindex).
- **Làm:** đổi từ xem thử sang công cụ chạy thật: lịch tháng, ngày âm, ngày hoàng đạo, giờ hoàng đạo, chi tiết ngày. "Ngày tốt" chọn loại việc + khoảng ngày, trả danh sách ngày kèm lý do, **không** chấm điểm tổng hợp.
- **Chỉ đưa lên `live_indexable` khi trả kết quả tính thật** (FD-090, `docs/23-index-eligibility-gate.md` §0). Trước đó giữ `noindex`.
- **Cầu nối bắt buộc:** mỗi công cụ có một khối "Còn tùy lá số của bạn" dẫn tới lập lá số Tử Vi (FD-090).

### 4.4 Thần số học (công cụ)

- **Prototype:** `cong-cu-than-so-hoc.html`. Đường đời theo Pythagoras (giữ số chủ đạo 11, 22, 33), số sứ mệnh, linh hồn, nhân cách, ma trận 3x3 ngày sinh.
- **Lưu ý tên:** `/than-so-hoc` hiện là **trang bộ môn** (landing, đã live). Công cụ nên nằm ở route riêng (ví dụ `/cong-cu-mien-phi/than-so-hoc`, hỏi lại trước khi chốt tên) và trang bộ môn trỏ sang.
- **Chỉ công thức thuần**, không đoán, không "chấm điểm". Kết quả và giải nghĩa viết theo giọng thương hiệu.

### 4.5 Bói tình yêu

- **Prototype:** `cong-cu-boi-tinh-yeu.html`. Dựa trên quan hệ con giáp (tam hợp, lục hợp, xung, hại) và quan hệ nạp âm ngũ hành. **Không có điểm phần trăm** (FD-063).
- Bảng quan hệ là dữ liệu tĩnh, lưu trong `apps/web/src/features/free-tools/`. Ghi rõ nguồn và cách tính trong trang.
- Cầu nối bắt buộc tới lập lá số như mục 4.3.

### 4.6 Tử vi hôm nay

- **Prototype:** `cong-cu-tu-vi-hom-nay.html` (mẫu một trang công cụ: nhập → kết quả → khối cầu nối son "Còn tùy lá số của bạn" → nhắc hằng ngày). FD-094: **không** đưa vào menu chính; nằm trong hub `/cong-cu-mien-phi`.
- Nội dung hằng ngày phải do engine tính (ticket #39). Nếu chưa có engine: dựng khung, dữ liệu mẫu nhãn rõ "mẫu", để `noindex`, không link ra footer.

## 5. Việc dùng chung

- **Hub `/cong-cu-mien-phi`:** `apps/web/src/features/free-tools/free-tools-hub.tsx`, dữ liệu ở `free-tools-page-provider.ts` (VI và EN). Khi một công cụ chạy thật, đổi `isFunctional` và `status`, cập nhật icon từ bộ `prototype/revamp-2026-09/icons.svg` (FD-094), và cập nhật số lượng công cụ trong tiêu đề.
- **Sau mỗi PR merge và deploy:** thêm link vào footer (`footerGroups`), thêm ca kiểm tra trong `tests/e2e/public-surface.spec.ts` (test "footer links to ..."), và ghi vào tracker nếu có quyết định mới.
- **Không thêm giá vào trang chủ.** Không đổi menu chính (`SiteHeader`): menu đã khớp bản chạy thật và có test `tests/web/homepage-v3-nav-parity.spec.ts`.

## 6. Cách chạy và kiểm

- Cài đặt và kiểm nhanh: `pnpm i18n:check && pnpm lint && pnpm typecheck`.
- Test: `pnpm test`. Các test cần cơ sở dữ liệu thật (`apps/api`, `packages/backend`, `tests/*integration*`) sẽ fail khi không có DB, và test `tests/deployment` fail sẵn trên `master` do môi trường; đừng coi đó là lỗi của mình, nhưng ghi rõ trong PR test nào không chạy được.
- Giao diện: `cd apps/web && pnpm exec next dev -p 3100`, rồi `PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm exec playwright test tests/e2e/public-surface.spec.ts`. Kiểm ở 390, 768, 1440 px.
- Build: `cd apps/web && pnpm build` (cần `pnpm --filter "{packages/**}" -r --if-present run build` trước để sinh `@lasoviet/config`).
- **Mỗi PR ghi rõ:** đã làm gì, chưa làm gì, trang nào còn `noindex` và vì sao, cách thử tay. Không tuyên bố hoàn thành khi chưa chạy luồng thật.

## 7. Báo cáo lại cho Lãm

Lãm không đọc code. Cuối mỗi PR, viết một đoạn **tiếng Việt đời thường** (không lẫn thuật ngữ): trang nào đã xem được, bấm vào đâu để thử, cái gì còn thiếu, cần Lãm quyết điều gì. Chi tiết kỹ thuật để trong phần mô tả PR cho An.
