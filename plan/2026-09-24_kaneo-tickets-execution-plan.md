# Kế hoạch xử lý toàn bộ Ticket Kaneo (Workspace Cash Cow - Lá Số Việt)

**Ngày lập:** 2026-09-24  
**Phạm vi:** Repository `lasoviet.vn-develop`, đối chiếu trạng thái runtime production và Kaneo workspace `Cash Cow` (`Ey2EBYm4Oeq2rhZoVpGYKLLoXEeZfJ2G`).  
**Mục tiêu:** Rà soát, đối chiếu code ở `master`, phân loại và sắp xếp thứ tự thực thi từ dễ đến khó để clear dứt điểm toàn bộ các ticket còn lại.

---

## 1. Hiện trạng Codebase (`master`) & Đối chiếu Kaneo

- **Tổng số ticket trên Kaneo:** 40 ticket.
- **Trạng thái trên Kaneo:**
  - `Done`: 24 ticket.
  - `In Review`: 4 ticket (#20, #21, #22, #26).
  - `In Progress`: 2 ticket (#15, #29).
  - `To Do`: 10 ticket (#23, #24, #25, #27, #28, #37, #38, #39, #40, #41).
- **Thực tế trên `master` (`63483c9`):**
  - Cả 4 ticket trong cột `In Review` (#20 UI trang chủ, #21 Form lập lá số, #22 Trang kết quả lá số, #26 Support/Footer) **đã được implement, review và merge vào master**.
  - Production Docker (`lasoviet-mvp-web-1`) đang chạy live chính xác image SHA `63483c9419c0f66c5624be603ed0712c3c8dbcf2`.
  - Đơn khách `LSV-ee72fd8e` (ticket #29) đã được phục hồi thành công trên database production sang trạng thái `complete` (có report ID và PDF lưu trữ).
  - Founder đã ban hành quyết định mới **FD-089 đến FD-098** (ngày 22/09/2026) tái định hướng nội dung Tử Vi truyền thống trực diện, tinh gọn luật và chốt prototype revamp `prototype/revamp-2026-09/`.

---

## 2. Thứ tự ưu tiên & Lộ trình thực hiện (Từ Dễ đến Khó)

```text
[Giai đoạn 0: Nghiệm thu & Chuyển Done 4 ticket In Review]
      │
      ▼
[Cấp độ 1: Rất Dễ - Quick Wins (Defects & Config)]
  ├── Ticket #40: Fix 2 lỗi trên trang kết quả miễn phí
  └── Ticket #37: Chuyển support email sang Gmail & gắn Messenger
      │
      ▼
[Cấp độ 2: Dễ - Reusable UI Components]
  ├── Ticket #24: UI-06 Trang bản luận giải mẫu (tái dùng UI-04)
  └── Ticket #27: UI-09 Banner cross-sell trong công cụ miễn phí
      │
      ▼
[Cấp độ 3: Trung bình - Content & Content Line FD-089]
  ├── Ticket #38: Cập nhật prompt V4 & report validator theo FD-089
  ├── Ticket #28: UI-10 Thư viện kiến thức (/kien-thuc)
  └── Ticket #29: Nghiệm thu đóng ticket đơn lỗi LSV-ee72fd8e
      │
      ▼
[Cấp độ 4: Trung bình - Khó: Generator & Worker]
  └── Ticket #15: Báo cáo Tử Vi V4 (sinh từng phần, tăng chiều sâu)
      │
      ▼
[Cấp độ 5: Khó - Engine Hạn & Luồng Thương mại / Ví Lá]
  ├── Ticket #39: Engine tính hạn lưu niên, nguyệt vận, nhật vận
  ├── Ticket #23: UI-05 Trang chọn luận giải & gói Lá (/chon-luan-giai)
  ├── Ticket #25: UI-07 Trình đọc báo cáo trả phí (/bao-cao/[reportId])
  └── Ticket #41: Nghiệm thu tổng thể Revamp UI từ prototypes
```

---

## 3. Kế hoạch chi tiết từng giai đoạn

### Giai đoạn 0: Nghiệm thu & Đóng 4 Ticket `In Review`
* **Mục tiêu:** Tuân thủ `AGENTS.md` (Review Closure Gate: có deployment smoke evidence trước khi chuyển `Done`).
* **Các ticket:**
  - **#20: UI-02 Trang chủ** (PR #167 đã merge)
  - **#21: UI-03 Form/wizard lập lá số** (PR #165 đã merge)
  - **#22: UI-04 Trang kết quả lá số** (Đã merge trên master)
  - **#26: UI-08 Hỗ trợ & footer gọn** (PR #166 đã merge)
* **Hành động:**
  1. Kiểm tra smoke test trên container production `http://127.0.0.1:63423` và live domain `https://lasoviet.net`.
  2. Ghi comment evidence kết quả smoke test vào từng task trên Kaneo.
  3. Chuyển trạng thái cả 4 task sang `Done`.

---

### Cấp độ 1: Rất Dễ — Quick Wins (Khắc phục lỗi nhỏ & Cấu hình) [ĐÃ HOÀN THÀNH 100%]

#### 1. Ticket #40: Fix two defects on the live free result page [DONE]
- **Độ khó:** 1/5 (Rất dễ).
- **Trạng thái:** Đã hoàn thành, CI pass, merge PR #173, deploy live trên container và test smoke thành công. Task #40 đã chuyển `done` trên Kaneo.

#### 2. Ticket #37: Switch support email to lasoviet.net@gmail.com and wire the Messenger channel [DONE]
- **Độ khó:** 1/5 (Rất dễ).
- **Trạng thái:** Đã hoàn thành, CI pass, merge PR #174, deploy live trên container và test smoke thành công. Task #37 đã chuyển `done` trên Kaneo.

---

### Cấp độ 2: Dễ — Reusable UI Components

#### 3. Ticket #24: UI-06 Trang bản luận giải mẫu (`/bao-cao-mau/tu-vi`) [DONE]
- **Độ khó:** 2/5 (Dễ).
- **Trạng thái:** Đã hoàn thành, CI pass, merge PR #176, deploy live trên container và test smoke thành công. Task #24 đã chuyển `done` trên Kaneo.

#### 4. Ticket #27: UI-09 Công cụ miễn phí: banner cross-sell trong kết quả tiện ích [DONE]
- **Độ khó:** 2/5 (Dễ).
- **Trạng thái:** Đã hoàn thành, CI pass, merge PR #178 & #180, deploy live trên container và test smoke thành công. Task #27 đã chuyển `done` trên Kaneo.

---

### Cấp độ 3: Trung bình — Content, Prompt & Policy Update (FD-089, Claims)

#### 5. Ticket #38: Update Zi Wei V4 prompts and report validator to the FD-089 content line [DONE]
- **Độ khó:** 3/5 (Trung bình).
- **Trạng thái:** Đã hoàn thành, CI pass, merge PR #181, deploy live trên container và test smoke thành công (`scripts/verify-task38.mjs`). Task #38 đã chuyển `done` trên Kaneo.

#### 6. Ticket #43: Homepage V4: verify product claims against real features before promoting them [IN PROGRESS]
- **Độ khó:** 2.5/5 (Trung bình).
- **Phạm vi:**
  - Đối chiếu 5 tuyên bố trên Homepage V4 với tính năng thực tế trên production.
  - Căn chỉnh copy `apps/web/messages/vi/homepage-v3.json` và `en/homepage-v3.json` trung thực với thực tế triển khai.
  - Chạy xác thực `scripts/public-claim-check.mjs` và bộ test liên quan.

#### 7. Ticket #28: UI-10 Thư viện kiến thức (`/kien-thuc`)
- **Độ khó:** 3/5 (Trung bình).
- **Phạm vi code:**
  - Dựng trang Hub kiến thức theo prototype `prototype/revamp-2026-09/thu-vien.html`: breadcrumb, nhóm chủ đề (Hiểu mình, Quan hệ, Công việc, Học đọc lá số...), lưới bài viết với card ảnh 16:9.
  - Byline "Lá Số Việt biên tập", hiển thị đầy đủ thân bài MDX.
- **Kiểm thử:** Render test + responsive test 320px/390px/1440px.

#### 8. Ticket #29: Nghiệm thu đóng ticket sự cố LSV-ee72fd8e
- **Độ khó:** 3/5 (Chủ yếu là đối soát evidence & đóng ticket).
- **Phạm vi:**
  - Đối soát DB: xác nhận đơn `LSV-ee72fd8e` đã ở trạng thái `complete`.
  - Cập nhật trạng thái closure gate: phụ thuộc shared FD-082 gate 20 real sectioned runs liên tiếp thành công. Giữ `in-progress`.

---

### Cấp độ 4: Trung bình - Khó — Báo cáo Tử Vi V4 & Generator Architecture

#### 8. Ticket #15: Báo cáo Tử Vi V4 (sinh từng phần, tăng chiều sâu)
- **Độ khó:** 4/5 (Trung bình - Khó).
- **Phạm vi code:**
  - Bổ sung các quy tắc V3 bị thiếu vào prompt V4 (không hỏi ngược, không thuật quy trình, chép đúng evidenceKeys...).
  - Triển khai section-by-section generator: sinh từng cung, từng chuyên đề riêng biệt với token budget riêng để tránh bị cắt xén (đáp ứng độ dài >= 450 âm tiết/cung).
  - Tích hợp checkpoint lưu tiến độ từng phần để tự phục hồi khi worker bị ngắt quãng.
- **Kiểm thử:** Generation integration test + quality gate test.

---

### Cấp độ 5: Khó — Engine Tính Hạn & Giao diện Luồng Mua / Đọc Trả Phí

#### 9. Ticket #39: Engine: yearly, monthly and daily hạn rules
- **Độ khó:** 5/5 (Khó - Logic thuật toán học thuật).
- **Phạm vi code:**
  - Bổ sung tầng tính Lưu niên (năm), Nguyệt vận (tháng) và Nhật vận (ngày) trong `packages/engine-adapters`.
  - Cung cấp danh sách các tháng mang hạn và bằng chứng sao làm căn cứ xác thực cho validator ở ticket #38.
  - Contract bảo vệ: trang miễn phí chỉ hiển thị số lượng tháng hạn (count), chi tiết lời khuyên giữ ở server cho tới khi mở khóa (FD-059).
- **Kiểm thử:** Fixture test kiểm chứng tính toán với các lá số mẫu chuẩn.

#### 9. Ticket #39: Engine: yearly, monthly and daily hạn rules for "Năm nay" and "Hôm nay của bạn" [DONE]
- **Độ khó:** 4.5/5 (Thuật toán Thiên văn & Tử Vi + Bảo mật hạn).
- **Trạng thái:** Đã hoàn thành, CI pass, merge PR #190 vào master, deploy live SHA `c934b973ee57a10e95ce027e11bd59544f36c942`, chạy smoke test `scripts/verify-task39.mjs` thành công trên cả container local và domain canonical `https://lasoviet.net`. Task #39 đã chuyển `done` trên Kaneo.

#### 10. Ticket #23: UI-05 Trang chọn luận giải & gói Lá (`/la-so/[chartId]/chon-luan-giai`) [DONE]
- **Độ khó:** 5/5 (Khó - Tích hợp thương mại).
- **Trạng thái:** Đã hoàn thành, CI pass, merge PR #185 & PR #186, deploy live trên container và test smoke thành công (`scripts/verify-task23-46.mjs`). Task #23 đã chuyển `done` trên Kaneo.

#### 13. Ticket #46: Nạp Lá + Hội viên: build the top-up page and membership [DONE]
- **Độ khó:** 4.5/5 (Kiến trúc + UI).
- **Trạng thái:** Đã hoàn thành spec kiến trúc (`docs/superpowers/specs/2026-09-25-membership-architecture-design.md`), UI preview tab Hội viên, trang `/nap-la`, merge PR #185 & PR #186, deploy live trên container và test smoke thành công (`scripts/verify-task23-46.mjs`). Task #46 đã chuyển `done` trên Kaneo.

#### 11. Ticket #25: UI-07 Trình đọc báo cáo trả phí (`/bao-cao/[reportId]`) [DONE]
- **Độ khó:** 5/5 (Khó - Quản lý trạng thái đọc & Upsell).
- **Trạng thái:** Đã hoàn thành, CI pass, merge PR #188, deploy live SHA `0e0336d3f2b7393cdf805fbb28bee335fcbef474`, smoke test `scripts/verify-task25.mjs` thành công. Task #25 đã chuyển `done` trên Kaneo.

#### 12. Ticket #41: Build the revamp UI in apps/web from the approved prototypes
- **Độ khó:** Meta-Ticket / Epic.
- **Phạm vi:**
  - Là ticket tổng hợp giám sát toàn bộ quá trình đưa các prototype tĩnh trong `prototype/revamp-2026-09/` thành trang chạy thật trên `apps/web`.
  - Đóng ticket này sau khi hoàn thành toàn bộ các trang: Trang chủ (#20), Wizard (#21), Trang kết quả (#22), Chọn gói (#23), Báo cáo mẫu (#24), Đọc báo cáo (#25), và Hub công cụ miễn phí (#27, #41-tools).

---

## 4. Bảng phân công & Trình tự thực thi khuyến nghị

| Bước | Mã Ticket | Tiêu đề | Mức độ | Nhánh dự kiến |
|:---:|:---:|:---|:---:|:---|
| **0** | #20, #21, #22, #26 | Smoke verify & chuyển `Done` 4 ticket In Review | Review Gate | master (direct verification) |
| **1** | #40 | Fix 2 defects on live free result page (date format & Đại Hao) | Cực dễ | `feature/lsv-40-result-page-defects` |
| **2** | #37 | Switch support email to Gmail & wire Messenger | Cực dễ | `feature/lsv-37-support-email-messenger` |
| **3** | #24 | UI-06 Trang bản luận giải mẫu (/bao-cao-mau/tu-vi) | Dễ | `feature/lsv-24-sample-report-page` |
| **4** | #27 | UI-09 Banner cross-sell trong tiện ích miễn phí | Dễ | `feature/lsv-27-free-tools-crosssell` |
| **5** | #38 | Update V4 prompts & validator to FD-089 content line | Trung bình | `feature/lsv-38-fd089-prompts-validator` |
| **6** | #28 | UI-10 Thư viện kiến thức (/kien-thuc) | Trung bình | `feature/lsv-28-knowledge-hub-ui` |
| **7** | #29 | Verify DB & close ticket sự cố LSV-ee72fd8e | Operational | operational / close |
| **8** | #15 | Báo cáo Tử Vi V4 sinh từng phần | Trung bình - Khó | `feature/lsv-15-ziwei-v4-sectioned` |
| **9** | #39 | Engine tính hạn năm, tháng, ngày | Khó | `feature/lsv-39-engine-han-rules` |
| **10**| #23 | UI-05 Trang chọn luận giải & gói Lá | Khó | `feature/lsv-23-pricing-tabs-ui` |
| **11**| #25 | UI-07 Trình đọc báo cáo trả phí | Khó | `feature/lsv-25-paid-report-reader-ui` |
| **12**| #41 | Nghiệm thu đóng Epic Revamp UI | Meta-Epic | epic review & close |
