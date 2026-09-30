# Bản Hiệu Đính Nội Dung Trang Chủ Lá Số Việt (Homepage Copy Revision)

> **Ngày lập:** 2026-09-28  
> **Tài liệu tham chiếu gốc:** `/Users/admin/Downloads/lasoviet-homepage-live-copywriter-handoff-2026-09-28.md`  
> **Skill áp dụng:** `/Users/admin/_Projects/icon-os/ai/skills/viet sang tao.md` (Creative Writing & Wordplay)  
> **Trạng thái:** Bản đề xuất hoàn chỉnh sẵn sàng cho biên tập và tích hợp mã nguồn.

---

## 1. Danh Sách Các File Cần Chỉnh Sửa Trong Mã Nguồn (Code Paths)

Khi bạn muốn áp dụng trực tiếp vào mã nguồn dự án qua Antigravity IDE, hãy mở các file sau:

1. **File từ điển nội dung tiếng Việt của Homepage (Quan trọng nhất):**  
   [`apps/web/messages/vi/homepage-v3.json`](file:///Users/admin/_Projects/lasoviet.vn/apps/web/messages/vi/homepage-v3.json)
2. **File từ điển nội dung tiếng Anh tương ứng (Giữ key parity):**  
   [`apps/web/messages/en/homepage-v3.json`](file:///Users/admin/_Projects/lasoviet.vn/apps/web/messages/en/homepage-v3.json)
3. **File quản lý danh sách trích dẫn Testimonials:**  
   [`apps/web/src/features/homepage-v3/homepage-v3-testimonials.ts`](file:///Users/admin/_Projects/lasoviet.vn/apps/web/src/features/homepage-v3/homepage-v3-testimonials.ts)
4. **File SEO Metadata trang chủ (Title, Meta Description, OpenGraph):**  
   [`content/public/vi/pages/home.mdx`](file:///Users/admin/_Projects/lasoviet.vn/content/public/vi/pages/home.mdx)
5. **Component Header & Footer (Chứa một số label dùng chung):**  
   - Header: [`apps/web/src/components/site-header.tsx`](file:///Users/admin/_Projects/lasoviet.vn/apps/web/src/components/site-header.tsx)
   - Footer: [`apps/web/src/components/site-footer.tsx`](file:///Users/admin/_Projects/lasoviet.vn/apps/web/src/components/site-footer.tsx)

---

## 2. Chi Tiết Nội Dung Revise Toàn Bộ Key Paths

### A. Meta Tags & Header / Footer

| Vị trí / Thuộc tính | Nội dung Hiện tại | Nội dung Đề xuất (Revise) | Ghi chú & Kỹ thuật |
| :--- | :--- | :--- | :--- |
| `<title>` | `Lá Số Việt \| Lập lá số. Hiểu vận mệnh.` | **Lá Số Việt \| Soi rõ căn duyên. Vững bước thời vận.** | *Staccato & Đối ý:* Dứt khoát, định vị chiều sâu. |
| `meta.description` | `Lập lá số Tử Vi miễn phí, luận giải có căn cứ rõ ràng — nền tảng khai phóng bản mệnh cho người Việt, nói có sách mách có chứng.` | **Lập lá số Tử Vi chuẩn xác, thấu tỏ căn cơ và nhịp thời vận bằng lời luận giải sáng rõ, thuần Việt. Một khoảng lặng soi mình, nói có sách mách có chứng.** | Bỏ từ "nền tảng khai phóng", thay bằng "khoảng lặng soi mình", ấm áp tự nhiên. |
| Header CTA | `Lập lá số Tử Vi` | **Lập lá số ngay** | Gọn gàng, tăng tỷ lệ click trên thanh điều hướng. |
| Footer Positioning | `Lập lá số Tử Vi và luận giải bằng tiếng Việt dễ hiểu.` | **Lập lá số Tử Vi và luận giải bằng tiếng Việt sáng tỏ, có căn cứ.** | Nhất quán với tinh thần thương hiệu. |

---

### B. Section: Hero & Wizard Form (`homepage-v3.hero` & `homepage-v3.heroChart`)

*Đường dẫn JSON:* `homepage-v3.hero.*`

```json
{
  "h1a": "Lập lá số.",
  "h1b": "Hiểu vận mệnh.",
  "sub": "Ngã rẽ sự nghiệp, nút thắt tình cảm hay khoảng lặng nội tâm: Mọi câu trả lời đều bắt đầu từ tấm bản đồ của chính bạn.",
  "formLabel": "Khởi tạo lá số của bạn",
  "dateLabel": "Ngày tháng năm sinh",
  "calendarLabel": "Loại lịch",
  "solar": "Dương lịch",
  "lunar": "Âm lịch",
  "day": "Ngày",
  "month": "Tháng",
  "year": "Năm",
  "leap": "Tháng nhuận",
  "timeLabel": "Khung giờ sinh",
  "modeExact": "Biết rõ giờ sinh",
  "modeBranch": "Nhớ khoảng giờ (Canh giờ)",
  "hourSr": "Giờ sinh, từ 00 đến 23",
  "minuteSr": "Phút sinh, từ 00 đến 59",
  "branchSr": "Khoảng giờ sinh",
  "branchPlaceholder": "Chọn canh giờ sinh",
  "unknown": "Tôi chưa nhớ rõ giờ sinh",
  "genderLabel": "Giới tính",
  "male": "Nam",
  "female": "Nữ",
  "nameLabel": "Tên người xem",
  "nameOptional": "(để ghi dấu trên lá số)",
  "namePlaceholder": "Ví dụ: An Nhiên",
  "submit": "Khai mở lá số riêng của bạn",
  "errors": {
    "dateEmpty": "Vui lòng nhập đủ ngày, tháng và năm sinh (năm gồm 4 chữ số).",
    "dateImpossible": "Ngày này không có trên lịch thực tế. Bạn hãy kiểm tra lại nhé.",
    "dateFuture": "Ngày sinh không thể ở tương lai.",
    "dateRange": "Năm sinh hợp lệ từ năm 1920 đến nay.",
    "time": "Nhập giờ từ 00 đến 23 và phút từ 00 đến 59.",
    "branch": "Vui lòng chọn một khoảng giờ sinh phù hợp.",
    "gender": "Vui lòng chọn giới tính Nam hoặc Nữ.",
    "storage": "Trình duyệt chưa cho phép lưu trữ. Bạn hãy bật lưu trữ trang web rồi thử lại nhé."
  }
}
```

*Đường dẫn JSON:* `homepage-v3.heroChart.*`

```json
{
  "chartAria": "Đồ hình lá số của bạn",
  "birthHour": "giờ sinh",
  "lunar": "(âm lịch)",
  "lunarLeap": "(âm lịch, nhuận)",
  "hourOf": "giờ {name}",
  "open": "Xem đồ hình lá số đang mở ra",
  "close": "Thu gọn đồ hình lá số"
}
```

---

### C. Section: Story — Câu Hỏi Đêm Muộn (`homepage-v3.story`)

*Đường dẫn JSON:* `homepage-v3.story.*`

```json
{
  "title": "Có những câu hỏi cứ khiến ta trăn trở mãi không thôi...",
  "body": "Chúng ghé lại vào những đêm khuya mất ngủ, chen vào dòng người tan tầm vội vã, hay dấy lên ngay giữa một buổi họp tưởng chừng bình yên. Giữa những ngổn ngang đó, điều bạn cần không phải một lời phán xét hay hứa hẹn viển vông—mà là một góc nhìn đủ sâu sắc để thấy rõ căn nguyên và tự tin bước tiếp.",
  "q1": "Bao giờ thì thời vận mỉm cười với sự nỗ lực của mình?",
  "q2": "Vì sao mình cứ lặp đi lặp lại một sai lầm trong chuyện tình cảm?",
  "q3": "Công việc đang làm liệu có phù hợp với mình không?",
  "q4": "Mình thực sự sinh ra để làm gì giữa cuộc đời này?"
}
```

---

### D. Section: Ticker Region (`homepage-v3.ticker`)

*Đường dẫn JSON:* `homepage-v3.ticker.*`

```json
{
  "label": "Từng mảnh ghép cuộc đời đang chờ bạn mở lối",
  "a1": "Đâu là mảnh đất dụng võ cho tài năng của bạn?",
  "a2": "Nút thắt tình duyên: Bắt đầu từ đâu để hóa giải?",
  "a3": "Căn nguyên tính cách và khí chất gốc",
  "a4": "Thuận thời thì tiến, nghịch cảnh liệu nên lui?",
  "b1": "Đường công danh & nền tảng sự nghiệp",
  "b2": "Nhân duyên & bến đỗ cuộc đời",
  "b3": "Dòng chảy tiền tài & cách giữ của bền lâu",
  "b4": "Chọn đúng trăn trở để tìm lời giải đáp ↗"
}
```

---

### E. Section: Explore & 12 Cung Số (`homepage-v3.explore` & `homepage-v3.palaces`)

*Đường dẫn JSON:* `homepage-v3.explore.*`

```json
{
  "eyebrow": "Khám phá 12 cung số",
  "title": "Một đồ hình lá số. Mười hai nếp đời người.",
  "lead": "Đừng để những thuật ngữ xa lạ làm bạn băn khoăn. Bắt đầu từ cung Mệnh để thấu suốt bản tính, rồi mở sang Quan Lộc, Tài Bạch hay Phu Thê. Bạn sẽ thấy từng sự kiện trong đời chưa bao giờ diễn ra rời rạc—chúng đan cài và nâng đỡ lẫn nhau.",
  "shortcutsLabel": "Những cung vị thường được mở xem trước",
  "mobileHint": "Chạm vào lưới để mở 8 cung còn lại.",
  "chartLabel": "12 cung số",
  "palaceAria": "Cung {name}, chi {branch}",
  "reading": "Đang xem",
  "palacePrefix": "Cung",
  "trine": "Tam hợp",
  "opposite": "Xung chiếu (Đối cung)",
  "cycles": "Bên cạnh 12 cung tĩnh tại là nhịp chảy của thời gian: mười năm một đại vận đổi thay, một năm một lưu niên thử thách.",
  "cta": "Lập lá số để soi chiếu đời mình",
  "sample": "Xem thử một lá số mẫu hoàn chỉnh →"
}
```

*Đường dẫn JSON:* `homepage-v3.palaces.*`

```json
{
  "menh": {
    "name": "Mệnh",
    "title": "Căn cốt & Khí chất",
    "desc": "Nền tảng tính cách, điểm tựa tinh thần và cách bạn phản ứng khi cuộc sống chệch hướng. Mọi cung số khác đều bắt rễ từ nơi này."
  },
  "huynh": {
    "name": "Huynh Đệ",
    "title": "Anh em & Tri kỷ cùng thời",
    "desc": "Mối liên kết ruột thịt và cách những người cùng thế hệ nâng đỡ, đồng hành hay thử thách lòng kiên nhẫn của bạn."
  },
  "phuthe": {
    "name": "Phu Thê",
    "title": "Duyên nợ & Bến đỗ lứa đôi",
    "desc": "Mẫu người khiến trái tim bạn muốn dừng chân, cùng những va đập khác biệt đòi hỏi sự lắng nghe và bao dung để đi đường dài."
  },
  "tutuc": {
    "name": "Tử Tức",
    "title": "Con cái & Sự tiếp nối",
    "desc": "Duyên phận với thế hệ sau, cách bạn trao truyền yêu thương và gieo mầm hy vọng cho tương lai."
  },
  "taibach": {
    "name": "Tài Bạch",
    "title": "Tiền bạc & Dòng chảy tài lộc",
    "desc": "Bạn kiếm tiền nhờ tài hoa hay cơ hội? Vì sao có lúc tiền vào như nước, có khi lại trôi tuột ngoài tầm tay?"
  },
  "tatach": {
    "name": "Tật Ách",
    "title": "Thân thể & Điềm báo sức khỏe",
    "desc": "Nơi cơ thể âm thầm gửi tín hiệu để bạn biết khi nào nên dừng lại dưỡng sức. Giữ gìn thân tâm luôn là gốc rễ của vạn sự."
  },
  "thiendi": {
    "name": "Thiên Di",
    "title": "Ra ngoài & Chạm ngõ cuộc đời",
    "desc": "Khí sắc và bản lĩnh của bạn khi bước ra khỏi vùng an toàn: một môi trường mới, một thành phố xa, hay những chuyến đi định hình số phận."
  },
  "nobo": {
    "name": "Nô Bộc",
    "title": "Bạn bè, đồng sự & Đối tác",
    "desc": "Ai sẽ kề vai sát cánh khi gian khó, và mối quan hệ nào đang âm thầm bào mòn năng lượng sống của bạn?"
  },
  "quanloc": {
    "name": "Quan Lộc",
    "title": "Sự nghiệp & Vị thế xã hội",
    "desc": "Đâu là môi trường để bạn tỏa sáng nhất: sự ổn định khuôn thước, vị trí lãnh đạo uy quyền hay tự do bứt phá kinh doanh?"
  },
  "dientrach": {
    "name": "Điền Trạch",
    "title": "Đất đai, nhà cửa & Chốn an cư",
    "desc": "Duyên tích lũy sản nghiệp, không gian sống nuôi dưỡng tinh thần và cảm giác thật sự được 'thuộc về một mái nhà'."
  },
  "phucduc": {
    "name": "Phúc Đức",
    "title": "Gốc rễ phước lành & Sự an yên",
    "desc": "Nền tảng tâm thức, sự thanh thản nội tại và mạch ngầm gia đạo che chở bạn đi qua những biến cố cuộc đời."
  },
  "phumau": {
    "name": "Phụ Mẫu",
    "title": "Cha mẹ & Nếp nhà thuở nhỏ",
    "desc": "Sợi dây liên kết với đấng sinh thành cùng những bài học ấu thơ vô hình theo bạn suốt cả hành trình trưởng thành."
  }
}
```

---

### F. Section: Needs & Disciplines (`homepage-v3.needs`)

*Đường dẫn JSON:* `homepage-v3.needs.*`

```json
{
  "title": "Hôm nay, lòng bạn đang ngổn ngang điều gì nhất?",
  "lead": "Một quyết định chuyển hướng dở dang. Một mối quan hệ buông không đành, giữ chẳng xong. Hay đơn giản là chính bạn, sau những năm tháng miệt mài mà bỗng thấy chông chênh.",
  "groupLabel": "Điều bạn muốn thấu tỏ",
  "items": {
    "self": {
      "title": "Thấu hiểu chính mình",
      "question": "Mình thực sự mạnh ở đâu? Vì sao trước những khúc ngoặt quan trọng, mình cứ chần chừ bỏ lỡ?",
      "path": "Soi chiếu từ cung Mệnh và cung Thân để thấy rõ căn cơ, điểm tựa nội tại và những nút thắt tâm lý bạn chưa từng đặt tên.",
      "cta": "Khám phá căn cốt bản thân",
      "c1": "Mệnh",
      "c2": "Thân"
    },
    "work": {
      "title": "Sự nghiệp & Tiền tài",
      "question": "Có nên nghỉ việc để bắt đầu lại? Giai đoạn này nên dốc lực tiến công hay thu mình chờ thời?",
      "path": "Quan Lộc chỉ rõ cách làm việc và môi trường phát huy; Tài Bạch soi sáng dòng tiền; Đại vận 10 năm chỉ rõ nhịp thịnh suy để đi đúng thời điểm.",
      "cta": "Xem thời vận công danh",
      "secondary": "Hoặc tìm hiểu Bát Tự",
      "c1": "Quan Lộc",
      "c2": "Tài Bạch",
      "c3": "Đại vận"
    },
    "love": {
      "title": "Chuyện tình cảm",
      "question": "Vì sao cứ va vào cùng một mẫu hình làm mình đau lòng? Người như thế nào mới thực sự là bến đỗ bình yên?",
      "path": "Đọc cung Phu Thê phối chiếu cùng cung Mệnh để bóc tách mẫu người bạn dễ rung động và cách hòa giải xung đột từ gốc rễ.",
      "cta": "Soi tỏ duyên tình",
      "secondary": "Hoặc tìm hiểu Chiêm Tinh",
      "c1": "Phu Thê",
      "c2": "Mệnh"
    },
    "decision": {
      "title": "Một quyết định trước mắt",
      "question": "Đứng trước một ngã ba đường: Ký hợp đồng này, nhận lời chuyến đi này, hay nên lùi lại một bước?",
      "path": "Khi cần lời khuyên cho một thời điểm cụ thể, trí tuệ dịch lý giúp bạn nhận diện thời thế: nên quyết đoán tiến hay điềm tĩnh thủ.",
      "cta": "Tham vấn Kinh Dịch",
      "c1": "Kinh Dịch"
    }
  },
  "lensTitle": "Mỗi môn phái, một góc nhìn sáng rõ.",
  "lensLead": "Tử Vi giúp bạn đọc trọn bức tranh đời mình. Khi muốn mở rộng góc nhìn trước những sự việc đặc thù, hãy khám phá các bộ môn cổ học tinh hoa.",
  "disciplines": {
    "tuvi": {
      "name": "Tử Vi Đẩu Số",
      "desc": "Bản đồ 12 cung và hơn 100 tinh tú, giải mã toàn diện tính cách, nhân duyên và từng bước ngoặt đời người.",
      "cta": "Lập lá số ngay"
    },
    "batu": {
      "name": "Bát Tự (Tứ Trụ)",
      "desc": "Bốn trụ Năm - Tháng - Ngày - Giờ, luận giải sự cân bằng âm dương và chu kỳ ngũ hành thịnh suy.",
      "cta": "Tìm hiểu Bát Tự"
    },
    "chiemtinh": {
      "name": "Chiêm Tinh Học",
      "desc": "Vị trí các vì tinh tú thời khắc chào đời qua 12 cung hoàng đạo, soi tỏ thế giới nội tâm và tiềm năng vô thức.",
      "cta": "Tìm hiểu Chiêm Tinh"
    },
    "kinhdich": {
      "name": "Kinh Dịch",
      "desc": "Trí tuệ thời vị qua 64 quẻ dịch, soi sáng lẽ biến dịch và gợi mở ứng xử trước từng tình huống cụ thể.",
      "cta": "Tìm hiểu Kinh Dịch"
    },
    "thansohoc": {
      "name": "Thần Số Học",
      "desc": "Khám phá tần số rung động của họ tên và ngày sinh cùng nhịp điệu của các chu kỳ năm cá nhân.",
      "cta": "Tìm hiểu Thần Số Học"
    }
  }
}
```

---

### G. Section: Compare (`homepage-v3.compare`)

*Đường dẫn JSON:* `homepage-v3.compare.*`

```json
{
  "title": "Tốc độ hay cuộc trò chuyện? Điều gì sẽ thực sự ở lại cùng bạn?",
  "lead": "Trang tử vi phổ thông cho sự nhanh chóng. Hỏi đáp AI cho sự linh hoạt. Gặp thầy cho sự lắng nghe. Lá Số Việt trao bạn một bản đồ vận mệnh chuẩn xác, có căn cứ cổ thư và đồng hành trọn đời.",
  "tableLabel": "Một điểm đáng chọn và các giới hạn thực tế của mỗi cách tìm câu trả lời",
  "groupLabel": "Cách bạn đang cân nhắc",
  "colLsv": "Lá Số Việt",
  "colWeb": "Trang tử vi phổ thông",
  "colAi": "Hỏi đáp AI",
  "colThay": "Gặp thầy tử vi",
  "tabLsv": "Lá Số Việt",
  "tabWeb": "Trang tử vi",
  "tabAi": "Hỏi đáp AI",
  "tabThay": "Gặp thầy",
  "cardTitle": "{name} có gì đáng để bạn lựa chọn?",
  "fixLabel": "Tại Lá Số Việt:",
  "ctaDesktop": "Khai mở lá số của tôi →",
  "cta": "Bắt đầu với lá số của tôi →",
  "rows": {
    "strength": {
      "k": "Điểm đáng chọn nhất",
      "lsv": "Bản đồ vận mệnh chuẩn xác, cá nhân hóa sâu sắc và lưu trữ đồng hành trọn đời.",
      "web": "Tra cứu miễn phí, trả kết quả lá số thô và bài đọc tự động tức thì.",
      "ai": "Trò chuyện linh hoạt 24/7 bằng lời văn tự nhiên, phản hồi ngay tức thì.",
      "thay": "Đối thoại 1-1 trực tiếp, được lắng nghe và an ủi cảm xúc tại chỗ."
    },
    "own": {
      "k": "Độ cá nhân hóa",
      "lsv": "An sao chuẩn từng phút sinh; bóc tách đúng trăn trở bạn đang bận tâm.",
      "web": "Văn mẫu đóng sẵn; hai người cùng sao nhận bài đọc giống hệt nhau.",
      "ai": "Phụ thuộc câu lệnh tự nhập; dễ bị định kiến người dùng dẫn dắt.",
      "thay": "Phụ thuộc lớn vào kinh nghiệm, tâm trạng và cảm quan cá nhân của thầy."
    },
    "basis": {
      "k": "Căn cứ học thuật",
      "lsv": "Minh bạch tuyệt đối. Mọi luận giải đều gắn đường dẫn đối chiếu sao và cung.",
      "web": "Dữ liệu đại trà chưa kiểm chứng; buông lời phán mơ hồ gây hoang hoảng.",
      "ai": "Dễ bị 'ảo giác' an sai vị trí sao nhưng vẫn trả lời rất tự tin.",
      "thay": "Truyền miệng thiếu cơ sở logic chuẩn hóa; khó kiểm chứng tính đúng sai."
    },
    "links": {
      "k": "Nhìn nhận toàn diện",
      "lsv": "Đồ hình tương tác trực quan: chạm một cung để thấy trọn vẹn Tam hợp, Xung chiếu.",
      "web": "Nội dung cắt vụn; các cung phán mâu thuẫn buộc bạn tự chắp vá.",
      "ai": "Mỗi lần hỏi là một lát cắt rời rạc, mất đi tính nhất quán toàn cục.",
      "thay": "Lời phán thoảng qua, khó hình dung rõ bức tranh tổng thể mười hai cung."
    },
    "return": {
      "k": "Tính nhất quán & Khách quan",
      "lsv": "Khách quan & Nhất quán tuyệt đối; chuẩn hóa dữ liệu, loại bỏ hoàn toàn cảm tính.",
      "web": "Thông tin thiếu ổn định; các bài tra cứu mâu thuẫn nhau giữa các lần đọc.",
      "ai": "Thiếu tính nhất quán; mỗi lượt hỏi lại cho ra một kết quả mâu thuẫn.",
      "thay": "Thiếu tính đồng nhất; cùng lá số nhưng mỗi thầy phán một kiểu khác nhau."
    },
    "depth": {
      "k": "Chi phí & Trải nghiệm",
      "lsv": "Xem miễn phí nền tảng; chủ động mở sâu đúng phần bạn cần với chi phí minh bạch.",
      "web": "Giao diện tràn ngập quảng cáo; bài viết đóng gói cứng nhắc, thừa thãi.",
      "ai": "Tốn phí thuê bao tháng; người dùng phải tự gánh rủi ro tự kiểm chứng.",
      "thay": "Chi phí đắt đỏ từ trăm nghìn đến tiền triệu; khó đặt lịch để hỏi thêm."
    }
  }
}
```

---

### H. Section: Testimonials Khung Dẫn (`homepage-v3.testimonials`)

*Đường dẫn JSON:* `homepage-v3.testimonials.*`

```json
{
  "eyebrow": "Lời hồi đáp chân thực",
  "titleA": "Điều đọng lại",
  "titleB": "sau một lần soi tỏ.",
  "lead": "Mỗi người tìm đến Lá Số Việt mang theo một trăn trở riêng. Nhưng rời đi, họ đều mang theo một điểm tựa an lòng.",
  "readFull": "Đọc trọn vẹn ↗",
  "readFullAria": "Đọc trọn vẹn chia sẻ của {name}",
  "more": "Xem thêm chia sẻ từ người đọc ↓",
  "less": "Thu gọn chia sẻ ↑",
  "start": "Bắt đầu với lá số của bạn ↗",
  "filterLabel": "Lọc chia sẻ theo chủ đề",
  "filterAll": "Tất cả",
  "group": {
    "self": "Thấu hiểu chính mình",
    "work": "Thời vận & Sự nghiệp",
    "method": "Lập luận có căn cứ",
    "reading": "Cảm nhận sau khi đọc"
  },
  "prev": "Chia sẻ trước",
  "next": "Chia sẻ tiếp theo",
  "close": "Đóng",
  "dialogEyebrow": "Lời người đọc chia sẻ",
  "pause": "Tạm dừng",
  "play": "Tiếp tục",
  "rotationLabel": "Chia sẻ từ người đọc, tự động chuyển sau vài giây"
}
```

---

### I. Section: USP (`homepage-v3.usp`)

*Đường dẫn JSON:* `homepage-v3.usp.*`

```json
{
  "title": "Càng nhìn sâu, càng thấy rõ bóng hình mình trong đó.",
  "lead": "Một lá số chân chính không bao giờ kết thúc ở vài lời phán xét nông cạn. Nó là hành trình bóc tách từng lớp căn duyên, hiểu từng mối dây ràng buộc, để rồi mỗi khi chông chênh, bạn luôn có một chốn trở về soi chiếu.",
  "n1": {
    "title": "Kế thừa tinh hoa cổ thư.",
    "body": "Mỗi lời luận giải đều được đúc kết từ thuật số chính tông phương Đông, hệ thống hóa lớp lang để từng câu chữ đều có gốc có ngọn, tuyệt đối không suy diễn hàm hồ."
  },
  "n2": {
    "title": "Khởi phát từ chính bạn.",
    "body": "Thời khắc bạn cất tiếng khóc chào đời dựng nên đồ hình số phận. Nhưng chính nỗi bận tâm của bạn ở hiện tại mới là chiếc chìa khóa mở lối cho câu chuyện."
  },
  "n3": {
    "title": "Mạch ngầm liên kết.",
    "body": "Chạm vào một cung số để thấy thế tam hợp, nhị hợp và xung chiếu cùng lúc bừng sáng. Mười hai cung không bao giờ cô lập—chúng cùng kể một câu chuyện về đời bạn.",
    "link": "Chạm thử vào lá số →"
  },
  "n4": {
    "title": "Thong dong theo nhịp riêng.",
    "body": "Sự nghiệp, tình cảm hay vận hạn một năm trước mắt: bạn làm chủ hoàn toàn hành trình khám phá, thấy rõ từng giá trị và chi phí trước khi quyết định mở đọc."
  }
}
```

---

### J. Section: Value & Bậc Thang Chi Phí (`homepage-v3.value`)

*Đường dẫn JSON:* `homepage-v3.value.*`

```json
{
  "title": "Thấu hiểu trước một phần. Đi sâu khi lòng đã tỏ.",
  "lead": "Bạn hoàn toàn có thể khởi đầu bằng việc lập lá số và đọc những nhận định cốt lõi nhất về mình mà không tốn một đồng. Khi thấy hữu ích và muốn giữ lại cho riêng mình, bạn đăng nhập lưu trữ. Những tầng luận giải chuyên sâu chỉ mở ra khi bạn thực sự cần, bằng Lá, với chi phí minh bạch đến từng con số.",
  "s1": {
    "title": "Bước 1: Trải nghiệm trọn vẹn đồ hình",
    "body": "Xem đầy đủ lá số 12 cung an sao chuẩn xác cùng 2 nhận định trọng tâm về bản mệnh. Hoàn toàn miễn phí, không cần đăng ký tài khoản."
  },
  "s2": {
    "title": "Bước 2: Ghi dấu & Lưu giữ",
    "body": "Đăng nhập một chạm để lưu lại lá số trọn đời, mở khóa bản tóm lược vận khí tổng quan và những lưu ý quan trọng trong năm."
  },
  "s3": {
    "title": "Bước 3: Mở khóa theo nhu cầu riêng",
    "body": "Dùng Lá để mở đúng phần bạn muốn thấu tỏ: Đại vận 10 năm, thời vận từng năm hay chuyên sâu từng cung. Số Lá và số tiền hiện rõ ràng trước khi bạn bấm xác nhận."
  },
  "packsTitle": "Gói nạp Lá",
  "packsNote": "Mỗi gói hiển thị song song số Lá và số tiền VNĐ. Quét mã VietQR tự động trong vài giây.",
  "packBonus": "{base} Lá + {bonus} Lá tặng thêm"
}
```

---

### K. Section: FAQ (`homepage-v3.faq`)

*Đường dẫn JSON:* `homepage-v3.faq.*`

```json
{
  "title": "Những điều bạn có thể muốn hỏi trước khi khởi tạo.",
  "more": "Xem thêm câu hỏi thường gặp →",
  "items": {
    "q1": {
      "q": "Tôi không nhớ chính xác giờ sinh thì có lập lá số được không?",
      "a": "Bạn vẫn có thể bắt đầu. Hãy chọn 'Tôi chưa nhớ rõ giờ sinh'. Hệ thống vẫn sẽ lập đồ hình cơ bản và chỉ rõ cho bạn thấy giờ sinh quyết định đến những cung vị nào, để bạn có thể hỏi lại người thân và hoàn thiện lá số sau mà không mất dữ liệu đã tạo."
    },
    "q2": {
      "q": "Xem miễn phí thì tôi đọc được những gì?",
      "a": "Bạn được xem trọn vẹn đồ hình lá số 12 cung an sao chuẩn xác theo thiên văn, tra cứu ý nghĩa các sao khi chạm vào cung, và nhận ngay 2 nhận định đúc kết quan trọng về bản mệnh. Bạn không phải trả bất kỳ chi phí nào và cũng không cần nhập thông tin thẻ."
    },
    "q3": {
      "q": "\"Lá\" trong hệ thống dùng để làm gì và tính phí thế nào?",
      "a": "Lá là đơn vị để bạn tùy ý mở đọc các phần luận giải chuyên sâu (như phân tích đại vận, dự báo chi tiết năm hạn hay đối chiếu cung phối). Mỗi gói Lá đều hiển thị song song số tiền VNĐ tương ứng rõ ràng, thanh toán qua chuyển khoản VietQR tự động trong vài giây. Chúng tôi tuyệt đối không tạo tỷ giá ảo hay thu phí duy trì ngầm."
    },
    "q4": {
      "q": "Sau này muốn xem lại lá số của mình thì tìm ở đâu?",
      "a": "Chỉ cần đăng nhập bằng tài khoản cá nhân, lá số và toàn bộ các phần luận giải bạn đã mở sẽ được lưu giữ vĩnh viễn trong mục Tài khoản. Bạn có thể mở lại trên điện thoại hay máy tính bất cứ khi nào cần chiêm nghiệm."
    },
    "q5": {
      "q": "Thông tin ngày giờ sinh của tôi có được bảo mật không?",
      "a": "Lá Số Việt coi sự riêng tư của bạn là nguyên tắc tối thượng. Dữ liệu ngày sinh của người dùng ẩn danh sẽ tự động xóa sau 24 giờ. Chúng tôi cam kết không chia sẻ dữ liệu với bất kỳ bên thứ ba nào và bạn luôn có quyền bấm xóa vĩnh viễn hồ sơ của mình bất kỳ lúc nào.",
      "linkLabel": "Chính sách bảo mật"
    }
  }
}
```

---

### L. Section: About & Lời Kết (`homepage-v3.about`)

*Đường dẫn JSON:* `homepage-v3.about.*`

```json
{
  "title": "Đơn giản hóa tinh hoa huyền học Đông Tây, đưa tri thức cổ học đúc kết ngàn năm đến gần hơn với người Việt.",
  "body": "Lá Số Việt hội tụ tinh hoa các bộ môn thuật số kim cổ—từ Tử Vi, Bát Tự đến Chiêm Tinh, Kinh Dịch và Thần Số Học. Bằng ngôn ngữ tiếng Việt thuần túy, dễ hiểu và có căn cứ minh bạch, Lá Số Việt giúp bạn thấu hiểu sâu sắc chính mình, nhìn rõ những cột mốc vận hạn để luôn có sự chuẩn bị chủ động và vững vàng nhất cho cuộc sống.",
  "link": "Tìm hiểu thêm về Lá Số Việt →",
  "ctaTitle": "Chặng đường phía trước của bạn đã sẵn sàng được soi tỏ.",
  "cta": "Khai mở lá số của bạn ngay"
}
```
