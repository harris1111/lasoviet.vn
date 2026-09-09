---
route_id: brand.home
canonical_path: /
locale: vi
lifecycle: live_indexable
implementation_state: current (needs revision)
source_commit: a3db625e1117e2facb0e066192b098aff4570913
candidate_commit: null
version: 2
status: draft
reviewer: null
approved_at: null
approval_record: null
content_sha256: null
---

# `/` — Trang chủ — Draft nội dung & UX (vòng 2, sau phản hồi Harris)

**Đọc trước:** [`../voice-and-positioning.md`](../voice-and-positioning.md) — định hướng giọng văn/định vị
áp dụng cho toàn site từ vòng này trở đi, kèm nghiên cứu đối thủ (huyenmenh.com, tuviluangiai.vn). Mục ✅
trong file đó ghi quyết định của Harris về khung "cổ thư/tri thức tiền nhân" (đã chốt, không còn là câu
hỏi mở).

Vòng 1 (v1) giữ nguyên bên dưới các phần không đổi (state variants, phần lớn claims ledger). Phần này chỉ
liệt kê **những gì đổi so với v1** sau 5 quyết định của Harris + yêu cầu viết lại giọng văn toàn site.

## Quyết định đã chốt (input cho vòng viết lại)

| # | Quyết định |
|---|---|
| 1 | Bỏ khung "một hồ sơ sinh" — không đúng vì có môn (Kinh Dịch, và một phần các môn khác) không cần dữ liệu sinh. Định vị mới dùng deep metaphor có sẵn của brand: "thư viện — bàn đọc riêng" (xem voice-and-positioning.md). |
| 2 | **Bỏ hẳn lưới 3 thẻ tier khỏi trang chủ.** Mỗi bộ môn có cách bán/tên gọi riêng — không có "ladder chung toàn site". Trang chủ chỉ xây trust + dẫn sang trang mẫu; chi tiết tầng/giá chuyển hẳn về `sample-report.tu-vi` và `commercial.tu-vi*`. |
| 3 | Trang mẫu dùng chung 1 trang cho 2 tầng, có đánh dấu ranh giới — **cộng thêm cơ chế tò mò/FOMO có đạo đức** để thúc đẩy mở khóa bản đầy đủ (chi tiết ở mục riêng bên dưới, áp dụng thật khi viết `sample-report.tu-vi.md`). |
| 4 | Nhãn Kinh Dịch: "Khám phá Kinh Dịch" → "Đặt câu hỏi Kinh Dịch (xem trước)". |
| 5 | Làm luôn việc sắp xếp lại section trong đợt này (không tách việc riêng cho An). |
| 6 (mới) | Viết lại giọng văn toàn trang theo hướng tự nhiên/storytelling/punchline — không chỉ sửa lỗi overclaim như v1. |

## Nội dung viết lại theo giọng mới (thay thế bảng v1 ở các dòng có đổi)

| Section | Key | v1 (đã lỗi thời) hoặc hiện tại | **v2 — đề xuất mới** | Kỹ thuật áp dụng |
|---|---|---|---|---|
| Hero eyebrow | `home.hero.eyebrow` | "Một hồ sơ sinh · Đa tầng soi chiếu Đông – Tây" | **"Thư viện huyền học Việt · Mỗi câu hỏi, một cách tra cứu riêng"** | insight-stickiness: khai thác đúng deep metaphor "thư viện" đã có sẵn trong brand guideline §3.1, không phát minh ẩn dụ mới; sửa lỗi ngụ ý "cần hồ sơ sinh cho mọi môn". |
| Hero lead | `home.hero.lead` | "Nhập thời khắc sinh một lần — soi tỏ căn tính và đường đời qua Tử Vi, Bát Tự, Bản đồ sao và Thần Số Học." | **"Đọc một lá số mà thấy toàn thuật ngữ lạ, vẫn không rõ nó đang nói gì về mình? Lá Số Việt dựng lá số Tử Vi miễn phí, rồi mở từng nhận định bằng đúng một câu hỏi: vì sao lại như vậy."** | copywriting-expert: rhetorical question mở đầu (giữ đúng nguyên tắc "Use Rhetorical Questions"); nối với CTA "Vì sao có nhận định này?" đã tồn tại ở section Evidence (Velcro theory — lặp một mỏ neo ngôn ngữ để dễ nhớ). |
| Hero copy (đoạn dưới lead) | `home.hero.copy` | "Không thần bí hóa, không phán xét tương lai. Lá Số Việt chuyển hóa đồ hình cổ xưa thành lời giải thích tiếng Việt sáng rõ, minh bạch từng căn cứ..." | **"Không phán một câu rồi để bạn tự đoán. Không hứa biết trước tương lai. Những nhận định quan trọng đều có thể mở ra xem — dữ liệu nào, quy tắc nào, giới hạn ở đâu — để quyết định cuối cùng vẫn là của bạn."** (bản đã sửa sau kiểm thử — bản nháp đầu dùng "Mỗi kết luận"/"Every conclusion", bị `tests/i18n/homepage-content.test.ts` chặn vì là tuyên bố tuyệt đối; đổi để khớp đúng cơ chế thật, evidence chỉ gắn ở nhận định quan trọng) | insight-stickiness (Unexpected + Emotional): lật ngược kỳ vọng thị trường ("chính xác tuyệt đối", "biết trước tương lai") thành lời hứa ngược — đúng nguyên tắc brand đã có sẵn ("Khả năng trước, định mệnh không bao giờ", §3.4) nhưng chưa từng được nói thẳng ra làm câu định vị. |
| Hero microcopy | `home.hero.microcopy` | "...Riêng tư tuyệt đối..." | "Miễn phí ngay lập tức · Riêng tư theo mặc định · Không cần đăng ký tài khoản." | Giữ nguyên sửa từ v1 (đây là claim, không phải giọng văn — không đổi thêm). |
| Problem section | `home.problem.*` | "Một câu hỏi có thể được nhìn từ nhiều hệ quy chiếu" — 3 điểm liệt kê khô, giọng tài liệu | **title: "Bạn từng đọc một bài tử vi và tự hỏi: sao lại đúng với người này mà không đúng với mình?"** · lead: "Câu trả lời thường nằm ở phạm vi và cách trình bày, không phải ai giỏi hơn ai." · point1 "Khác phạm vi": "Mỗi hệ quy chiếu — Tử Vi, Bát Tự, chiêm tinh — nhìn một cấu trúc riêng, trả lời một nhóm câu hỏi riêng, không phải cả cuộc đời trong một câu." · point2 "Khác ngôn ngữ": "Thuật ngữ cổ cần ai đó dịch lại sang cách nói hôm nay — nếu không, bạn chỉ nghe được âm thanh, chưa hiểu được ý." · point3 "Khó đối chiếu": "Một nhận định chỉ thật sự hữu ích khi bạn nhìn được dữ liệu và quy tắc đứng sau nó, không phải chỉ nghe kết luận rồi tin theo." · bridge: "Lá Số Việt bắt đầu với Tử Vi: dựng đúng lá số của bạn trước, rồi mở từng nhận định ra để bạn tự đối chiếu — thay vì phán một câu rồi thôi." | storytelling (địa chỉ hoá "bạn", mở bằng câu hỏi thật thay vì tiêu đề trừu tượng) + copywriting-expert (Customer language over company language — bỏ chữ "hệ quy chiếu" lặp máy móc ở đầu, giữ lại trong thân bài vì đây là thuật ngữ đã quen thuộc với brand). Không thêm claim mới — chỉ đổi cách kể. |
| Lenses lead | hardcode trong `.tsx` | "...kích hoạt đồng thời qua 4 bộ môn nguyên bản" | Dùng key có sẵn `home.lenses.lead`: "Tử Vi là hệ quy chiếu đang hoạt động. Bát Tự, Bản đồ sao và Thần Số Học được hiển thị ở trạng thái sắp ra mắt, chưa có liên kết sử dụng." | Giữ nguyên đề xuất v1 — đúng, không cần viết lại giọng vì đây vốn đã là bản trung thực có sẵn. |
| Lenses H2 | hardcode trong `.tsx` | "Một hồ sơ sinh duy nhất. Soi tỏ qua 5 lăng kính." | **"Năm lăng kính, mỗi lăng kính một cách bắt đầu riêng"** | Phát hiện thêm khi rà lại toàn trang cho bản final-copy: H2 này mang đúng lỗi "một hồ sơ sinh" mà Harris đã bác cho hero eyebrow — bỏ sót ở vòng 1/2. Kinh Dịch và (một phần) Thần Số Học không bắt đầu bằng hồ sơ sinh. |
| Lenses — nhãn Kinh Dịch | hardcode | "Khám phá Kinh Dịch" | **"Đặt câu hỏi Kinh Dịch (xem trước)"** | Theo quyết định #4. |

### Value ladder → đổi thành "Cách chúng tôi luận giải" (bỏ lưới 3 tier)

Xoá hoàn toàn khung 3 thẻ tier (`tier1/tier2/tier3` hiện tại). Thay bằng một section trust + 1 CTA dẫn
sang trang mẫu — không hiện giá, không hiện tên gói ở đây (giá/gói là việc của `sample-report.tu-vi` và
`commercial.tu-vi*`, theo quyết định #2):

```
eyebrow: "Cách chúng tôi luận giải"
title:   "Không phán một câu rồi để bạn tự đoán"
body:    "Một lá số Tử Vi có hàng chục cung, sao và mối liên hệ. Chúng tôi không gộp tất cả thành một
          câu chung chung. Mỗi nhận định đi kèm phần 'vì sao' để bạn tự đối chiếu.

          Bắt đầu luôn miễn phí: đồ hình đầy đủ, ba điểm nổi bật đầu tiên và một căn cứ mở ra xem ngay.
          Khi muốn đọc sâu hơn, bản luận giải đầy đủ có giá rõ ràng ngay trên trang, trả một lần, không
          tự động gia hạn."
methodNote (đã chốt hướng "cổ thư/tri thức tiền nhân" — xem mục ✅ trong voice-and-positioning.md):
         "Tử Vi Đẩu Số là hệ thống cổ học được đúc kết qua nhiều thế kỷ, từ tri thức tinh túy của các bậc
          tiền nhân. Lá Số Việt kế thừa nền tảng đó, vận hành bằng một cách tính nhất quán và minh bạch."
CTA:     "Xem bản luận giải mẫu" (primary, → /bao-cao-mau/tu-vi)
```

Ảnh hưởng implementation (ghi chú cho An, không phải nội dung): `homepage-value-ladder.tsx` đổi mục đích —
không còn là "ladder nhiều tier", các key `home.valueLadder.tier1/2/3` trong `common.json` không dùng nữa
cho trang chủ (chuyển hẳn thông tin giá/gói sang content của `sample-report.tu-vi`/`commercial.tu-vi`). Tên
component/id section (`data-home-block="value-ladder"`, `id="luan-giai"`) có thể giữ nguyên vì URL anchor
`#luan-giai` có thể đang được trỏ tới từ nơi khác — An xác nhận trước khi đổi id.

### Trust strip — đổi 2/4 thẻ (giữ nguyên item2 "Tường minh căn cứ" và item4 "Không ép gia hạn")

- **`item1` đổi hẳn** (thay "Miễn phí khởi đầu" — giá trị free đã nói đủ ở hero + section free-value ngay
  sau, không cần lặp lần 3): title **"Gốc rễ hơn nghìn năm"** / copy **"Tử Vi Đẩu Số là hệ thống cổ học
  được đúc kết qua nhiều thế kỷ, từ tri thức tinh túy của các bậc tiền nhân — Lá Số Việt kế thừa nền tảng
  đó bằng một cách tính nhất quán, minh bạch."** — dùng khung "cổ thư/tiền nhân" đã chốt (xem ✅ trong
  voice-and-positioning.md); cơ chế tâm lý: Lindy Effect + Authority Bias (marketing-psychology) — thứ
  tồn tại càng lâu càng được tin, không cần số liệu cụ thể để hiệu ứng này có tác dụng.
- `item3` (giữ nguyên đề xuất sửa từ v1): title "Riêng tư theo mặc định" / copy "Lá số của bạn không hiển
  thị công khai. Dữ liệu khách chưa liên kết tài khoản được xóa trong 24 giờ."

### Section MỚI — trích "Về Lá Số Việt", kèm brief hình

Theo yêu cầu của Harris: thêm 1 section ngắn trên trang chủ trích từ trang About (`vi/brand.about.md`),
đặt **ngay trước final-cta** — một manifesto ngắn ngay trước khi mời hành động thường mạnh hơn đặt ở giữa
trang, và không làm trang dài thêm đáng kể (chỉ 1 câu quote + 1 câu bổ trợ + CTA).

```
eyebrow: "Về Lá Số Việt"
quote:   "Chúng tôi tin bạn xứng đáng được hiểu rõ, không phải bị phán xét."
support: "Khả năng trước, định mệnh không bao giờ — đó là lý do mọi nhận định ở đây đều có thể mở ra xem,
          không chỉ để bạn tin theo."
CTA:     "Đọc câu chuyện Lá Số Việt →" (→ /ve-la-so-viet)
```

**Brief hình cho section này (để Harris gen sau):**

- **Chủ thể:** một cuốn sách/tư liệu cổ đang mở, ánh sáng nhẹ rọi vào trang giấy — gợi "tri thức được mở
  ra", không phải "vận mệnh được tiết lộ" (khác hẳn motif thầy bói/tiên tri).
- **Phong cách:** line-art mực navy + **một điểm nhấn son/cinnabar duy nhất** (một sợi chỉ đỏ đánh dấu
  trang, hoặc một con dấu nhỏ) — đúng quy tắc "line-art mực navy, một điểm son" tại
  `docs/13-brand-experience-guideline.md` §5.5.
- **Texture:** giấy 2–4%, nền tối theo palette lacquer/pearl hiện có của site — không nền trắng phẳng.
- **KHÔNG dùng** (đúng danh sách cấm §5.5 của brand): thầy bói, quả cầu pha lê, khói hương, vàng kim giả
  lấp lánh, AI art giả cổ, chữ Hán/Nôm không kiểm chứng, vũ trụ/thiên hà tím, motif "mở cổng vận mệnh".
- **Bố cục:** ảnh nền ngang cạnh khối text ngắn, cùng kiểu với các ảnh nền section khác của trang chủ (ví
  dụ `tang-thu-chu-de-luan-giai-sau-background-homepage.webp`).
- **Tên file gợi ý** (theo rule đặt tên ảnh SEO đã có trong dự án): `ve-lasoviet-tu-lieu-co-mo-trang-
  homepage.webp`.

## Cơ chế tò mò/FOMO cho trang mẫu (`sample-report.tu-vi`) — sketch, viết đầy đủ khi tới lượt trang này

Dùng khi viết `content-ux-polish/vi/sample-report.tu-vi.md`:

- **Mục lục mở (Zeigarnik):** hiện đủ 12 cung dạng mục lục ngay đầu trang; 4 mục thuộc tầng 19k đọc được
  đầy đủ; 8 mục còn lại hiện tên cung + **một dòng gợi ý cụ thể** (không mơ hồ) nhưng khoá nội dung, ví dụ
  "Cung Quan Lộc — một điểm cần lưu ý quanh giai đoạn chuyển việc [khoá]".
- **Loss aversion trung thực:** vì nội dung 12 cung được sinh cùng một lần khi mua tầng 1 (spec ladder mục
  3.2), được phép nói thật "8 cung còn lại đã sẵn sàng cho đúng lá số của bạn — chỉ cần mở khóa", không
  phải giả vờ đang xử lý.
- **Anchoring thật:** hiện 79.000đ, kèm "đã trả 19.000đ hôm nay → nâng cấp chỉ còn 60.000đ" (đúng số theo
  FD-041).
- **Scarcity thật:** hạn 7 ngày khấu trừ — nói thẳng, không cần thêm kịch tính.
- **Goal-gradient thật:** "Bạn đã đọc 4/12 cung" nếu kỹ thuật cho phép track theo entitlement thật; nếu
  chưa làm được ở vòng này thì bỏ, không giả lập.
- **Không dùng:** testimonial, số lượng khách hàng, countdown giả, cam kết thời gian xử lý chưa có bằng
  chứng vận hành (xem danh sách cấm đầy đủ trong voice-and-positioning.md).

## Giữ nguyên từ v1 (không lặp lại ở đây)

- Đối chiếu ladder giá 19k/79k — xem file này bản v1 trong lịch sử git, hoặc `voice-and-positioning.md`.
- FAQ giờ sinh, category-comparison row6, state variants, claims ledger cơ bản — không đổi so với v1.
- 4 câu hỏi mở còn lại của v1 (đã trả lời: eyebrow → xử lý ở trên; tier-3 → bỏ hẳn theo quyết định #2;
  trang mẫu → đồng ý dùng chung + FOMO; Kinh Dịch → đồng ý; thứ tự section → đồng ý làm luôn).

## Câu hỏi mở còn lại sau vòng 2

1. Section "Cách chúng tôi luận giải" mới thay thế value-ladder — có cần giữ lại MỘT con số giá tham khảo
   nào trên trang chủ (ví dụ chỉ nói "từ 19.000đ") để giảm bước nhấp trước khi thấy giá, hay giữ hoàn toàn
   không có giá như đề xuất (Harris có thể cân nhắc dữ liệu conversion thật sau khi có traffic)?
2. Đồng ý để tôi áp voice-and-positioning.md này cho **tất cả các trang tiếp theo** (không hỏi lại từng
   trang), hay muốn duyệt thêm 1-2 trang nữa trước khi coi đây là chuẩn chung?
3. Khung "cổ thư/tiền nhân" đã chốt cho trang chủ — có nên lan sang cả các trang phương pháp/nguồn tri
   thức (`/phuong-phap`, `/nguon-tri-thuc`) không? Hai trang đó hiện đang mô tả kỹ thuật thật (iztro,
   ruleSetId) cho người muốn tra cứu sâu — cần biết Harris muốn giữ 2 trang đó ở mức "kỹ thuật minh bạch"
   như hiện tại, hay cũng chuyển sang giọng "cổ học" khi tới lượt viết 2 trang này.

## Founder approval

Chưa duyệt. Ghi quyết định chính xác và hash tương ứng sau khi Harris review vòng 2.
