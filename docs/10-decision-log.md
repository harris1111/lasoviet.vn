# 10 — Decision Log

| ID | Quyết định | Trạng thái | Căn cứ | Điều kiện xem xét lại |
|---|---|---|---|---|
| D-001 | Chọn `lasoviet.vn` làm domain/brand chính | Chốt | Khớp `lá số tử vi` volume lớn; đủ rộng cho Đông–Tây; uy tín hơn `coiboi` | Chỉ đổi nếu có vấn đề pháp lý/brand nghiêm trọng |
| D-002 | Không dùng `coiboi...` làm master brand | Chốt | “Coi bói” hẹp, colloquial/miền Nam hơn; dễ làm giảm perceived authority và mở rộng sản phẩm | Có thể dùng làm campaign/redirect nếu sở hữu, không canonical |
| D-003 | Không dùng `huyenluan` làm domain đầu tiên | Chốt | Distinctive nhưng abstract, không có demand rõ; MVP cần category clarity | Có thể mua phòng thủ/brand sau khi economics được chứng minh |
| D-004 | AI không ở tên miền/hero | Chốt | AI keyword nhỏ hơn method keywords; người dùng coi trọng trust/phương pháp | Xem lại nếu branded AI demand tăng rõ trong first-party/Search Console |
| D-005 | Tử Vi là paid MVP | Chốt | Category/calculator volume lớn và `luận giải tử vi` có commercial signal | Xem lại nếu alpha quality không đạt hoặc engine không xác minh được |
| D-006 | Free chart trước paid report | Chốt | Search intent nghiêng về lập/xem lá số; cần value proof trước trả tiền | Test độ sâu preview, không bỏ free chart |
| D-007 | Giá baseline 79.000đ/topic | Giả thuyết vận hành | Nằm trong khoảng founder cho là khả dĩ; keyword không chứng minh WTP | A/B test 59/79/99k khi đủ traffic |
| D-008 | Bát Tự và Bản đồ sao là mở rộng kế tiếp | Chốt roadmap | Demand cao; hỗ trợ positioning Đông–Tây | Thứ tự có thể đổi theo usage/waitlist |
| D-009 | Kinh Dịch sau các hệ lá số | Chốt roadmap | Demand rõ nhưng use case dạng câu hỏi khác, cần UX/risk rules riêng | Đẩy sớm nếu waitlist cao và engine sẵn sàng |
| D-010 | Không bán phong thủy Phase 1 | Chốt | Commerce signal tốt nhưng làm loãng validation của paid interpretation | Mở khi có traffic/trust và ops commerce |
| D-011 | `lasoviet.cloud` là infra reserve | Chốt | Không tạo website thứ hai; dùng khi có boundary vận hành thật | Dùng cho API/storage nếu có lợi ích cụ thể |
| D-012 | `lasoviet.xyz` redirect/defensive | Chốt | Tránh duplicate content và phân mảnh trust | Lab chỉ khi access-controlled/noindex |
| D-013 | Không giả chuyên gia | Chốt | Không có đội ngũ chuyên gia; trust phải dựa vào method/evidence/transparency | Chỉ thêm expert claims khi có người thật và quy trình thật |
| D-014 | Engine–evidence–AI tách lớp | Chốt kỹ thuật | Auditability, reproducibility, safety, multi-method scale | Không xem xét lại; chỉ thay implementation |
| D-015 | GPL/AGPL reference-only trong closed MVP | Chốt tạm thời | Rủi ro nghĩa vụ license | Legal có thể phê duyệt kiến trúc/license khác |
| D-016 | Dừng thêm Keyword Planner trước MVP | Chốt | 571 keywords/298 có volume đủ để chọn scope; thiếu hụt hiện tại là conversion/WTP | Search thêm khi Search Console phát hiện cluster mới |
| D-017 | Chọn 12/27 bộ môn trong workbook coverage phù hợp thị trường VN (`docs/11`) | Chốt | Đối chiếu 27 bộ môn với keyword data; 15 bộ môn có repo nhưng gần như không có tín hiệu tìm kiếm VN | Xem lại nếu Search Console phát hiện demand mới cho bộ môn đã loại |
| D-018 | Tổ chức roadmap mở rộng theo Batch/engine sẵn có, không thuần theo volume | Chốt | Tích hợp `Brhiza/mingyu` (MIT) một lần mở khóa 6 bộ môn trong danh sách 12 cùng lúc | Không xem lại trừ khi engine thay đổi |
| D-019 | Thần Số Học nâng ưu tiên, build song song Batch 1 thay vì chờ sau Bát Tự | Chốt theo FD-012 | Volume 500K, long-tail rộng, zero rủi ro license/kỹ thuật (`docs/11 §7-D`) | Không đổi thứ tự SKU trả phí Bát Tự/Bản đồ sao (D-008) |
| D-020 | Làm rõ phạm vi D-010: tính toán/content phong thủy được phép, bán vật phẩm vẫn cấm | Chốt theo FD-012 | Cụm từ khóa Phong Thủy (10K–100K) tách biệt rõ khỏi cụm commerce (`vật phẩm`, `vòng`, `đá` phong thủy) (`docs/11 §7-E`) | Không mở lại việc bán hàng ở Phase 1 |
| D-022 | Non-binding business summary of `FD-019`: Blueprint v1.1 is the canonical UX, route, and SEO source; approved technical decisions prevail | Tham chiếu | Binding approval is recorded only in `rules-and-decisions-tracker.md` as `FD-019` | Update only when `FD-019` is explicitly superseded |
| D-021 | Xem Chỉ Tay: cho phép pilot upload ảnh bàn tay; Xem Mặt: hoãn tới khi đủ uy tín | Chốt | Chỉ tay có demand thực (~5K) và rủi ro sinh trắc học thấp hơn ảnh khuôn mặt; xem mặt hoãn để bảo vệ niềm tin giai đoạn đầu | Xem mặt mở lại sau Gate 3 khi có bằng chứng trust rõ ràng |
| D-023 | Nav chuyển từ mega-menu sang mô hình **context-sensitive**: header homepage gọn (Dịch vụ, Công cụ miễn phí, Kiến thức, Liên hệ ↗ FB fanpage, Đăng nhập), header trang bộ môn mới hiện đủ link chéo sang 4 bộ môn flagship còn lại | Chốt theo `docs/19` v1.1 | Founder brainstorm 2026-09-04→05: nav phẳng 8 mục ngay trên homepage bị phản hồi là "rất rối"; sửa bằng cách chỉ hiện link chéo bộ môn khi khách đã vào đúng ngữ cảnh 1 bộ môn (đúng cách huyenmenh tách header `/#services` khỏi header `/tarot`) | Xem lại nếu research sau launch cho thấy khách cần thấy tất cả bộ môn ngay từ homepage |
| D-024 | Section "Dịch vụ" trên homepage hiện đủ 12 bộ môn (thẻ card, không phải nav) ngay từ đầu, kể cả bộ môn chưa có engine (gắn trạng thái "Sắp ra mắt", không giả form/tính toán) — thay thế một phần nguyên tắc "chỉ hiển thị sản phẩm đã hoạt động" ở `docs/14` §2.1 | Chốt theo `docs/19` | Founder brainstorm 2026-09-04: muốn thể hiện đủ 12 bộ môn đã chốt ở `docs/11` ngay trong kiến trúc, không đợi từng đợt build | Không áp dụng cho nội dung/form giả — chỉ áp dụng cho việc hiển thị vị trí trên section/sitemap |
| D-025 | 7 bộ môn/tiện ích Nhóm B (`docs/11`) gộp vào 1 trang nav `/cong-cu-mien-phi`, nhưng mỗi tiện ích vẫn giữ URL con riêng để bảo toàn SEO cluster độc lập | Chốt theo `docs/19` | Founder yêu cầu gộp 1 trang cho gọn nav; giữ URL con vì mỗi cụm từ khóa (12 con giáp, ngày tốt, tarot...) có volume độc lập, gộp cứng sẽ tự cạnh tranh từ khóa | Founder đã xem và không phản đối cách dung hoà này trong phiên brainstorm |
| D-026 | Art direction: homepage/cấp platform dùng hình ảnh "tàng thư vũ trụ" phổ quát Đông-Tây (không riêng Tử Vi); mỗi trang bộ môn (kể cả Tử Vi) có hiện vật tín hiệu + màu nhấn riêng; cho phép ngoại lệ có kiểm soát với lệnh cấm ảnh tarot/hoàng đạo ở `art-direction.md` §2, chỉ áp dụng cho `/boi-bai` và `/chiem-tinh` | Chốt theo `docs/19` | Founder brainstorm 2026-09-04: homepage hiện tại code cứng hình ảnh Tử Vi/Đông phương trong khi định vị là đa bộ môn; Tarot/Chiêm Tinh không thể hoạt động nếu cấm tuyệt đối ảnh đặc trưng | Cần 1 đợt ảnh mới cho homepage theo hướng này — chưa thực hiện |
| D-027 | "Lập lá số" là 1 hành động dùng chung (1 wizard) cho 4 bộ môn dựa trên hồ sơ sinh (Tử Vi, Bát Tự, Chiêm Tinh, Thần Số Học) — không phải 4 form nhập liệu riêng biệt trên 4 trang; Kinh Dịch tách hẳn (câu hỏi + thời điểm gieo quẻ, không dùng hồ sơ sinh) | Chốt theo `docs/19` v1.1 | Founder brainstorm 2026-09-05: "có lá số rồi mới dùng những môn có liên quan để luận giải" — khớp với quyết định đã có sẵn ở `docs/11` §4.1 (Thần Số Học dùng chung Birth Profile data model với Tử Vi) mà bản v1.0 của `docs/19` mô tả sai thành form riêng từng trang | Không áp dụng cho Kinh Dịch và nhóm Công cụ miễn phí |
| D-028 | URL từng trang bộ môn dùng tên gọn đúng bộ môn (`/bat-tu`, `/kinh-dich`, `/chiem-tinh`, `/than-so-hoc`), không dùng slug nhồi từ khóa; đề xuất đổi `/la-so-tu-vi` đã live thành `/tu-vi` để nhất quán | Chốt theo `docs/19` v1.1 | Founder yêu cầu URL gọn đúng tên môn; chưa lên production nên đổi slug Tử Vi không mất SEO equity thật | Việc đổi slug Tử Vi + sửa link nội bộ chưa thực hiện, thuộc implementation plan |

## Open decisions

- Mức free preview tối ưu.
- Ngưỡng conversion để đầu tư Bát Tự/Bản đồ sao.
- Audit license thực tế của `yeonsumia/palmistry` trước khi dùng production cho pilot Xem Chỉ Tay.
- Phase 07–11 commercial and safety decisions tracked in
  `docs/superpowers/plans/2026-08-31-lasoviet-platform-implementation/open-decisions.md`.
