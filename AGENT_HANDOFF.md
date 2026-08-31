# Lá Số Việt — Context bàn giao cho agent

## 1. Mục tiêu dự án

Xây dựng Lá Số Việt thành nền tảng lập và luận giải lá số dành cho người Việt, có trải nghiệm chuẩn quốc tế nhưng phù hợp hành vi địa phương. Định vị đã chốt:

> **Thư viện tri thức Việt đương đại — tĩnh, sáng rõ, có căn cứ và trả quyền lựa chọn về cho người dùng.**

Không thiết kế như “tiệm bói online”, không dùng nỗi sợ hoặc định mệnh hóa để tăng conversion.

## 2. Hierarchy quyết định

Khi có xung đột, áp dụng thứ tự:

1. Trust, safety, privacy và quyền tự quyết của người dùng.
2. Brand guideline đã duyệt.
3. Sitemap/SEO/wireframe blueprint mới nhất.
4. Acceptance criteria của task hiện tại.
5. Pattern hoặc sở thích kỹ thuật hiện có trong codebase.

Các nhãn trong guideline:

- `LOCKED`: không thay đổi nếu chưa có quyết định mới của founder.
- `STANDARD`: mặc định phải tuân thủ; ngoại lệ cần ghi lý do.
- `HYPOTHESIS`: cần test bằng research hoặc dữ liệu, không coi là sự thật.

## 3. Quyết định đã khóa

### Brand và giao diện

- Mood: tĩnh, trí tuệ, ấm, có chiều sâu, đương đại.
- Hệ hình ảnh: Paper — Ink — Cinnabar.
- Font định hướng: Source Serif 4 cho nội dung/editorial; Be Vietnam Pro cho UI và dữ liệu.
- Không dùng visual “vũ trụ tím”, neon, animation thần bí, biểu tượng mê tín rập khuôn hoặc giao diện dashboard dày đặc.
- Giá trị và kết quả sơ bộ xuất hiện trước yêu cầu tạo tài khoản.
- Mỗi luận điểm quan trọng phải có cách truy ngược “Vì sao có nhận định này?”.

### Kiến trúc sản phẩm

- Tách “thư viện công khai” có thể index khỏi “bàn đọc riêng tư” chứa dữ liệu sinh và báo cáo cá nhân.
- Dữ liệu cá nhân và trang kết quả riêng tư phải `noindex`; URL không tuần tự và không đoán được.
- Một intent tìm kiếm có một URL canonical chịu trách nhiệm.
- Không tạo content farm, thin pages hoặc hàng loạt bài AI kiểu “12 cung × 365 ngày”.
- Các bộ môn Đông và Tây được đăng ký trong IA ngay từ đầu, nhưng chỉ public/index theo mức sẵn sàng.

### Hệ bộ môn

**Đông phương:** Tử Vi, Bát Tự, Kinh Dịch.

**Tây phương:** Bản đồ sao, Horoscope/Cung hoàng đạo, Thần số học, Tarot.

**Tiện ích văn hóa Việt:** 12 con giáp, lịch âm, ngày tốt, phong thủy.

Phân biệt rõ:

- `/ban-do-sao`: natal chart cá nhân dựa trên ngày, giờ và nơi sinh.
- `/cung-hoang-dao`: evergreen hub cho 12 cung.
- `/du-bao-cung-hoang-dao`: Horoscope theo thời gian; chỉ mở khi có ephemeris, methodology và lịch biên tập thật.
- `/horoscope` nếu dùng cho campaign phải 301 về canonical tiếng Việt, không index song song.

### Route governance

Mỗi route có đúng một trạng thái:

| Trạng thái | Ý nghĩa |
|---|---|
| `reserved` | Giữ taxonomy/ownership trong config, chưa deploy public URL |
| `preview_noindex` | Chỉ QA/staging hoặc preview; không menu, không sitemap |
| `live_noindex` | Public vì cần cho flow nhưng không được index |
| `live_indexable` | Public, canonical, có trong navigation và XML sitemap |

## 4. Ưu tiên sản phẩm

Ba intent cần sở hữu trước:

1. Lập lá số Tử Vi miễn phí.
2. Luận giải lá số Tử Vi có chiều sâu.
3. Hiểu và tự đọc lá số qua thư viện kiến thức.

Đây là thứ tự đầu tư, **không phải giới hạn sitemap**. IA đầy đủ bao gồm cả hệ phương Tây ngay từ Phase 1; việc index phụ thuộc readiness gate.

## 5. Readiness gate trước khi index

Không chuyển route sang `live_indexable` nếu thiếu một trong các yếu tố áp dụng:

- Engine/rule set hoạt động và có test.
- Methodology, nguồn và giới hạn được công bố.
- Nội dung tạo giá trị độc lập, không phải trang placeholder.
- Canonical, metadata, schema, internal link và sitemap được cấu hình.
- Owner chịu trách nhiệm duy trì nội dung/dữ liệu.
- Với sản phẩm trả phí: có sample, giá, phạm vi deliverable và chính sách rõ.

## 6. Hạng mục còn mở

- Founder phê duyệt chính thức Blueprint v1.1.
- Đối chiếu route v1.1 với router/code hiện tại trong repo.
- Quyết định engine/licensing cho Western astrology và ephemeris.
- Xác nhận taxonomy cuối cho `/lap-la-so/...` so với các route calculator cấp root đang tồn tại.
- Chuyển wireframe low-fi thành component map/design tokens có thể code.
- Lập content model, schema và editorial workflow cho từng knowledge hub.
- Định nghĩa analytics events, consent và privacy retention.
- Xây acceptance criteria theo từng phase và từng route.

## 7. Quy tắc làm việc của agent tiếp theo

1. Đọc đầy đủ ba source-of-truth trước khi sửa code hoặc tài liệu.
2. Rà `AGENTS.md`, README, framework, router và conventions thật trong repo.
3. Không tự thay đổi quyết định `LOCKED`.
4. Nếu code hiện tại mâu thuẫn với blueprint, ghi rõ xung đột và đề xuất migration; không âm thầm đổi taxonomy.
5. Mọi route mới phải khai báo intent, canonical, index state, owner và readiness gate.
6. Mọi suy luận về “hành vi người Việt” phải được ghi là hypothesis cho tới khi có research/dữ liệu.
7. Khi hoàn tất, cập nhật docs và decision log cùng code để tránh lệch source of truth.

## 8. Git workflow bắt buộc

- Harris/Product làm việc trên `product/experience-spec-v1`.
- An/Development làm việc trên `feature/site-foundation`.
- Product cập nhật spec → An merge spec vào branch dev → code/test/fix → PR dev về branch product → review/acceptance → PR branch product vào `master`.
- Không push trực tiếp lên `master`.

