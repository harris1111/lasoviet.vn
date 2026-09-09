# Voice & Positioning Guide — áp dụng cho mọi trang từ đây trở đi

**Vì sao có file này:** sau khi duyệt draft trang chủ v1, Harris nhận xét content toàn site đang đọc như
báo cáo quyết định kỹ thuật, không giống copy của một website hoàn chỉnh — thiếu punchline, storytelling,
sự gần gũi. Đây là bộ định hướng để mọi page-draft tiếp theo bám theo, không phải chỉ áp dụng riêng cho
trang chủ.

## Input đã dùng để quyết định hướng

- Khung SUCCESs + deep-metaphor (skill `insight-stickiness`, dựa trên *Made to Stick* và *How Customers
  Think*).
- Khung copywriting/landing-page (skill `copywriting-expert`, `writing-landing-page-copy`).
- Mental model tâm lý mua hàng (skill `marketing-psychology`).
- Kỹ thuật kể chuyện, giữ đúng brand voice hiện có (skill `storytelling`).
- Nghiên cứu đối thủ trực tiếp (WebFetch, 2026-09-09):
  - **huyenmenh.com** — headline "Hiểu Bản Mệnh - Hiểu Chính Mình"; trust bằng "50+ cổ thư kinh điển",
    "100% miễn phí trọn đời"; bảng so sánh 3 cách tiếp cận (thầy số truyền thống / Huyền Mệnh Đường /
    web-app phổ thông); tông mix học thuật + AI/tech hiện đại.
  - **tuviluangiai.vn** — dùng tiêu đề dạng câu hỏi/phản bác để gây tò mò ("Hiền lành có thật sự dễ bị bắt
    nạt?"); có câu định vị rất gần với brand hiện có của Lá Số Việt: "Tử vi không quyết định số phận. Nó
    giúp bạn hiểu bản thân."
  - Search tổng quan thị trường: các site lớn (tuvi.vn, xem-tuvi.com, KTHDIGI thần số học) đều thi nhau
    tuyên bố "miễn phí trọn đời", "chính xác nhất", quy đổi âm lịch — tức là "miễn phí" và "chính xác" đã
    là commodity claim, không còn là điểm khác biệt.

## Quyết định định vị (đã chốt cùng Harris)

**Không dùng lại khung "một hồ sơ sinh"** — sai với thực tế (Kinh Dịch không cần hồ sơ sinh; các môn khác
mỗi môn sẽ có cách bán/tên gọi riêng, không dùng chung một "ladder" hiển thị trên trang chủ).

**Deep metaphor dùng xuyên suốt:** brand đã có sẵn North Star chưa được khai thác hết trong copy hiện tại
(`docs/13-brand-experience-guideline.md` §3.1): *"Thư viện tri thức Việt đương đại — với một bàn đọc riêng
tư dành cho từng người."* Đây đã đúng là một deep metaphor tốt (Container/Resource + không gian riêng tư
cá nhân) — vấn đề là copy hiện tại (hero, lenses) không dùng metaphor này, lại tự vẽ ra khung "một hồ sơ
sinh, kích hoạt 4 bộ môn" không khớp brand North Star lẫn thực tế sản phẩm. **Hướng sửa là khai thác đúng
metaphor đã có, không phát minh metaphor mới.**

**Góc "Unexpected" dùng làm trục cảm xúc chính:** thị trường huyền học VN đầy tuyên bố "chính xác tuyệt
đối", "biết trước tương lai". Lá Số Việt đã có sẵn nguyên tắc ngược lại trong chính brand guideline
(§3.4): *"Khả năng trước, định mệnh không bao giờ."* Biến nguyên tắc này thành câu định vị công khai —
"không đoán số phận, chỉ giúp bạn thấy rõ mình hơn" — vừa trung thực, vừa khác biệt thật (không phải khác
biệt marketing giả), vừa đúng SUCCESs (Unexpected + Credible + Emotional: giảm lo âu thay vì tạo lo âu).

**Đề xuất eyebrow/positioning mới cho hero (thay "Một hồ sơ sinh · Đa tầng soi chiếu Đông – Tây"):**

> Thư viện huyền học Việt · Mỗi câu hỏi, một cách tra cứu riêng

H1 hiện tại "Lập lá số. Hiểu vận mệnh." là hero đã duyệt (binding), **không đổi** trong đợt này.

## ✅ Đã chốt: dùng concept "cổ thư / tri thức tinh túy của tiền nhân" — quyết định của Harris, không phải tuỳ chọn nữa

Ở vòng 1, tôi từng đề xuất KHÔNG dùng khung "hàng trăm cổ thư" vì hai lý do: (1) repo không liệt kê danh
mục cổ thư nào — nguồn kỹ thuật thật là `iztro 2.6.0` (`content/public/vi/pages/sources.mdx`,
`method.ziwei.mdx`); (2) brand guideline §3.2-3.3 tự đặt ranh giới tránh "cổ trang, thần bí hóa, xây uy
quyền siêu nhiên".

**Harris đã xem lý do trên và quyết định giữ hướng dùng concept này**, với lập luận: các chi tiết kỹ thuật
(iztro, ruleSetId...) là backend, không phải thứ hiển thị cho người dùng; khi nói với người dùng, được
phép dùng ngôn ngữ "hàng trăm cổ thư, tri thức tinh túy của cổ nhân" để tạo sức hút và niềm tin với đối
tượng mục tiêu — đây là quyết định brand/copy, thuộc thẩm quyền Harris (đúng phân vai trong
`docs/15-collaboration-branch-workflow.md`: brand/copy → Harris quyết).

**Cách tôi viết theo quyết định này (một lựa chọn về từ ngữ, không phải lật lại quyết định):** dùng khung
số nhiều không định lượng — "vô số cổ thư", "hàng trăm năm", "tri thức tinh túy của các bậc tiền nhân" —
thay vì một con số cụ thể có thể bị hỏi ngược ("bao nhiêu quyển, tên gì") như "50+ cổ thư" của Huyền Mệnh
Đường. Đây nói về **bề dày của bộ môn Tử Vi Đẩu Số nói chung** (một sự thật phổ quát, ai trong ngành cũng
nói vậy, không phải một tuyên bố kiểm định riêng cho quy trình kỹ thuật của Lá Số Việt) — vẫn đúng tinh
thần "concept" Harris muốn, chỉ khác ở chỗ không tự trói vào một con số có thể sai.

**Áp dụng (marketing-psychology — Lindy Effect + Authority Bias; copywriting-expert — concrete nhưng không
bịa số):**

> "Tử Vi Đẩu Số là hệ thống cổ học được đúc kết qua nhiều thế kỷ, từ tri thức tinh túy của các bậc tiền
> nhân. Lá Số Việt kế thừa nền tảng đó, vận hành bằng một cách tính nhất quán và minh bạch."

Lindy Effect (điều gì tồn tại càng lâu càng có khả năng đáng tin/tồn tại tiếp) là đúng cơ chế tâm lý đứng
sau "hàng nghìn năm" tạo được trust — không cần thêm số liệu cụ thể để cơ chế này phát huy tác dụng.

## Mở rộng 2026-09-09 (sau homepage): khung "cổ học" là trục định vị của TOÀN site, không riêng Tử Vi

Harris xác nhận: đây là concept tổng của Lá Số Việt, không riêng trang chủ hay riêng Tử Vi — **phương Đông
hay phương Tây thì cũng đều là tri thức cổ của người xưa được đúc kết lại** (Tử Vi, Bát Tự, Kinh Dịch =
phương Đông; chiêm tinh, thần số học Pythagore = phương Tây, cũng có gốc rễ hàng nghìn năm riêng của nó).
Đây chính là lý do brand North Star "thư viện" hợp lý ngay từ đầu: một thư viện tri thức cổ **cả hai nền
văn minh**, không phải một công cụ tính toán hiện đại đơn lẻ.

**Áp dụng khi viết bất kỳ trang nào từ giờ:**
- Trang liên quan Đông (Tử Vi, Bát Tự, Kinh Dịch, phong thủy): dùng "tri thức phương Đông đúc kết qua
  nhiều thế kỷ/tiền nhân".
- Trang liên quan Tây (chiêm tinh, thần số học): dùng khung tương đương nhưng đúng gốc của nó — chiêm tinh
  phương Tây cũng có lịch sử hàng nghìn năm (Babylon, Hy Lạp cổ đại), thần số học thường quy về Pythagoras
  (Hy Lạp cổ đại, ~2500 năm) — **không dùng nhầm "tiền nhân/cổ thư" kiểu Đông cho các trang Tây**, phải
  đúng gốc văn hóa của từng hệ khi tới lượt viết các trang đó.
- Trang tổng/thư viện (trang chủ, `/phuong-phap`, `/nguon-tri-thuc`, `/ve-la-so-viet`): nói chung cả hai
  nền — "dù phương Đông hay phương Tây, đều là tri thức cổ nhân đúc kết qua nhiều thế kỷ".
- Đã áp dụng thực tế cho `/phuong-phap`, `/phuong-phap/tu-vi`, `/phuong-phap/ai-va-can-cu`, `/nguon-tri-
  thuc` — xem `vi/methodology.root.md`, `vi/methodology.tu-vi.md`, `vi/methodology.ai-evidence.md`,
  `vi/trust.sources.md`. Các trang này giữ nguyên phần nội dung kỹ thuật thật (engine/version/ca thử
  nghiệm) làm lớp "cho người muốn kiểm chứng sâu" phía sau frame cổ học — không xóa transparency, chỉ đổi
  thứ tự trình bày và giọng văn.

## Cơ chế tâm lý được duyệt dùng (và KHÔNG dùng)

**Dùng được, vì trung thực + đúng brand:**
- **Zeigarnik Effect / open loop:** trang mẫu hiện đủ 12 cung dưới dạng mục lục, 4 cung đầu đọc được, 8
  cung còn lại hiện tên + một dòng gợi ý cụ thể nhưng khóa nội dung — tạo cảm giác "còn dang dở" một cách
  trung thực (nội dung thật đã tồn tại, không phải giả vờ).
- **Loss aversion trung thực:** vì theo spec ladder (mục 3.2), nội dung 12 cung **đã được sinh ra cùng một
  lần** khi mua tầng 1 — nên có thể nói thật "8 cung còn lại đã sẵn sàng cho đúng lá số của bạn, chỉ cần mở
  khóa" thay vì tạo cảm giác chờ đợi giả.
- **Anchoring có thật:** hiển thị 79.000đ trước, rồi "đã trả 19.000đ → chỉ cần thêm 60.000đ" — đúng số
  thật theo FD-041, không phải neo giá giả.
- **Scarcity có thật:** hạn 7 ngày khấu trừ là thật (FD-041), được phép nhấn mạnh vì không phải bịa.
- **Goal-gradient:** "Bạn đã đọc 4/12 cung" — tiến độ thật, không phải progress bar giả (khác hẳn điều
  B-8 của spec ladder cấm — progress bar giả trên trang tạo báo cáo).

**Không dùng, vì vi phạm brand hoặc claim không kiểm chứng được:**
- Social proof kiểu "10.000+ người đã dùng", testimonial khách hàng, chuyên gia đại diện — brand cấm fake
  experts/testimonials và hiện chưa có traffic thật (round-2 doc mục 6: site mới, chưa có dữ liệu thật).
- Countdown giả, "chỉ còn X suất", cam kết thời gian xử lý không có bằng chứng vận hành.
- **Ngoại lệ đã chốt (khác v1):** khung "cổ thư / tri thức tinh túy của tiền nhân" được phép dùng ở dạng số
  nhiều không định lượng ("vô số cổ thư", "hàng trăm năm") để nói về bề dày của bộ môn Tử Vi Đẩu Số nói
  chung — xem mục ✅ ở trên. Không dùng một **con số cụ thể tự bịa** ("50+ cổ thư", "127 năm kinh nghiệm")
  gắn riêng cho quy trình kỹ thuật của Lá Số Việt, vì đó là loại claim có thể bị kiểm chứng ngược và sai —
  khác với việc nói về bề dày của cả bộ môn.

## Cách áp dụng cho các trang tiếp theo

Mỗi file `content-review/vi/<route-id>.md` từ giờ nên tự kiểm 3 câu trước khi coi là xong:
1. Có đang dùng đúng metaphor "thư viện — bàn đọc riêng" thay vì phát minh ẩn dụ mới không?
2. Có câu nào nghe như trích từ tài liệu quyết định kỹ thuật (tên biến, ID nội bộ, giọng "hệ thống ghi
   nhận...") lọt vào copy không — nếu có, viết lại bằng giọng người thật nói chuyện với người thật?
3. Mọi con số/tuyên bố uy tín có truy được về một nguồn thật trong repo không? Nếu không, hoặc bỏ, hoặc
   hỏi Harris trước khi viết.
