// Prototype data for doc-bao-cao-tuong-tac.html (FD-104).
// Chart: the real report in the founder's screenshots (2026-09-27).
// Main stars, tứ hóa, Mệnh/Thân, cục and decadal cycles are consistent with
// that chart (Quý Dậu 1993, nam, Mệnh Bính Thìn, Thổ ngũ cục, đại vận nghịch).
// Minor stars in palaces the screenshots do not show are illustrative.
// hoa: loc | quyen | khoa | ky
window.LSV = window.LSV || {};

LSV.CHART = {
  meta: { year: "Quý Dậu (1993)", gender: "Nam", menh: "Bính Thìn", cuc: "Thổ ngũ cục", than: "Thiên Di (Tuất)", view: "2026 Bính Ngọ" },
  order: ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"],
  pos: { "Tỵ":[1,1],"Ngọ":[1,2],"Mùi":[1,3],"Thân":[1,4],"Thìn":[2,1],"Dậu":[2,4],"Mão":[3,1],"Tuất":[3,4],"Dần":[4,1],"Sửu":[4,2],"Tý":[4,3],"Hợi":[4,4] },
  palaces: {
    "Thìn": { can:"Bính", name:"Mệnh",       id:"menh",      menh:true, main:[["Liêm Trinh","Bình"],["Thiên Phủ","Miếu"]], aux:["Âm Sát","Bệnh Phù","Thiên Sát","Long Đức"] },
    "Mão":  { can:"Ất",   name:"Huynh Đệ",   id:"huynh-de",  main:[], aux:["Thiên Khôi","Tam Thai","Thiên Hư","Thiên Nguyệt","Đại Hao","Tai Sát"] },
    "Dần":  { can:"Giáp", name:"Phu Thê",    id:"phu-the",   main:[["Phá Quân","Đắc","loc"]], aux:["Địa Kiếp","Phục Binh","Kiếp Sát","Thiên Hình","Tiểu Hao","Nguyệt Đức"] },
    "Sửu":  { can:"Ất",   name:"Tử Tức",     id:"tu-tuc",    main:[], aux:["Kình Dương (Miếu)","Linh Tinh (Đắc)","Long Trì","Phượng Các","Thiên Tài","Hoa Cái","Niên Giải","Quan Phủ","Quan Phù"] },
    "Tý":   { can:"Giáp", name:"Tài Bạch",   id:"tai-bach",  main:[["Tử Vi","Bình"]], aux:["Lộc Tồn","Bác Sỹ","Thiên Phúc","Thai Phụ"] },
    "Hợi":  { can:"Quý",  name:"Tật Ách",    id:"tat-ach",   main:[["Thiên Cơ","Bình"]], aux:["Đà La","Thiên Mã","Lực Sỹ","Thiên Diêu"] },
    "Tuất": { can:"Nhâm", name:"Thiên Di",   id:"thien-di",  than:true, main:[["Thất Sát","Miếu"]], aux:["Thiên Không","Thanh Long","Phan Án","Hối Khí"] },
    "Dậu":  { can:"Tân",  name:"Nô Bộc",     id:"no-boc",    main:[["Thái Dương","Bình"],["Thiên Lương","Đắc"]], aux:["Văn Khúc","Thiên Thương","Tấu Thư","Tuế Phá"] },
    "Thân": { can:"Canh", name:"Quan Lộc",   id:"quan-loc",  main:[["Vũ Khúc","Đắc"],["Thiên Tướng","Miếu"]], aux:["Tả Phù","Thiên Hỷ","Tướng Quân","Quốc Ấn"] },
    "Mùi":  { can:"Kỷ",   name:"Điền Trạch", id:"dien-trach",main:[["Thiên Đồng","Hãm"],["Cự Môn","Hãm","quyen"]], aux:["Hữu Bật","Thiên Quý","Phi Liêm","Điếu Khách"] },
    "Ngọ":  { can:"Mậu",  name:"Phúc Đức",   id:"phuc-duc",  main:[["Tham Lang","Vượng","ky"]], aux:["Hỏa Tinh","Văn Xương","Thiên Đức","Hỷ Thần"] },
    "Tỵ":   { can:"Đinh", name:"Phụ Mẫu",    id:"phu-mau",   main:[["Thái Âm","Hãm","khoa"]], aux:["Thiên Việt","Ân Quang","Thiên Giải","Bạch Hổ"] }
  },
  // Engine decadal list (iztro decadalList), Thổ ngũ cục, nghịch hành from Mệnh.
  // Mỗi chặng có một đoạn tóm tắt ngắn. Riêng chặng đang sống có phần
  // luận giải đầy đủ ở dưới bài.
  decadal: [
    { age:[5,14],  years:[1997,2006], br:"Thìn",
      teaser:"Chặng đi qua chính cung Mệnh. Đây là quãng hình thành nếp sống: học cách giữ lời, giữ đồ, giữ trật tự cho việc của mình. Những thói quen hình thành ở đây theo bạn rất lâu." },
    { age:[15,24], years:[2007,2016], br:"Mão",
      teaser:"Chặng đi qua cung Huynh Đệ, nơi quan hệ bạn bè và anh em nổi lên. Đây là quãng bạn học cách làm việc cùng người khác, và cũng là quãng dễ va chạm nhất về chuyện tiền chung." },
    { age:[25,34], years:[2017,2026], br:"Dần",
      teaser:"Chặng đang sống. Trọng tâm là người đồng hành: bạn đời, đối tác, người cùng làm. Cơ hội đến qua họ, và vướng mắc cũng vậy.", full:true },
    { age:[35,44], years:[2027,2036], br:"Sửu",
      teaser:"Chặng sắp tới, đi qua cung Tử Tức. Con cái, người cấp dưới và những thứ bạn gây dựng sẽ chiếm phần lớn tâm trí. Bộ sao ở đây mạnh và cứng, nên đối thoại quan trọng hơn ra lệnh." },
    { age:[45,54], years:[2037,2046], br:"Tý",
      teaser:"Chặng đi qua cung Tài Bạch, nơi có Tử Vi và Lộc Tồn. Đây thường là quãng tài chính ổn định nhất, đổi lại trách nhiệm cũng nặng nhất." },
    { age:[55,64], years:[2047,2056], br:"Hợi",
      teaser:"Chặng đi qua cung Tật Ách. Sức khoẻ và nhịp sống trở thành việc phải chăm, không còn là thứ để sau. Đi lại nhiều thì cần chuẩn bị kỹ hơn trước." },
    { age:[65,74], years:[2057,2066], br:"Tuất",
      teaser:"Chặng đi qua cung Thiên Di, cũng là cung Thân của bạn. Quãng này bạn vẫn hướng ra ngoài: gặp gỡ, đi lại, giữ vai trò trong cộng đồng." },
    { age:[75,84], years:[2067,2076], br:"Dậu",
      teaser:"Chặng đi qua cung Nô Bộc. Bạn bè, người quanh mình và những mối quan hệ giữ được lâu là chỗ dựa chính của quãng này." }
  ],
  currentDecadal: 2,
  targetYear: 2026,
  annualBr: "Ngọ"
};

LSV.HOA_LABEL = { loc:"Lộc", quyen:"Quyền", khoa:"Khoa", ky:"Kỵ" };

// Wave-2 portrait block: generated last, from section conclusions + facts.
LSV.PORTRAIT = {
  headline: "Bạn là người giữ nền vững, và có một phần rất quyết đoán mỗi khi bước ra ngoài.",
  strengths: [
    { t:"Làm việc có quy củ, giữ lời và giữ được tiền", b:"Liêm Trinh, Thiên Phủ (Miếu) ở Mệnh", go:"tong-quan" },
    { t:"Ra ngoài thì quyết nhanh, chịu được áp lực", b:"Thất Sát (Miếu) ở cung Thân", go:"truc-menh-than" },
    { t:"Có lộc từ những lần dám làm khác đi", b:"Phá Quân Hóa Lộc", go:"tu-hoa" }
  ],
  watchouts: [
    { t:"Lo xa, dễ do dự trước quyết định lớn", b:"Âm Sát, Bệnh Phù ở Mệnh", go:"tong-quan" },
    { t:"Tiền chung với người thân dễ thành vướng", b:"Đại Hao, Tai Sát ở Huynh Đệ", go:"p-huynh-de" },
    { t:"Muốn nhiều thứ một lúc thì dễ kiệt sức", b:"Tham Lang Hóa Kỵ", go:"tu-hoa" }
  ],
  year: "Năm cuối của chặng đại vận 25-34 ở cung Phu Thê. Chuyện gắn bó và hợp tác là trọng tâm; từ 2027 bạn sang chặng mới ở cung Tử Tức."
};

// Chapters. kind: std | hoa | palaces | themes | sw | decadal | annual | sens | acts
LSV.CHAPTERS = [
  { id:"tong-quan", kind:"std", toc:"Tổng quan lá số", title:"Tổng quan lá số", br:"Thìn",
    facts:"Cung Mệnh tại <b>Bính Thìn</b>. Thân cư <b>Thiên Di</b> tại Tuất.",
    stars:[["Liêm Trinh","Bình"],["Thiên Phủ","Miếu"],"Âm Sát","Bệnh Phù","Thiên Sát","Long Đức"],
    conclusion:"Bạn là người xây nền: làm chắc trước, mở rộng sau, và hiếm khi đặt cược thứ mình đã có.",
    points:[
      "Nền tính cách của bạn là giữ và quản: giữ lời, giữ tiền, giữ trật tự cho việc mình làm.",
      "Cái giá phải trả là chậm quyết, nhất là khi thông tin chưa đủ rõ.",
      "Nhưng khi bước ra khỏi vùng quen, bạn lại là người quyết nhanh và dám nhận việc khó."
    ],
    detail:[
      "Lá số của bạn mở đầu bằng một cặp sao mà người xưa coi là bộ đôi giữ nhà. Ngôi thứ nhất là Thiên Phủ, sao của kho lẫm, và nó đóng ở vị trí sáng nhất trong lá số bạn. Thiên Phủ khiến bạn có phản xạ tích lũy và dự phòng, rất không quen với cảm giác tay trắng. Ngôi thứ hai là Liêm Trinh, sao của phép tắc, khiến bạn coi trọng đúng quy trình, đúng cam kết, và khó chịu khi thấy ai đó làm ăn tùy tiện. Một người mang cả kho lẫn luật trong tính cách nền thì hiếm khi làm gì bốc đồng. Bạn cân nhắc lâu, nhưng đã nói là làm.",
      "Điều đó hiện ra rõ nhất ở cách bạn nhận một việc mới. Bạn không hỏi có hay không, bạn hỏi làm thế nào. Ai chịu trách nhiệm phần nào, tiền lấy từ đâu, hỏng thì lùi về đâu. Người làm cùng bạn thường thấy yên tâm, vì việc bạn làm ít khi phải làm lại. Đổi lại, bạn hay ôm việc: thấy chỗ nào chưa chắc, phản xạ đầu tiên là tự làm cho chắc chứ không phải giao đi rồi chấp nhận rủi ro. Cái được là chất lượng, cái mất là sức của chính bạn.",
      "Cũng chính sự cẩn thận ấy, khi thông tin chưa đủ thì bạn dừng lại. Mà có những cơ hội chỉ mở trong vài ngày và không đợi đến lúc mọi thứ rõ ràng. Hai sao đứng cùng cung Mệnh nói đúng chuyện này. Âm Sát ứng vào những điều khó chịu bạn giữ trong lòng thay vì nói thẳng. Bệnh Phù thì nhắc rằng cơ thể sẽ lên tiếng khi bạn kéo dài quá tải, và nó thường lên tiếng qua giấc ngủ trước tiên. Xin nói rõ để bạn khỏi lo: cả hai sao này không báo bệnh tật hay tai họa gì. Chúng chỉ mô tả một thói quen rất riêng của bạn, là ôm nhiều, nói ít, và thường nhận ra mình mệt sau khi đã mệt từ lâu.",
      "Nhưng lá số này còn một mặt nữa, và nó nằm ở phía đối diện. Chỗ thể hiện bạn khi bước ra ngoài xã hội có Thất Sát, sao của hành động dứt khoát, cũng ở vị trí sáng. Người quen bạn ở nhà sẽ hơi ngạc nhiên nếu thấy bạn trong một cuộc họp với đối tác chưa từng gặp. Ở đó bạn nói thẳng, quyết nhanh, không ngại va chạm. Hai con người ấy không mâu thuẫn nhau, chúng là hai chế độ. Đời sống của bạn dễ chịu nhất khi bạn biết lúc nào nên bật chế độ nào, và khó chịu nhất khi bật nhầm.",
      "Tựu trung, lá số của bạn hợp với những việc có nền để xây và có đích để đo. Bạn không hợp môi trường mà mọi thứ đổi mỗi tuần và không ai chịu trách nhiệm gì, cũng không hợp vai trò chỉ ngồi chờ lệnh. Chỗ bạn phát huy nhất là nơi cho bạn tự dựng phương án rồi tự quyết khâu làm. Càng có thước đo rõ ràng, bạn càng đi xa."
    ],
    guide:{ do:["Chia việc lớn thành từng chặng, mỗi chặng có tiêu chí xong rõ ràng.","Đặt hạn chót cho việc cân nhắc; quá hạn thì quyết theo thông tin đang có."], avoid:["Đợi đủ mọi dữ kiện rồi mới hành động.","Giữ bất đồng trong lòng thay vì nói ra sớm."] },
    basis:"Cung Mệnh tại Bính Thìn: Liêm Trinh (Bình), Thiên Phủ (Miếu), Âm Sát, Bệnh Phù, Thiên Sát, Long Đức. Thân cư Thiên Di tại Tuất với Thất Sát (Miếu)." },

  { id:"truc-menh-than", kind:"std", toc:"Mệnh, Thân và động lực cốt lõi", title:"Mệnh, Thân và động lực cốt lõi", br:"Tuất",
    facts:"Mệnh <b>Thìn</b> đối Thiên Di <b>Tuất</b>, cung Thân nằm ở Thiên Di.",
    stars:[["Thất Sát","Miếu"],"Thiên Không","Thanh Long","Phan Án","Hối Khí"],
    conclusion:"Trong nhà bạn giữ, ra ngoài bạn phá. Sống tốt với lá số này là biết chuyển giữa hai chế độ đúng lúc.",
    points:[
      "Mệnh ở Thìn thiên về bảo toàn: giữ tiền, giữ nguyên tắc, giữ thành quả.",
      "Thân ở Tuất với Thất Sát sáng thiên về hành động: nhận thử thách, xử lý dứt điểm.",
      "Thiên Không ở cung Thân nhắc: mở rộng quá nhanh mà thiếu kiểm soát dễ hụt nguồn lực."
    ],
    detail:[
      "Cung Mệnh và cung Thân của bạn nằm đối nhau trên cùng một trục. Trong Tử Vi, đây là bộ khung căn bản nhất của một lá số, vì nó quyết định con người bạn vốn có và con người bạn trở thành sau khi đã ra đời va chạm. Một bên là Thìn, nơi mọi thứ hướng về giữ gìn: giữ tiền, giữ nguyên tắc, giữ thành quả. Một bên là Tuất, nơi mọi thứ hướng ra ngoài: nhận thử thách, giành vị trí, xử lý dứt điểm.",
      "Khi hai bên lệch nhau, bạn sẽ thấy một cảm giác khá quen: vừa muốn đổi việc, vừa sợ mất cái đang có. Vừa thấy chỗ hiện tại chật, vừa thấy bỏ đi thì tiếc. Đây không phải là do bạn thiếu quyết đoán. Đây là hai lực có thật trong lá số, và người mang trục này hầu như ai cũng trải qua vài lần trong đời.",
      "Cách sống thuận nhất với cấu trúc này là chia việc làm hai khâu rõ ràng. Khâu chuẩn bị thì để phần Mệnh cầm: lên phương án, kiểm tra giấy tờ, chia ngân sách, tính chỗ lùi. Khâu thực thi thì để phần Thân cầm: đã quyết rồi thì làm cho xong, không kéo dài, không quay lại bàn lại từ đầu. Người mang trục này hỏng việc thường không phải vì chọn sai, mà vì lẫn hai khâu vào nhau, nghĩa là vừa làm vừa nghĩ lại.",
      "Thiên Không trong cung Thân là sao tôi muốn bạn nhớ. Nó nhắc rằng những kế hoạch mở rộng nghe rất hay có thể thiếu nền bên dưới. Với lá số này, trước khi mở rộng bất cứ thứ gì, hãy viết ra một con số: khoản dự phòng tối thiểu phải giữ lại, không được đụng đến. Có con số đó rồi thì phần Thất Sát trong bạn cứ việc mạnh dạn.",
      "Phần dễ chịu của trục này nằm ở Thanh Long và Phan Án, hai sao giúp bạn nhạy trong giao tế và dễ được tin nhờ chuyên môn. Người ta tin bạn không phải vì bạn nói hay, mà vì bạn nắm việc. Chỉ có Hối Khí là cần để ý: lúc bị chạm tự ái, lời nói của bạn thường mạnh hơn mức bạn thật sự muốn, rồi sau đó tiếc. Biết trước thì dễ xử, chỉ cần để câu trả lời sang hôm sau."
    ],
    guide:{ do:["Tách rõ giai đoạn lên kế hoạch và giai đoạn làm.","Trước khi mở rộng, ghi ra khoản dự phòng tối thiểu phải giữ."], avoid:["Để cảm xúc quyết thay khi có biến động bên ngoài.","Bỏ qua điều khoản hợp đồng vì tin người."] },
    basis:"Mệnh Thìn đối Thiên Di Tuất. Thiên Di (cung Thân): Thất Sát (Miếu), Thiên Không, Thanh Long, Phan Án, Hối Khí." },

  { id:"tu-hoa", kind:"hoa", toc:"Tứ hóa và cách cục", title:"Tứ hóa và cách cục trọng yếu",
    facts:"Tứ hóa theo can năm <b>Quý</b>.",
    hoa:[ ["Phá Quân","loc","Dần"], ["Cự Môn","quyen","Mùi"], ["Thái Âm","khoa","Tỵ"], ["Tham Lang","ky","Ngọ"] ],
    conclusion:"Lộc của bạn đến từ việc dám làm mới, còn chỗ phải giữ là những ham muốn vượt quá sức.",
    points:[
      "Phá Quân Hóa Lộc ở Phu Thê: đổi mới, mở hướng mới thì có tiền, nhất là khi làm cùng người khác.",
      "Cự Môn Hóa Quyền và Thái Âm Hóa Khoa: lời nói có trọng lượng, làm việc chỉn chu được người tin.",
      "Tham Lang Hóa Kỵ ở Phúc Đức: kỳ vọng thiếu thực tế hoặc quan hệ phức tạp dễ gây vướng."
    ],
    detail:[
      "Tứ hóa là bốn dấu hiệu được an theo can năm sinh, và trong nghề người ta coi đây là phần nói rõ nhất một đời người được gì và vướng gì. Lá số của bạn sinh năm can Quý, nên bốn dấu hiệu rơi vào bốn chỗ sau đây.",
      "Hóa Lộc rơi vào Phá Quân, đóng ở cung Phu Thê. Hóa Lộc là dấu hiệu của tiền bạc và cơ hội, Phá Quân là sao của việc phá cũ dựng mới. Ghép lại thì nghĩa rất thực tế: phần lớn cơ hội tạo ra tiền của bạn đến qua người khác, và đến vào những lúc bạn chấp nhận làm khác đi. Người đồng hành, đối tác, bạn làm ăn, đó là cửa lộc của lá số này. Người mang cấu trúc này mà cố làm một mình thì thường chậm hơn hẳn.",
      "Hóa Quyền rơi vào Cự Môn, và Hóa Khoa rơi vào Thái Âm. Cự Môn là sao của lời nói, khi gặp Hóa Quyền thì tiếng nói có sức nặng, nên việc thương lượng hay tranh luận của bạn thường đi đến kết quả. Thái Âm gặp Hóa Khoa thì được biết đến nhờ làm kỹ, nhờ hồ sơ sạch sẽ, nhờ sự tin cậy chứ không nhờ phô trương. Hai thứ này bổ cho nhau: bạn nói có trọng lượng vì người ta biết bạn nắm việc.",
      "Hóa Kỵ rơi vào Tham Lang ở cung Phúc Đức, và đây là chỗ phải giữ. Tham Lang là sao của ham muốn, Hóa Kỵ là dấu hiệu của vướng mắc. Ghép lại thì cái vướng của đời bạn không nằm ở tiền bạc hay sức khỏe, nó nằm ở chỗ muốn quá nhiều thứ cùng một lúc. Mỗi thứ đều chính đáng, nhưng gộp lại thì không ai đủ sức. Người mang Tham Lang Hóa Kỵ khi biết chọn thì đi rất xa; khi không biết chọn thì loay hoay nhiều năm mà nhìn lại chưa xong thứ gì trọn vẹn.",
      "Đặt bốn dấu hiệu ấy cạnh nhau sẽ thấy một mạch khá rõ. Lộc của bạn đến từ người khác, uy của bạn đến từ sự chắc tay, và cái níu bạn lại là chính lòng tham thứ của mình. Ba việc một năm, làm cho xong, rồi mới thêm. Đó là câu ngắn nhất tóm lại cả phần này."
    ],
    guide:{ do:["Viết mục tiêu năm thành tối đa ba việc.","Khi đàm phán, chuẩn bị số liệu trước rồi mới nói."], avoid:["Nhận thêm việc chỉ vì ngại từ chối.","Hứa hẹn khi chưa tính xong nguồn lực."] },
    basis:"Tứ hóa năm Quý: Phá Quân Hóa Lộc (Phu Thê, Dần), Cự Môn Hóa Quyền (Điền Trạch, Mùi), Thái Âm Hóa Khoa (Phụ Mẫu, Tỵ), Tham Lang Hóa Kỵ (Phúc Đức, Ngọ)." },

  { id:"muoi-hai-cung", kind:"palaces", toc:"Mười hai cung", title:"Luận giải mười hai cung" },

  { id:"linh-vuc", kind:"themes", toc:"Tổng hợp theo lĩnh vực", title:"Tổng hợp theo lĩnh vực",
    themes:[
      { id:"cong-viec", title:"Công việc và tài chính", rel:["Thân","Tý","Thìn"],
        conclusion:"Bạn tiến bằng uy tín và sự chỉn chu; tiền tăng theo trách nhiệm được giao, không theo may rủi.",
        points:["Hợp vị trí quản lý tiền, hồ sơ, quy trình (Vũ Khúc, Thiên Tướng ở Quan Lộc).","Thu nhập ổn định, tích luỹ tốt nhờ Tử Vi và Lộc Tồn ở Tài Bạch.","Rủi ro lớn nhất là mở rộng quá nhanh khi chưa đủ nền."],
        detail:[
          "Ba cung nói về công việc và tiền bạc của bạn đều mạnh, và chúng mạnh theo cùng một kiểu. Cung Quan Lộc có Vũ Khúc và Thiên Tướng, hai sao của người vừa giỏi nghề vừa chịu trách nhiệm. Cung Tài Bạch có Tử Vi và Lộc Tồn, hai sao của người biết quản và biết giữ. Cung Mệnh thì có Thiên Phủ, sao của kho. Cả ba cộng lại cho một chân dung nhất quán: bạn kiếm tiền bằng cách được giao việc, và giữ tiền bằng cách có kỷ luật.",
          "Điều đó quyết định luôn chuyện nên làm ở đâu. Những nơi đo kết quả bằng con số và giao quyền theo năng lực sẽ trả công xứng đáng cho bạn. Những nơi thăng tiến dựa vào quan hệ hay dựa vào việc ai nói hay hơn thì bạn thường thiệt, không phải vì bạn kém mà vì thước đo ở đó không đo được thứ bạn giỏi.",
          "Rủi ro lớn nhất của bạn về mặt tài chính không phải tiêu hoang, mà là mở rộng khi nền chưa đủ. Với lá số có Thiên Không ở cung Thân, những kế hoạch mở rộng nghe rất hợp lý trên giấy vẫn có thể thiếu chỗ tựa bên dưới. Cách đơn giản để tự bảo vệ là luôn giữ một khoản dự phòng bằng số tháng chi tiêu, và không đụng đến nó dù cơ hội có hấp dẫn đến đâu. Với những khoản đầu tư lớn, hỏi thêm ý kiến người làm nghề tài chính là việc nên làm."
        ],
        guide:{ do:["Chọn vai trò có quyền và trách nhiệm đi cùng nhau."], avoid:["Dồn tiền vào kênh mình không hiểu."] } },
      { id:"quan-he", title:"Quan hệ và gia đình", rel:["Dần","Sửu","Mão"],
        conclusion:"Người thân của bạn đều có cá tính mạnh; hoà khí đến từ luật chơi rõ ràng hơn là từ nhường nhịn.",
        points:["Người đồng hành độc lập, mang lại cơ hội (Phá Quân Hóa Lộc ở Phu Thê).","Con cái tự lập sớm, cần đối thoại thay vì áp đặt.","Tiền chung trong họ hàng, anh em là chỗ dễ hao."],
        detail:[
          "Nhìn ba cung về người thân của bạn thì thấy một điểm chung thú vị: ai trong nhà cũng có chí riêng. Bạn đời hoặc đối tác có Phá Quân, sao của người không chịu đi lối mòn. Con cái có Kình Dương, sao của người dám đương đầu. Còn bạn thì có Liêm Trinh, sao của phép tắc. Ba tính cách đều mạnh, đều rõ, và đó vừa là may vừa là việc phải làm.",
          "May ở chỗ không ai trong nhà bạn là người ỷ lại. Việc phải làm ở chỗ ba người cứng ngồi chung một mâm thì cần luật chơi, chứ nhường nhịn suông không đủ. Với lá số này, hòa khí không đến từ việc ai đó chịu thiệt, nó đến từ việc mọi chuyện được nói rõ từ đầu: ai lo khoản nào, ai quyết việc gì, bất đồng thì giải quyết ra sao.",
          "Chỗ dễ sứt mẻ nhất là tiền. Cung Huynh Đệ của bạn có Đại Hao và Tai Sát, hai sao ứng vào những khoản tiền chung ra mà không tính trước. Cung Phu Thê thì có Địa Kiếp và Tiểu Hao, ứng vào chi tiêu chung hay phát sinh. Gộp lại thì lời khuyên chỉ có một câu: mọi thỏa thuận tiền bạc với người thân đều nên có chữ, dù chỉ là một tin nhắn. Nghe sòng phẳng quá đáng, nhưng thực tế là giấy tờ rõ ràng giữ được tình, còn nhập nhằng mới làm mất tình."
        ],
        guide:{ do:["Thống nhất ai giữ khoản nào trong chi tiêu chung."], avoid:["Quyết khoản tiền lớn chung khi chưa bàn."] } },
      { id:"xa-hoi", title:"Môi trường xã hội", rel:["Tuất","Dậu"],
        conclusion:"Bên ngoài bạn được tin nhờ chuyên môn và sự thẳng thắn; hãy để người khác thấy cả sự mềm mỏng của bạn.",
        points:["Thất Sát sáng ở Thiên Di: đổi môi trường giúp bạn bật lên.","Bạn bè, đồng nghiệp phần lớn tử tế (Thiên Lương ở Nô Bộc).","Lời nói nóng khi bị phê bình là chỗ dễ mất điểm."],
        detail:[
          "Đây là phần mạnh nhất của lá số bạn, và cũng là phần nhiều người mang lá số này nhận ra muộn. Cung Thân của bạn nằm ở Thiên Di, nghĩa là sức vóc thật sự của bạn thể hiện ở bên ngoài chứ không phải trong nhà. Thất Sát đóng ở đó lại ở vị trí sáng, cho ra một con người ngoài xã hội rất khác với con người ở nhà: quyết nhanh, nói thẳng, nhận việc khó mà không kêu.",
          "Hệ quả rất thực tế khi bạn chọn việc hay chọn chỗ sống: càng ở lâu một môi trường quen thuộc ít thay đổi, bạn càng thấy bức bối mà không rõ vì sao. Ngược lại, mỗi lần đổi môi trường, đi công tác xa, làm với đối tác mới, bạn lại bật lên. Nếu có lời mời đi đâu đó hay gặp ai đó, với lá số này thì nên đi.",
          "Người quanh bạn phần lớn tử tế. Cung Nô Bộc có Thiên Lương, sao của sự che chở, nên bạn có người sẵn lòng góp ý thật. Chỉ có một chỗ nên giữ: lúc bị phê bình trước đám đông, phản ứng đầu tiên của bạn thường mạnh hơn mức bạn muốn, rồi sau đó tiếc. Đó là Hối Khí trong cung Thân. Biết trước thì dễ, chỉ cần để câu trả lời sang hôm sau, không trả lời ngay tại chỗ."
        ],
        guide:{ do:["Nhận dự án có yếu tố đi xa hoặc đối tác mới."], avoid:["Tranh luận công khai khi đang bực."] } },
      { id:"noi-luc", title:"Thân tâm và nguồn lực nội tại", rel:["Ngọ","Hợi","Thìn"],
        conclusion:"Năng lượng của bạn dồi dào nhưng dễ tiêu vào quá nhiều thứ; sức bền đến từ việc biết chọn.",
        points:["Tham Lang ở Phúc Đức: nhiều sở thích, sống có màu sắc.","Thiên Cơ ở Tật Ách: mệt vì nghĩ nhiều hơn vì làm nặng.","Giấc ngủ đều là cách giữ sức hiệu quả nhất."],
        detail:[
          "Phần này nói về thứ ít ai đọc kỹ nhưng lại quyết định chất lượng cả đời: bạn nạp lại năng lượng bằng cách nào, và tiêu nó đi bằng cách nào. Cung Phúc Đức của bạn có Tham Lang mạnh, nên bạn nạp lại bằng trải nghiệm chứ không bằng nghỉ ngơi thụ động. Bảo bạn nằm không cả ngày để nghỉ thì thường không hiệu quả, nhưng cho bạn đi một chuyến hay học một thứ mới thì lại khác hẳn.",
          "Chỗ tiêu hao thì nằm ở hai nơi. Một là Tham Lang đi cùng Hóa Kỵ: muốn quá nhiều thứ cùng lúc. Hai là Thiên Cơ ở cung Tật Ách: đầu óc không chịu tắt. Hai thứ này nuôi nhau, vì càng muốn nhiều thì càng nghĩ nhiều, càng nghĩ nhiều thì ngủ càng kém, ngủ kém thì hôm sau làm được ít hơn, làm được ít hơn thì lại càng sốt ruột.",
          "Cách cắt vòng đó không phải là cố gắng hơn, mà là chọn ít lại. Mỗi năm ba việc, viết ra giấy, dán chỗ nhìn thấy. Những thứ còn lại không bỏ, chúng chỉ xếp hàng chờ năm sau. Thêm một việc rất nhỏ mà hiệu quả với cấu trúc này: giữ lấy một ngày trong tuần thật sự không đụng đến công việc, kể cả không mở tin nhắn công việc. Nếu cơ thể có dấu hiệu bất thường kéo dài thì đi khám sớm, đừng tự tra cứu rồi tự kết luận."
        ],
        guide:{ do:["Giữ một ngày nghỉ thật trong tuần."], avoid:["Tiêu tiền để giải toả căng thẳng."] } }
    ] },

  { id:"diem-manh", kind:"sw", toc:"Điểm mạnh và điểm vướng", title:"Điểm mạnh, điểm vướng và điều kiện phát huy",
    conclusion:"Bạn mạnh nhất khi có kế hoạch rõ và được tự quyết khâu làm; bạn yếu nhất khi phải chờ đợi trong mơ hồ.",
    strengths:[["Kỷ luật và giữ lời","Liêm Trinh ở Mệnh"],["Giữ tiền, tích luỹ","Thiên Phủ Miếu, Lộc Tồn"],["Quyết nhanh ở bên ngoài","Thất Sát Miếu ở cung Thân"]],
    tensions:[["Do dự khi thiếu thông tin","Âm Sát ở Mệnh"],["Mở rộng quá nhanh","Thiên Không ở cung Thân"],["Ôm quá nhiều mục tiêu","Tham Lang Hóa Kỵ"]],
    condition:"Điều kiện để phát huy: một môi trường cho bạn tự lên kế hoạch và tự quyết khâu thực hiện, có thước đo kết quả rõ, và có người đồng hành chịu nói thẳng với bạn.",
    basis:"Mệnh: Liêm Trinh, Thiên Phủ, Âm Sát. Thân: Thất Sát, Thiên Không. Tài Bạch: Lộc Tồn. Phúc Đức: Tham Lang Hóa Kỵ." },

  { id:"dai-van", kind:"decadal", toc:"Đại vận 25-34 tuổi", title:"Đại vận 25-34 tuổi tại cung Phu Thê", br:"Dần",
    facts:"Tuổi <b>25-34</b>, năm <b>2017-2026</b>. Cung Phu Thê (Giáp Dần).",
    stars:[["Phá Quân","Đắc","loc"],"Địa Kiếp","Kiếp Sát","Thiên Hình","Nguyệt Đức"],
    conclusion:"Mười năm này xoay quanh người đồng hành: cơ hội đến qua đối tác, bạn đời, người cùng làm, và vướng mắc cũng vậy.",
    points:[
      "Phá Quân Hóa Lộc tại cung đại vận: chặng của những lần bắt đầu lại, đổi hướng, và có lộc từ đó.",
      "Địa Kiếp, Kiếp Sát đồng cung: kế hoạch chung dễ bị đảo lộn, nên luôn có phương án dự phòng.",
      "2026 là năm cuối của chặng; từ 2027 bạn sang chặng 35-44 tại cung Tử Tức."
    ],
    detail:[
      "Chặng đại vận hiện tại của bạn đi qua cung Phu Thê, nơi có Phá Quân đi cùng Hóa Lộc. Nói cho gọn thì suốt mười năm nay, trục chính của đời bạn là người khác: bạn đời, đối tác, người cùng làm. Những quyết định lớn của chặng này hầu như đều có bóng dáng một người thứ hai trong đó, dù là cưới, là hợp tác, hay là cùng mở một việc.",
      "Vì có Hóa Lộc, đây không phải chặng đáng lo, mà là chặng đáng khai thác. Những thay đổi bạn dám làm cùng người khác trong mười năm này thường sinh lợi thật. Chỉ có điều Phá Quân đi đâu cũng mang theo biến động, nên kế hoạch chung hay bị xô lệch giữa chừng. Người mang chặng này mà không chuẩn bị quỹ dự phòng thì mỗi lần xô lệch là mỗi lần vất vả.",
      "Địa Kiếp và Kiếp Sát đóng trong cung là hai sao nhắc bạn giữ chỗ lùi. Không phải để sợ, mà để mỗi khi kế hoạch chung đổi hướng thì bạn vẫn còn thế chủ động. Với những cam kết lớn, điều khoản rút lui nên được bàn ngay từ lúc vui vẻ, chứ đừng đợi lúc có chuyện mới mang ra nói.",
      "Năm hai nghìn không trăm hai sáu là năm cuối của chặng. Theo cách đọc thông thường thì đây là lúc khép lại hơn là lúc mở ra: chốt những thỏa thuận chung còn dang dở, hoàn tất những việc đã hứa, dọn dẹp cho gọn. Từ hai nghìn không trăm hai bảy bạn sang chặng mới ở cung Tử Tức, nơi có Kình Dương và Linh Tinh, và trọng tâm sẽ chuyển sang con cái, người dưới tay, và những thứ bạn gây dựng. Biết trước điều đó thì năm nay bạn có một việc rất cụ thể để làm: khép lại cho sạch trước khi bước sang chặng khác."
    ],
    guide:{ do:["Rà lại các thỏa thuận chung trước khi sang chặng mới."], avoid:["Bắt đầu hợp tác lớn khi chưa có điều khoản rút lui."] },
    basis:"Đại vận thứ 3, tuổi 25-34 (2017-2026), cung Phu Thê tại Giáp Dần: Phá Quân (Đắc) Hóa Lộc, Địa Kiếp, Kiếp Sát, Thiên Hình, Nguyệt Đức." },

  { id:"nam-2026", kind:"annual", toc:"Năm 2026 Bính Ngọ", title:"Năm 2026 Bính Ngọ", br:"Ngọ",
    facts:"Lưu niên tại cung <b>Phúc Đức (Mậu Ngọ)</b>. Tính đến ngày 27/09/2026.",
    stars:[["Tham Lang","Vượng","ky"],"Hỏa Tinh","Văn Xương","Thiên Đức"],
    conclusion:"Năm 2026 thử sức bền tinh thần: nhiều thứ muốn làm, nhiều người muốn gặp, và chọn đúng quan trọng hơn làm nhiều.",
    points:[
      "Lưu niên đi qua cung có Tham Lang Hóa Kỵ: dễ bị cuốn vào những mong muốn vượt sức.",
      "Năm khép lại chặng đại vận ở Phu Thê: nên chốt những cam kết chung còn dang dở.",
      "Thiên Đức đồng cung: có người sẵn lòng giúp khi bạn chủ động nhờ."
    ],
    detail:[
      "Lưu niên năm nay đi qua cung Phúc Đức của bạn, nơi có Tham Lang đi cùng Hóa Kỵ. Đây là cung nói về đời sống bên trong, về cái làm bạn thấy đủ hay thấy thiếu. Cho nên năm hai nghìn không trăm hai sáu không phải năm thử thách tiền bạc hay công việc của bạn, nó thử sức bền tinh thần.",
      "Cụ thể là thế này: năm nay bạn sẽ thấy nhiều thứ đáng làm cùng lúc. Có cơ hội muốn nắm, có mối quan hệ muốn giữ, có thứ muốn học, có việc riêng muốn bắt đầu. Mỗi thứ đều chính đáng. Nhưng Hóa Kỵ đóng ở đây cho thấy nếu ôm hết thì cuối năm nhìn lại sẽ thấy mệt mà chưa xong thứ gì trọn vẹn. Chọn ba việc, làm cho xong, đó là lời khuyên gọn nhất cho phần còn lại của năm.",
      "Hỏa Tinh đóng cùng cung thêm vào cái nóng vội, và nó ứng rõ nhất vào chuyện tiền. Những khoản chi bạn tiếc nhất trong năm thường rơi vào lúc bạn đang bức bối chứ không phải lúc đang vui. Nguyên tắc dễ áp dụng: khoản nào lớn thì để qua một đêm rồi quyết.",
      "Năm nay cũng là năm cuối của chặng đại vận ở cung Phu Thê, nên những cam kết chung còn dang dở nên được chốt lại trong năm. Bù lại, Thiên Đức trong cung là sao lành: khi bạn thật sự cần thì sẽ có người giúp, miễn là bạn chịu lên tiếng nhờ. Với một người quen tự xoay như bạn, đó lại là việc khó nhất."
    ],
    guide:{ do:["Chọn tối đa ba mục tiêu cho phần còn lại của năm."], avoid:["Chi tiêu để giải toả căng thẳng."] },
    basis:"Lưu niên 2026 Bính Ngọ tại cung Phúc Đức (Mậu Ngọ): Tham Lang (Vượng) Hóa Kỵ, Hỏa Tinh, Văn Xương, Thiên Đức." },

  { id:"gio-sinh", kind:"sens", toc:"Độ nhạy giờ sinh", title:"Độ nhạy của lá số theo giờ sinh",
    conclusion:"Phần lớn nhận định về tính cách nền và tứ hóa đứng vững; vị trí các cung và các chặng đại vận phụ thuộc giờ sinh chính xác.",
    stable:["Không đổi nếu giờ sinh lệch","Tứ hóa theo năm Quý (Phá Quân Lộc, Cự Môn Quyền, Thái Âm Khoa, Tham Lang Kỵ), Lộc Tồn tại Tý, Kình Dương tại Sửu, Thiên Khôi tại Mão."],
    sensitive:["Có thể đổi nếu giờ sinh lệch","Vị trí cung Mệnh và cung Thân, các sao an theo giờ như Văn Xương, Văn Khúc, Địa Không, Địa Kiếp, và mốc tuổi của các chặng đại vận."] },

  { id:"hanh-dong", kind:"acts", toc:"Định hướng thực tế", title:"Định hướng thực tế",
    acts:[
      ["Chia mỗi việc lớn thành chặng có tiêu chí xong.","Liêm Trinh, Thiên Phủ ở Mệnh làm tốt nhất khi có lộ trình; Âm Sát khiến bạn do dự khi mọi thứ mơ hồ.","Bắt đầu việc lớn khi chưa viết ra thế nào là xong."],
      ["Đặt hạn chót cho việc cân nhắc.","Sức quyết của Thất Sát ở cung Thân chỉ phát huy khi bạn cho phép mình quyết.","Chờ đủ thông tin trước những cơ hội cần trả lời nhanh."],
      ["Ghi thành văn bản mọi thỏa thuận tiền với người thân và đối tác.","Đại Hao, Tai Sát ở Huynh Đệ và Địa Kiếp ở Phu Thê cho thấy tiền chung là chỗ dễ hao.","Cho vay hoặc góp vốn chỉ bằng lời hứa."],
      ["Trong năm 2026, chọn tối đa ba mục tiêu.","Tham Lang Hóa Kỵ ở cung lưu niên dễ kéo bạn vào quá nhiều việc cùng lúc.","Nhận thêm cam kết mới chỉ vì ngại từ chối."]
    ] }
];
