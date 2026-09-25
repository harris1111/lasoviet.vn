/**
 * Fifteen reader quotes supplied verbatim by the founder on 2026-09-25 (docs: Claude Design handoff, 03-TESTIMONIAL-COPY-BANK).
 * Cards show a contiguous `excerpt` of `quote`; the full text opens in a dialog. Never edit a quote to fit a card.
 */
export type TestimonialGroup = "self" | "work" | "method" | "reading";

export type Testimonial = {
  id: string;
  name: string;
  city: string;
  /** Name, age, city and occupation exactly as supplied. */
  header: string;
  group: TestimonialGroup;
  excerpt: string;
  quote: string;
};

export const TESTIMONIAL_GROUPS: readonly TestimonialGroup[] = ["self", "work", "method", "reading"];

/** Card order on the homepage: one featured card, then three beside it. */
export const FEATURED_TESTIMONIAL = "13";
export const SECONDARY_TESTIMONIALS: readonly string[] = ["12", "09", "01"];

/** Editorial labels (not reader words) for the four opening cards. */
export const TESTIMONIAL_LABELS: Readonly<Record<string, string>> = {
  "13": "label13",
  "12": "label12",
  "09": "label09",
  "01": "label01",
};

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    "id": "01",
    "name": "Hoàng Tuấn Anh",
    "city": "Hà Nội",
    "header": "Hoàng Tuấn Anh (26 tuổi – Hà Nội, Kỹ sư phần mềm)",
    "group": "method",
    "excerpt": "Không hề phán bừa mà có luận điểm logic, chỉ rõ nguyên nhân – hệ quả.",
    "quote": "Mình dân tech nên rất dị ứng với kiểu bói toán mơ hồ hay các trang web chỉ gom chữ từ mấy cuốn sách cũ ghép lại. Khi đọc bản luận giải của Lá Số Việt, điều làm mình thuyết phục là tư duy hệ thống: mở đầu có bức tranh tổng thể phân tích cấu trúc Mệnh – Thân rất mạch lạc, sau đó mổ xẻ chi tiết từng tam hợp, từng bộ sao tương tác ra sao. Không hề phán bừa mà có luận điểm logic, chỉ rõ nguyên nhân – hệ quả. Đây là nền tảng số hóa tử vi chỉn chu nhất mình từng thấy ở Việt Nam."
  },
  {
    "id": "02",
    "name": "Nguyễn Mai Lan",
    "city": "TP. Hồ Chí Minh",
    "header": "Nguyễn Mai Lan (38 tuổi – TP. Hồ Chí Minh, Quản lý Marketing)",
    "group": "self",
    "excerpt": "Trước đây mình từng lấy lá số trên vài trang lớn khác, nhưng kết quả đọc y như từ điển: sao này nghĩa là gì, cung kia nghĩa là gì, các đoạn mâu thuẫn chan chát.",
    "quote": "Trước đây mình từng lấy lá số trên vài trang lớn khác, nhưng kết quả đọc y như từ điển: sao này nghĩa là gì, cung kia nghĩa là gì, các đoạn mâu thuẫn chan chát. Sang Lá Số Việt mới thấy sự khác biệt một trời một vực. Bản luận giải xâu chuỗi được toàn bộ bức tranh cuộc đời mình, từ điểm nghẽn tính cách cho tới chiến lược đường dài trong sự nghiệp. Đọc sâu vào từng cung thấy chi tiết đến bất ngờ, cảm giác như một bản báo cáo định vị bản thân thực thụ chứ không phải giải trí vu vơ."
  },
  {
    "id": "03",
    "name": "Trần Đình Vinh",
    "city": "Đà Nẵng",
    "header": "Trần Đình Vinh (54 tuổi – Đà Nẵng, Kinh doanh vật liệu xây dựng)",
    "group": "reading",
    "excerpt": "Mấy chục năm nay tôi từng ngồi với không ít thầy tử vi, người phán thế này người dọa thế nọ khiến tâm lý bất an.",
    "quote": "Mấy chục năm nay tôi từng ngồi với không ít thầy tử vi, người phán thế này người dọa thế nọ khiến tâm lý bất an. Vừa rồi con trai mở cho xem kết quả trên Lá Số Việt, tôi thật sự bất ngờ. Bài luận viết rất đĩnh đạc, khách quan, chỉ rõ vận trình thịnh suy theo từng đại vận 10 năm một cách thấu đáo. Cái hay là không hù dọa tam tai hay sao xấu, mà hướng dẫn cách ứng biến, tu dưỡng. Vừa có cái nhìn đại cục bao quát, vừa cặn kẽ từng tiểu tiết."
  },
  {
    "id": "04",
    "name": "Lê Thu Hà",
    "city": "Cần Thơ",
    "header": "Lê Thu Hà (22 tuổi – Cần Thơ, Sinh viên năm cuối)",
    "group": "work",
    "excerpt": "Em từng thử paste ngày giờ sinh vào ChatGPT lẫn mấy web tử vi miễn phí, nhưng câu trả lời toàn kiểu chung chung ai đọc cũng thấy 'hơi giống mình'.",
    "quote": "Em từng thử paste ngày giờ sinh vào ChatGPT lẫn mấy web tử vi miễn phí, nhưng câu trả lời toàn kiểu chung chung ai đọc cũng thấy 'hơi giống mình'. Đến khi đọc bản luận giải của Lá Số Việt thì nổi da gà thật sự! Trang phân tích cực kỳ chi tiết cung Quan Lộc và Tài Bạch, chỉ rõ môi trường làm việc nào phù hợp với cá tính của em và cả những cạm bẫy dễ vấp phải khi mới ra trường. Cách dùng từ hiện đại, văn minh, dễ hiểu chứ không dùng thuật ngữ cổ làm người trẻ bị ngợp."
  },
  {
    "id": "05",
    "name": "Vũ Đức Trọng",
    "city": "Hải Phòng",
    "header": "Vũ Đức Trọng (42 tuổi – Hải Phòng, Trưởng phòng Logistics)",
    "group": "method",
    "excerpt": "Tôi đánh giá cao cách Lá Số Việt giải bài toán tương tác sao.",
    "quote": "Tôi đánh giá cao cách Lá Số Việt giải bài toán tương tác sao. Ở các web khác, cứ thấy Địa Không, Địa Kiếp hay Hóa Kỵ là phán xấu tệ hại. Nhưng Lá Số Việt phân tích theo thế đứng tổng quan: đắc hãm ra sao, hội tụ những phụ tinh nào, chuyển hóa nghịch cảnh thành động lực thế nào. Chi tiết từng năm hạn rơi trúng các biến cố tôi đã trải qua 5 năm trước tới 80–90%. Luận giải sâu sắc, đáng tin cậy hơn hẳn mặt bằng chung."
  },
  {
    "id": "06",
    "name": "Phạm Thanh Thảo",
    "city": "Đà Lạt",
    "header": "Phạm Thanh Thảo (31 tuổi – Đà Lạt, Chủ homestay & F&B)",
    "group": "self",
    "excerpt": "Đọc phần luận giải cung Phúc Đức và Phu Thê của Lá Số Việt mà mình ngồi lặng đi mất một lúc vì quá thấu hiểu nội tâm.",
    "quote": "Đọc phần luận giải cung Phúc Đức và Phu Thê của Lá Số Việt mà mình ngồi lặng đi mất một lúc vì quá thấu hiểu nội tâm. Các phương pháp truyền thống hay phán một câu cụt lủn về đường tình duyên làm người ta hoang mang, còn ở đây tác giả luận giải bóc tách từ căn nguyên tâm lý, mẫu hình tương tác giữa hai người cho đến cách hóa giải xung đột. Chi tiết nhưng vẫn giữ được sự tinh tế, hướng người đọc về sự chữa lành và hoàn thiện bản thân."
  },
  {
    "id": "07",
    "name": "Đặng Quang Huy",
    "city": "Bình Dương",
    "header": "Đặng Quang Huy (35 tuổi – Dĩ An, Bình Dương, Quản trị chất lượng - QA)",
    "group": "method",
    "excerpt": "Tính tôi thực tế, làm gì cũng cần số liệu và bằng chứng.",
    "quote": "Tính tôi thực tế, làm gì cũng cần số liệu và bằng chứng. Xem các trang khác thường cụt hứng vì thông tin rời rạc, cóp nhặt. Lá Số Việt làm tôi ấn tượng ở bố cục phân tầng: từ tổng quát khí chất bản mệnh, năng lực tiềm ẩn, cho đến chi tiết từng năm, từng quý cần đề phòng điều gì về pháp lý, sức khỏe hay tài chính. Độ nhất quán từ đầu đến cuối rất cao, không bị 'tiền hậu bất nhất' như các trang dịch tự động."
  },
  {
    "id": "08",
    "name": "Ngô Văn Hùng",
    "city": "Nam Định",
    "header": "Ngô Văn Hùng (62 tuổi – Nam Định, Cựu giáo viên Văn)",
    "group": "method",
    "excerpt": "Tôi có sở thích nghiên cứu kinh dịch và thuật số từ thời trẻ.",
    "quote": "Tôi có sở thích nghiên cứu kinh dịch và thuật số từ thời trẻ. Thú thật ban đầu tôi không kỳ vọng nhiều vào máy tính giải tử vi. Nhưng khi đọc bản luận giải Lá Số Việt của chính mình, tôi phải thay đổi định kiến. Ngôn ngữ trang trọng, học thuật chuẩn mực, kế thừa đúng tinh thần Nam phái và chính tông Á Đông mà không hề pha tạp dị đoan. Sự kết hợp giữa tổng thể cách cục và chi tiết biến hóa của các phụ tinh rất chuẩn xác."
  },
  {
    "id": "09",
    "name": "Bùi Phương Linh",
    "city": "Nha Trang",
    "header": "Bùi Phương Linh (29 tuổi – Nha Trang, Freelancer UI/UX Designer)",
    "group": "reading",
    "excerpt": "Không phải một sớ chữ hỗn độn dồn dập, mà mở đầu bằng bản tóm tắt định vị bản thân sắc sảo, sau đó dẫn dắt người đọc 'zoom' sâu vào từng cung số một cách lớp lang.",
    "quote": "Điểm vượt trội nhất của Lá Số Việt là trải nghiệm đọc cực kỳ mượt mà. Không phải một sớ chữ hỗn độn dồn dập, mà mở đầu bằng bản tóm tắt định vị bản thân sắc sảo, sau đó dẫn dắt người đọc 'zoom' sâu vào từng cung số một cách lớp lang. Từng chi tiết nhỏ như sao nhỏ tọa thủ, vòng Tràng Sinh hay Tuần Triệt đều được đặt vào đúng ngữ cảnh của cung chứ không giải thích cơ học. Vượt xa hoàn toàn mấy app xem số mì ăn liền hiện nay."
  },
  {
    "id": "10",
    "name": "Trịnh Quốc Bảo",
    "city": "Hạ Long",
    "header": "Trịnh Quốc Bảo (45 tuổi – Hạ Long, Quảng Ninh, Nhà đầu tư tài chính)",
    "group": "work",
    "excerpt": "Trong kinh doanh, tôi quan tâm nhất là chu kỳ chu chuyển của dòng tiền và thời vận.",
    "quote": "Trong kinh doanh, tôi quan tâm nhất là chu kỳ chu chuyển của dòng tiền và thời vận. Đa số các trang tử vi hiện nay giải thích cung Tài Bạch rất ngây ngô kiểu 'sau này giàu/nghèo'. Lá Số Việt thì khác hẳn: luận giải chi tiết cấu trúc tài chính, cách kiếm tiền phù hợp (tích lũy bền vững hay đầu cơ rủi ro), và quan trọng nhất là cảnh báo rõ đại vận nào nên mở rộng, năm nào cần thu mình giữ vốn. Chi tiết và mang tính ứng dụng thực chiến cực kỳ cao."
  },
  {
    "id": "11",
    "name": "Trần Minh Khoa",
    "city": "TP. Huế",
    "header": "Trần Minh Khoa (24 tuổi – TP. Huế, Chuyên viên sáng tạo nội dung)",
    "group": "reading",
    "excerpt": "Mỗi lần tò mò vào mấy hội nhóm nhờ xem tử vi là y như rằng nhận được vài ba dòng phán ngắn ngủn, câu view hoặc hù dọa bán vật phẩm phong thủy.",
    "quote": "Mỗi lần tò mò vào mấy hội nhóm nhờ xem tử vi là y như rằng nhận được vài ba dòng phán ngắn ngủn, câu view hoặc hù dọa bán vật phẩm phong thủy. Trải nghiệm trên Lá Số Việt làm em thở phào nhẹ nhõm: bản luận giải chi tiết dày dặn, phân tích đa chiều từ tổng quan xu hướng cuộc sống đến chi tiết từng giai đoạn phát triển cá nhân. Giọng văn văn minh, khách quan, mang tính khai sáng hơn là bói toán may rủi."
  },
  {
    "id": "12",
    "name": "Đỗ Mỹ Hạnh",
    "city": "Vũng Tàu",
    "header": "Đỗ Mỹ Hạnh (36 tuổi – Vũng Tàu, Chuyên viên hoạch định tài chính)",
    "group": "work",
    "excerpt": "Lá Số Việt luận giải được sự giằng co và hỗ trợ giữa các cung với nhau, giải thích vì sao công việc tốt nhưng gia đạo lại trắc trở, hoặc vì sao thời trẻ lận đận mà trung vận lại bứt phá.",
    "quote": "Cái hay nhất của Lá Số Việt là tính liên kết cung. Tử vi vốn dĩ 'tam phương tứ chính', 'nhị hợp', 'xung chiếu', nhưng hầu như các trang mạng khác chỉ đọc đúng 1 cung đơn lẻ. Lá Số Việt luận giải được sự giằng co và hỗ trợ giữa các cung với nhau, giải thích vì sao công việc tốt nhưng gia đạo lại trắc trở, hoặc vì sao thời trẻ lận đận mà trung vận lại bứt phá. Chi tiết đến từng nguyên cớ, đọc mà tâm phục khẩu phục."
  },
  {
    "id": "13",
    "name": "Lê Thị Kim Oanh",
    "city": "Thái Nguyên",
    "header": "Lê Thị Kim Oanh (58 tuổi – Thái Nguyên, Hưu trí & kinh doanh gia đình)",
    "group": "self",
    "excerpt": "Tôi lấy lá số cho cả hai đứa con trên Lá Số Việt. Đọc bản luận giải thấy nhẹ lòng hẳn ra.",
    "quote": "Tôi lấy lá số cho cả hai đứa con trên Lá Số Việt. Đọc bản luận giải thấy nhẹ lòng hẳn ra. Không còn nỗi lo lắng mơ hồ vì những lời phán ác ý của các thầy bên ngoài, trang này phân tích rõ điểm mạnh để phát huy, điểm yếu của từng đứa để uốn nắn từ sớm. Tổng quan thì sáng tỏ đường hướng, chi tiết thì sâu sát từng nét tính cách của con cái trong nhà. Rất đáng đồng tiền bát gạo."
  },
  {
    "id": "14",
    "name": "Phan Anh Dũng",
    "city": "TP. Vinh",
    "header": "Phan Anh Dũng (33 tuổi – TP. Vinh, Nghệ An, Kỹ sư giải pháp CNTT)",
    "group": "method",
    "excerpt": "Tôi đã thử nghiệm gần như toàn bộ các công cụ luận giải tử vi ứng dụng AI hay thuật toán hiện có trên thị trường.",
    "quote": "Tôi đã thử nghiệm gần như toàn bộ các công cụ luận giải tử vi ứng dụng AI hay thuật toán hiện có trên thị trường. Điểm yếu chung của họ là ảo giác thông tin và thiếu chiều sâu học thuật. Lá Số Việt giải quyết triệt để vấn đề này: kiến trúc luận giải phân tầng rõ ràng, kết nối chặt chẽ giữa trục Mệnh – Thân – Phúc, mổ xẻ chi tiết từng hóa khí (Khoa, Quyền, Lộc, Kỵ) trong từng hoàn cảnh cụ thể. Độ sắc nét và nhất quán vượt trội hoàn toàn."
  },
  {
    "id": "15",
    "name": "Võ Thùy Trang",
    "city": "Quy Nhơn",
    "header": "Võ Thùy Trang (40 tuổi – Quy Nhơn, Bình Định, Luật sư tư vấn doanh nghiệp)",
    "group": "method",
    "excerpt": "Nghề luật rèn cho tôi thói quen đọc tài liệu với con mắt phản biện khắt khe.",
    "quote": "Nghề luật rèn cho tôi thói quen đọc tài liệu với con mắt phản biện khắt khe. Bản luận giải của Lá Số Việt vượt qua được sự khó tính đó của tôi nhờ tính mạch lạc và lập luận chặt chẽ. Từ đánh giá đại cục về cốt cách con người cho đến chi tiết hạn từng năm đều ăn khớp, không hề thấy dấu hiệu cóp nhặt chắp vá hay mâu thuẫn nội dung. Đây thực sự là một bước tiến vượt bậc của thuật số Việt trên không gian số."
  }
];

export function testimonialById(id: string): Testimonial | undefined {
  return TESTIMONIALS.find((item) => item.id === id);
}

/** Two initials for the monogram: last two words of the name. */
export function testimonialMonogram(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0))
    .join("");
}
