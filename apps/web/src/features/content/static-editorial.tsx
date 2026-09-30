import Link from "next/link";
import Image from "next/image";
import { LsvIcon, type LsvIconName } from "../../components/lsv-icon";

type Locale = "vi" | "en";
type Panel = { title: string; body: string };
type Story = {
  eyebrow: string;
  headline: string;
  lead: string;
  diagram: "chart" | "process" | "archive" | "calendar";
  panels: [Panel, Panel, Panel];
  action: string;
  href: string;
};

const supportingGraphics: Record<string, { file: string; caption: string }> = {
  "calculator.tu-vi": { file: "birth-data-alignment", caption: "Dữ liệu sinh là điểm đầu của mọi bước tính." },
  "knowledge.tu-vi.birth-time": { file: "hour-uncertainty-path", caption: "Khi giờ sinh chưa chắc, cách đọc cũng cần một nhãn giới hạn." },
  "methodology.ai-evidence": { file: "evidence-chain", caption: "Một nhận định cần nối được với dấu hiệu và nguồn tham chiếu." },
  "trust.sources": { file: "knowledge-index", caption: "Nguồn, quy tắc và diễn giải cần được phân biệt." },
  "commercial.tu-vi.identity": { file: "report-depth", caption: "Xem cấu trúc báo cáo trước khi quyết định mở bài." },
  "support.faq": { file: "la-wallet-flow", caption: "Phạm vi và số Lá cần dùng phải rõ trước khi xác nhận." },
};

const diagramIcons: Record<Story["diagram"], LsvIconName> = {
  chart: "chart-palaces", process: "method", archive: "archive", calendar: "annual-cycle",
};

// Copy here is intentionally limited to product behaviour visible today. The
// editorial drafts in docs contain proposed features, not a live data source.
export const STATIC_STORIES: Record<string, Story> = {
  "knowledge.tu-vi.definition": {
    eyebrow: "Tử Vi căn bản", headline: "Một lá số Tử Vi có gì bên trong?",
    lead: "Lá số là đồ hình được dựng từ dữ liệu sinh theo một bộ quy tắc. Mười hai cung và các sao cho người đọc một cấu trúc để đối chiếu, chứ không phải một câu phán sẵn về cuộc đời.",
    diagram: "chart", action: "Thử lập lá số", href: "/tu-vi",
    panels: [
      { title: "Mười hai cung", body: "Mỗi cung là một vị trí trong đồ hình, thường được dùng để xem một nhóm câu hỏi như bản thân, gia đình hoặc công việc. Ý nghĩa của nó thay đổi theo những liên hệ quanh cung." },
      { title: "Các sao và quan hệ", body: "Sao được an theo quy tắc từ dữ liệu sinh. Một cái tên trên lá số chưa đủ để kết luận một điều sẽ xảy ra." },
      { title: "Đọc từ đâu?", body: "Bắt đầu bằng ngày giờ sinh, kiểm tra cung Mệnh và cung Thân, rồi lần theo phần giải thích có căn cứ thay vì chọn một câu nghe hợp mình." },
    ],
  },
  "knowledge.tu-vi.calculation": {
    eyebrow: "Cách lập lá số", headline: "Đúng đầu vào, rồi mới đọc kết quả.",
    lead: "Một thay đổi ở ngày âm, tháng nhuận hoặc giờ sinh có thể đổi cách an sao. Trước khi đọc lời luận giải, hãy biết dữ liệu nào đã được dùng để dựng đồ hình.",
    diagram: "process", action: "Lập lá số Tử Vi", href: "/tu-vi",
    panels: [
      { title: "Ghi lại thời điểm sinh", body: "Chọn lịch âm hay dương và nhập giờ theo thông tin bạn biết. Nếu chưa chắc, đừng biến một ước lượng thành giờ sinh chính xác." },
      { title: "Quy đổi và an sao", body: "Hệ thống quy đổi thời gian rồi đặt cung, sao theo quy tắc. Đây là bước tính, khác với việc giải thích tính cách hoặc sự kiện." },
      { title: "Kiểm tra lại", body: "Đọc lại thông tin sinh trên kết quả. Nếu giờ sinh thay đổi, hãy lập lại đồ hình và đối chiếu những phần phụ thuộc vào giờ." },
    ],
  },
  "knowledge.tu-vi.reading": {
    eyebrow: "Học đọc lá số", headline: "Đừng bắt đầu bằng một ngôi sao.",
    lead: "Một lá số dễ khiến ta chú ý ngay tới tên sao tốt hay xấu. Cách đọc có ích bắt đầu từ toàn cảnh, đi qua các cung liên quan rồi mới thử hiểu một nhận định.",
    diagram: "chart", action: "Xem báo cáo mẫu", href: "/bao-cao-mau/tu-vi",
    panels: [
      { title: "Nhìn Mệnh, Thân và Cục", body: "Ba điểm này tạo một điểm khởi đầu để hiểu cấu trúc. Chúng không thay thế phần còn lại của đồ hình." },
      { title: "Đọc trong quan hệ", body: "Một cung có sao nào, nằm trong bối cảnh nào và liên hệ với những cung nào? Hỏi tiếp trước khi kết luận." },
      { title: "Giữ lại câu hỏi", body: "Một cách đọc là giả thuyết để bạn đối chiếu với trải nghiệm, hoàn cảnh và lựa chọn của mình." },
    ],
  },
  "knowledge.tu-vi.palaces": {
    eyebrow: "Mười hai cung", headline: "Mỗi cung mở một câu hỏi khác nhau.",
    lead: "Cung Mệnh gợi chuyện về bản thân; những cung khác mở ra chuyện quan hệ, việc làm, tài sản và nhiều mặt đời sống. Không cung nào đứng một mình.",
    diagram: "chart", action: "Lập đồ hình của bạn", href: "/tu-vi",
    panels: [
      { title: "Tên cung là nhãn tra cứu", body: "Một tên cung giúp bạn tìm đúng vùng trên lá số, không phải lời phán rằng mặt đời sống ấy sẽ tốt hay xấu." },
      { title: "Bối cảnh làm đổi cách đọc", body: "Vị trí cung, các sao và liên hệ xung quanh cùng góp vào một cách diễn giải. Hãy mở phần căn cứ khi có nhận định cụ thể." },
      { title: "Đọc theo điều đang quan tâm", body: "Bạn có thể bắt đầu ở câu hỏi về công việc hay tình cảm, rồi quay lại toàn đồ hình để không bỏ mất bối cảnh." },
    ],
  },
  "knowledge.tu-vi.stars": {
    eyebrow: "Mười bốn chính tinh", headline: "Tên sao chỉ là điểm bắt đầu.",
    lead: "Chính tinh là một nhóm sao quan trọng trong hệ thống Tử Vi. Tính chất của chúng cần được đọc cùng cung, vị trí và các sao khác thay vì gắn mỗi tên sao với một kiểu người.",
    diagram: "archive", action: "Học cách đọc lá số", href: "/kien-thuc/tu-vi/cach-doc-la-so-tu-vi",
    panels: [
      { title: "Tra đúng vị trí", body: "Trước hết hãy xem sao nằm ở cung nào trên đồ hình đã lập từ dữ liệu sinh." },
      { title: "Đặt vào một tổ hợp", body: "Một ngôi sao có thể được hiểu khác đi khi đi cùng sao và cung khác. Danh sách tính chất riêng lẻ chưa đủ cho một bài luận giải." },
      { title: "Tìm lời giải thích", body: "Khi một nhận định nêu tên sao, hãy hỏi nó dựa vào tổ hợp nào và có trường hợp ngoại lệ nào cần lưu ý." },
    ],
  },
  "knowledge.tu-vi.foundations": {
    eyebrow: "Mệnh · Thân · Cục", headline: "Ba khái niệm, một điểm bắt đầu.",
    lead: "Khi mới đọc lá số, Mệnh, Thân và Cục thường xuất hiện cùng lúc. Tách vai trò của từng khái niệm sẽ giúp bạn theo được mạch giải thích mà không cần học thuộc cả bộ thuật ngữ.",
    diagram: "process", action: "Đọc cách xem lá số", href: "/kien-thuc/tu-vi/cach-doc-la-so-tu-vi",
    panels: [
      { title: "Mệnh", body: "Cung Mệnh là vị trí đầu tiên thường được xem khi đặt câu hỏi về cấu trúc bản thân trên lá số." },
      { title: "Thân", body: "Cung Thân cho thêm một góc quan sát trong cùng đồ hình; cần đọc cùng Mệnh chứ không thay thế nó." },
      { title: "Cục", body: "Cục là một thông số của quy tắc lập lá số. Hãy xem nó được tính từ đâu trước khi gán cho nó một tính cách." },
    ],
  },
  "knowledge.tu-vi.cycles": {
    eyebrow: "Vận trình", headline: "Chu kỳ là khung để quan sát thay đổi.",
    lead: "Đại vận và tiểu vận là những lớp thời gian được dùng khi đọc Tử Vi. Một chu kỳ không phải lịch hẹn cho sự kiện chắc chắn sẽ đến.",
    diagram: "calendar", action: "Tìm hiểu phương pháp", href: "/phuong-phap/tu-vi",
    panels: [
      { title: "Đại vận", body: "Một lớp quan sát dài hơn giúp đặt câu hỏi về bối cảnh của từng giai đoạn, không tách khỏi lá số gốc." },
      { title: "Tiểu vận", body: "Một lớp thời gian ngắn hơn bổ sung bối cảnh. Nó không tự cho biết ngày nào một việc cụ thể sẽ xảy ra." },
      { title: "Đối chiếu với đời sống", body: "Thay vì chờ một dự báo ứng nghiệm, hãy dùng nhận định như lời nhắc nhìn lại điều bạn đang chuẩn bị và có thể lựa chọn." },
    ],
  },
  "knowledge.tu-vi.birth-time": {
    eyebrow: "Giờ sinh", headline: "Chưa biết giờ sinh vẫn có thể bắt đầu.",
    lead: "Giờ sinh ảnh hưởng đến cách dựng lá số. Nếu chưa biết chắc, hãy dùng một lá số tạm tính có nhãn rõ ràng và cập nhật khi tìm được thông tin chính xác hơn.",
    diagram: "calendar", action: "Bắt đầu với thông tin đang có", href: "/tu-vi",
    panels: [
      { title: "Khi biết giờ", body: "Nhập giờ theo giấy tờ hoặc ghi chép gia đình nếu bạn tin cậy nguồn ấy. Kiểm lại cách chọn lịch trước khi lập." },
      { title: "Khi chỉ nhớ khoảng giờ", body: "Ghi đúng mức độ chắc chắn của thông tin, nhất là khi khoảng nhớ được nằm gần ranh giới giữa hai giờ." },
      { title: "Khi chưa biết", body: "Lá số tạm tính giúp bạn xem trước các thông tin nền. Đừng đọc những phần phụ thuộc vào giờ như kết luận cuối cùng." },
    ],
  },
  "knowledge.tu-vi.accuracy": {
    eyebrow: "Giới hạn phương pháp", headline: "Tính đúng lá số và đọc đúng một người là hai chuyện.",
    lead: "Một bộ quy tắc có thể dựng cùng đồ hình từ cùng đầu vào. Việc diễn giải đồ hình cho một cuộc sống cụ thể vẫn cần sự thận trọng và đối chiếu.",
    diagram: "process", action: "Xem cách chúng tôi làm", href: "/phuong-phap",
    panels: [
      { title: "Phần có thể kiểm tra", body: "Ngày giờ đầu vào, bước quy đổi và cách an sao có thể được đối chiếu bằng cùng một bộ quy tắc." },
      { title: "Phần cần diễn giải", body: "Một tổ hợp dấu hiệu có thể gợi nhiều cách đọc. Câu văn nghe đúng không đủ chứng minh một dự báo." },
      { title: "Phần thuộc về bạn", body: "Lá số có thể giúp bạn đặt câu hỏi tốt hơn. Quyết định trong đời thực cần cả thông tin, hoàn cảnh và người có chuyên môn khi phù hợp." },
    ],
  },
  "knowledge.tu-vi.schools": {
    eyebrow: "Các trường phái Tử Vi", headline: "Cùng một đồ hình, nhiều lối đọc.",
    lead: "Các truyền thống Tử Vi có thể nhấn vào những mối liên hệ khác nhau. Hiểu điểm khác ấy giúp bạn đọc một lời luận giải trong đúng bối cảnh của phương pháp đã dùng.",
    diagram: "archive", action: "Xem nguồn tri thức", href: "/nguon-tri-thuc",
    panels: [
      { title: "Hỏi về quy tắc", body: "Trước khi so hai kết quả, hãy kiểm tra ngày giờ đầu vào và bộ quy tắc an sao được công bố." },
      { title: "Hỏi về cách đọc", body: "Một trường phái có thể ưu tiên tổ hợp sao, trường phái khác chú ý các biến hóa. Đó là khác biệt trong trọng tâm diễn giải." },
      { title: "Đừng gộp bừa", body: "Không nên tuyên bố một engine kết hợp mọi trường phái khi chưa chỉ ra quy tắc và phần mềm thực sự áp dụng." },
    ],
  },
  "calculator.tu-vi": {
    eyebrow: "Lập lá số Tử Vi", headline: "Một lá số bắt đầu từ đúng giờ sinh.",
    lead: "Nhập ngày, giờ và nơi sinh để dựng đồ hình 12 cung. Từ đó, bạn có thể đọc từng nhận định và xem căn cứ đứng sau lời giải thích.",
    diagram: "chart", action: "Lập lá số miễn phí", href: "/tao-la-so/tu-vi",
    panels: [
      { title: "Bắt đầu từ dữ liệu sinh", body: "Ngày và giờ sinh là đầu vào để an cung, an sao. Nếu chưa biết giờ chính xác, bạn có thể bắt đầu với lá số tạm tính và cập nhật sau." },
      { title: "Nhìn toàn bộ trước khi đọc từng phần", body: "Đồ hình cho thấy 12 cung cùng các mối liên hệ. Một cung chỉ có ý nghĩa khi được đặt trong cả lá số." },
      { title: "Đọc lời giải thích có điều kiện", body: "Tử Vi giúp bạn nhận diện một cách diễn giải. Những lựa chọn về công việc, tình cảm và cuộc sống vẫn thuộc về bạn." },
    ],
  },
  "commercial.tu-vi": {
    eyebrow: "Luận giải Tử Vi", headline: "Đọc sâu hơn điều lá số gợi ra.",
    lead: "Bắt đầu với đồ hình miễn phí, xem cách một nhận định được giải thích rồi chọn phần luận giải phù hợp với điều bạn đang quan tâm.",
    diagram: "process", action: "Xem báo cáo mẫu", href: "/bao-cao-mau/tu-vi",
    panels: [
      { title: "Xem trước cách đọc", body: "Báo cáo mẫu cho bạn thấy cấu trúc bài luận giải, cách trình bày nhận định và phần căn cứ trước khi quyết định mở báo cáo của mình." },
      { title: "Đi từ câu hỏi của bạn", body: "Có người muốn hiểu bản mệnh, có người đang cân nhắc công việc hay quan hệ. Hãy bắt đầu từ phần hữu ích nhất với bạn." },
      { title: "Biết rõ trước khi mở", body: "Số Lá cần dùng và phạm vi nội dung phải được hiển thị trong bước xác nhận. Bạn có thể lập lá số trước khi chọn mua." },
    ],
  },
  "commercial.tu-vi.identity": {
    eyebrow: "Tổng quan bản mệnh", headline: "Bắt đầu từ điều lá số nói về bạn.",
    lead: "Bài đọc tổng quan đi từ cung Mệnh, cung Thân và các dấu hiệu biến hóa. Bạn được xem cách nhận định hình thành, cùng giới hạn của từng cách diễn giải.",
    diagram: "chart", action: "Đọc thử báo cáo mẫu", href: "/bao-cao-mau/tu-vi",
    panels: [
      { title: "Ba điểm để bắt đầu", body: "Bản tổng quan hiện tập trung vào cung Mệnh, cung Thân và các dấu hiệu biến hóa. Các chủ đề khác cần sản phẩm và căn cứ riêng." },
      { title: "Căn cứ đi cùng lời đọc", body: "Một nhận định có ích khi bạn biết dấu hiệu nào dẫn đến nó và điều gì cần đối chiếu với trải nghiệm thực tế." },
      { title: "Xem mẫu trước khi mở", body: "Bản mẫu cho thấy phạm vi và cách trình bày. Giá thực trả cùng quyền lợi, nếu có, được xác nhận trong luồng mở báo cáo." },
    ],
  },
  "methodology.root": {
    eyebrow: "Phương pháp", headline: "Từ dữ liệu sinh đến một lời giải thích.",
    lead: "Lá Số Việt tách quy tắc lập đồ hình, nguồn tham chiếu và phần diễn giải. Bạn có thể lần theo từng bước, kể cả nơi chúng tôi cần nói rõ giới hạn.",
    diagram: "process", action: "Xem phương pháp Tử Vi", href: "/phuong-phap/tu-vi",
    panels: [
      { title: "Dữ liệu đầu vào", body: "Ngày và giờ sinh quyết định các bước tính. Khi thiếu giờ, kết quả được đánh dấu tạm tính thay vì âm thầm coi là chính xác." },
      { title: "Quy tắc an sao", body: "Đồ hình được dựng theo quy tắc đã khai báo. Phần tính toán và phần viết lời diễn giải là hai công việc khác nhau." },
      { title: "Đọc có căn cứ", body: "Một nhận định cần được đặt cạnh dấu hiệu từ lá số và giới hạn của phương pháp, để bạn tự đối chiếu với cuộc sống." },
    ],
  },
  "methodology.tu-vi": {
    eyebrow: "Phương pháp Tử Vi", headline: "Đồ hình được dựng như thế nào?",
    lead: "Từ lịch và giờ sinh, quy tắc an sao đặt các cung và sao vào đồ hình. Phần luận giải bắt đầu sau bước tính ấy, với bối cảnh và điều kiện cần xem xét.",
    diagram: "chart", action: "Lập lá số của bạn", href: "/tu-vi",
    panels: [
      { title: "Chọn đúng đầu vào", body: "Ngày âm, ngày dương và giờ sinh cần được hiểu đúng trước khi an sao. Nếu chưa chắc giờ, hãy dùng trạng thái tạm tính." },
      { title: "Đọc mối quan hệ", body: "Không tách một ngôi sao hay một cung khỏi phần còn lại. Bối cảnh của cung và các liên hệ xung quanh mới tạo nên câu hỏi đáng xem." },
      { title: "Giữ chỗ cho sự không chắc chắn", body: "Một đồ hình được tính theo quy tắc không đồng nghĩa mọi cách diễn giải đều đúng với mỗi người." },
    ],
  },
  "methodology.ai-evidence": {
    eyebrow: "AI và căn cứ", headline: "Lời giải thích phải có điểm tựa.",
    lead: "AI hỗ trợ diễn đạt các mối liên hệ thành tiếng Việt dễ đọc. Bạn nên nhìn thấy dữ liệu và quy tắc đứng sau nhận định, cùng phần còn chưa thể kết luận.",
    diagram: "process", action: "Xem nguồn tri thức", href: "/nguon-tri-thuc",
    panels: [
      { title: "Tính trước, viết sau", body: "Dữ liệu lá số được tính theo quy tắc; AI hỗ trợ trình bày kết quả ấy. Một câu văn trôi chảy không tự làm kết luận trở nên chắc chắn." },
      { title: "Đối chiếu căn cứ", body: "Khi đọc một nhận định, hãy tìm phần giải thích dấu hiệu đã dùng và điều kiện có thể khiến cách đọc thay đổi." },
      { title: "Bạn là người quyết định", body: "Bản luận giải có thể gợi một góc nhìn. Những quyết định quan trọng vẫn cần hoàn cảnh thực tế và sự cân nhắc của bạn." },
    ],
  },
  "trust.sources": {
    eyebrow: "Nguồn tri thức", headline: "Biết một lời giải thích đến từ đâu.",
    lead: "Nguồn tài liệu, quy tắc tính và cách diễn giải có vai trò khác nhau. Danh mục này giúp bạn phân biệt phần nào có thể đối chiếu và phần nào vẫn cần thận trọng.",
    diagram: "archive", action: "Tìm hiểu phương pháp", href: "/phuong-phap",
    panels: [
      { title: "Quy tắc", body: "Các bước dựng lá số và an sao cần được mô tả bằng quy tắc cụ thể, có thể kiểm tra trên cùng đầu vào." },
      { title: "Tài liệu tham khảo", body: "Một nguồn chỉ nên được nêu tên khi xác nhận được ấn bản và phạm vi sử dụng. Cùng một thuật ngữ có thể được các trường phái đọc khác nhau." },
      { title: "Diễn giải", body: "Nguồn giúp đặt nền cho cách đọc. Chúng không biến một dự báo cá nhân thành sự thật chắc chắn." },
    ],
  },
  "support.faq": {
    eyebrow: "Câu hỏi thường gặp", headline: "Một vài điều nên biết trước khi bắt đầu.",
    lead: "Từ giờ sinh, phần miễn phí đến cách dùng Lá: hãy tìm câu trả lời ngắn gọn và đi tiếp từ đúng bước của mình.",
    diagram: "archive", action: "Liên hệ Lá Số Việt", href: "/lien-he",
    panels: [
      { title: "Chưa nhớ giờ sinh?", body: "Bạn có thể bắt đầu bằng lá số tạm tính. Những nhận định phụ thuộc vào giờ sinh cần được đọc thận trọng và cập nhật khi có thông tin chính xác hơn." },
      { title: "Lập lá số có mất phí?", body: "Bạn có thể bắt đầu với đồ hình và phần xem trước miễn phí. Các phần luận giải trả bằng Lá phải hiển thị phạm vi và số Lá trước khi xác nhận mở." },
      { title: "Cần hỗ trợ giao dịch?", body: "Giữ mã đơn và thời điểm chuyển khoản, rồi gửi qua kênh liên hệ chính thức để được đối soát. Không gửi mật khẩu tài khoản." },
    ],
  },
  "support.contact": {
    eyebrow: "Liên hệ", headline: "Có điều gì khiến bạn chưa thể tiếp tục?",
    lead: "Hãy chọn đúng thông tin cần gửi để Lá Số Việt có thể kiểm tra giao dịch, tài khoản hoặc nội dung bạn đang đọc.",
    diagram: "archive", action: "Gửi email hỗ trợ", href: "mailto:lasoviet.net@gmail.com",
    panels: [
      { title: "Giao dịch Lá", body: "Gửi mã đơn hoặc mã giao dịch, thời điểm chuyển khoản và email tài khoản. Không gửi mật khẩu hay mã xác thực." },
      { title: "Tài khoản và lá số", body: "Mô tả bước bạn đang làm, đường dẫn trang và thông báo lỗi nếu có. Chỉ chia sẻ dữ liệu sinh khi thật sự cần để kiểm tra." },
      { title: "Góp ý nội dung", body: "Gửi link trang, đoạn cần xem lại và lý do bạn muốn đối chiếu. Chúng tôi sẽ dùng thông tin ấy để kiểm tra căn cứ." },
    ],
  },
  "calculator.horoscope-forecast": {
    eyebrow: "Cung hoàng đạo", headline: "Đọc dự báo chung với đúng giới hạn của nó.",
    lead: "Dự báo theo cung hoàng đạo nói về một nhóm người rất rộng. Nó có thể là một lời gợi mở, nhưng không thay cho việc đọc bản đồ cá nhân hay một quyết định của bạn.",
    diagram: "calendar", action: "Khám phá công cụ đang hoạt động", href: "/tu-vi",
    panels: [
      { title: "Một nhãn, nhiều cuộc sống", body: "Cùng một cung vẫn có những ngày sinh, hoàn cảnh và lựa chọn khác nhau. Đừng coi một câu dự báo chung là điều sẽ xảy ra với riêng mình." },
      { title: "Nên đọc như thế nào?", body: "Hãy dùng một câu gợi mở để tự hỏi điều gì đang cần chú ý; bỏ qua những kết luận thiếu căn cứ hoặc khiến bạn lo lắng vô ích." },
      { title: "Muốn một góc nhìn riêng hơn?", body: "Lá số Tử Vi đang hoạt động cho phép bạn bắt đầu từ dữ liệu sinh của mình và xem cách đồ hình được lập." },
    ],
  },
};

function ChartDiagram() {
  const palaces = ["Mệnh", "Phụ mẫu", "Phúc đức", "Điền trạch", "Quan lộc", "Nô bộc", "Thiên di", "Tật ách", "Tài bạch", "Tử tức", "Phu thê", "Huynh đệ"];
  return <div className="editorial-chart" aria-label="Sơ đồ minh họa 12 cung của lá số Tử Vi">
    {palaces.map((palace, index) => <span key={palace} className={index === 0 ? "editorial-chart__focus" : ""}>{palace}</span>)}
    <div className="editorial-chart__center"><small>ĐỒ HÌNH</small><strong>12 cung</strong><small>Một cấu trúc, nhiều mối liên hệ</small></div>
  </div>;
}

function EditorialDiagram({ kind, locale }: { kind: Story["diagram"]; locale: Locale }) {
  if (kind === "chart") return <ChartDiagram />;
  if (kind === "process") return <div className="editorial-process" aria-label={locale === "vi" ? "Từ dữ liệu đến lời giải thích" : "From input to explanation"}>
    {(locale === "vi" ? ["Dữ liệu sinh", "Đồ hình", "Căn cứ", "Diễn giải"] : ["Birth data", "Chart", "Sources", "Reading"]).map((label, index) => <div key={label}><span>0{index + 1}</span><strong>{label}</strong></div>)}
  </div>;
  if (kind === "calendar") return <div className="editorial-calendar" aria-hidden="true"><span>THỜI GIAN</span><strong>12</strong><span>Góc nhìn chung cần được đọc có điều kiện</span></div>;
  return <div className="editorial-archive" aria-hidden="true"><Image src="/images/lasoviet/tang-thu-chu-de-luan-giai-sau-background-homepage.webp" alt="" fill sizes="(max-width: 800px) 100vw, 40vw" /><span>01 / 03</span><span>TRA CỨU · ĐỐI CHIẾU · GIỚI HẠN</span><div className="editorial-archive__seal">LSV</div></div>;
}

export function StaticEditorialPage({ routeId, locale }: { routeId: string; locale: Locale }) {
  const story = STATIC_STORIES[routeId];
  if (!story || locale !== "vi") return null;
  const group = routeId.startsWith("knowledge.") ? "article" : routeId.startsWith("commercial.") ? "commerce" : "guide";
  const chapterHeading = group === "article" ? "Từng lớp, một cách hiểu rõ hơn." : group === "commerce" ? "Xem rõ trước khi đi sâu." : "Bắt đầu từ điều bạn cần biết.";
  return <main className={`static-editorial static-editorial--${group}`}>
    <div className="static-editorial__hero container">
      <div className="static-editorial__intro"><p className="static-editorial__eyebrow"><LsvIcon name={diagramIcons[story.diagram]} size={20} />{story.eyebrow}</p><h1>{story.headline}</h1><p>{story.lead}</p>
        <Link className="static-editorial__action" href={story.href}>{story.action}<LsvIcon name="ui-external" size={18} /></Link>
      </div>
      <EditorialDiagram kind={story.diagram} locale={locale} />
    </div>
    <section className="static-editorial__body container" aria-label="Đọc thêm">
      <div className="static-editorial__chapter"><span>01 — 03</span><h2>{chapterHeading}</h2></div>
      <div className="static-editorial__panels">{story.panels.map((panel, index) => <article key={panel.title} className="static-editorial__panel"><span>0{index + 1}</span><h3>{panel.title}</h3><p>{panel.body}</p></article>)}</div>
    </section>
    {supportingGraphics[routeId] ? <figure className="static-editorial__graphic container">
      <div className="static-editorial__graphic-art">
        <Image className="static-editorial__graphic-dark" src={`/graphics/lasoviet/v1/${supportingGraphics[routeId].file}-lasoviet-dark.svg`} alt="" width={720} height={432} />
        <Image className="static-editorial__graphic-light" src={`/graphics/lasoviet/v1/${supportingGraphics[routeId].file}-lasoviet-light.svg`} alt="" width={720} height={432} />
      </div>
      <figcaption><span>GÓC NHÌN TRỰC QUAN</span><p>{supportingGraphics[routeId].caption}</p></figcaption>
    </figure> : null}
    {routeId === "commercial.tu-vi.identity" ? <section className="static-editorial__price container" aria-labelledby="identity-price-title">
      <div><p className="static-editorial__eyebrow">PHẠM VI BÀI ĐỌC</p><h2 id="identity-price-title">Tổng quan bản mệnh</h2><p>Ba nhóm căn cứ đang được triển khai: cung Mệnh, cung Thân và biến hóa. Xem mẫu trước khi lập lá số của bạn.</p></div>
      <div className="static-editorial__price-value"><strong>Rõ trước khi mở.</strong><span>Giá và quyền lợi áp dụng cho hồ sơ của bạn được hiển thị ở bước xác nhận. Không trừ Lá khi bạn chỉ xem trước.</span></div>
    </section> : null}
    <section className="static-editorial__ending container"><p className="static-editorial__eyebrow">BƯỚC TIẾP THEO</p><h2>Đọc để hiểu. Rồi tự mình chọn.</h2><Link href={story.href}>{story.action}<LsvIcon name="ui-arrow" size={18} /></Link></section>
  </main>;
}
