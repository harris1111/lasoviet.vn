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
  decadal: [
    { age:[5,14],  years:[1997,2006], br:"Thìn" },
    { age:[15,24], years:[2007,2016], br:"Mão" },
    { age:[25,34], years:[2017,2026], br:"Dần" },
    { age:[35,44], years:[2027,2036], br:"Sửu" },
    { age:[45,54], years:[2037,2046], br:"Tý" },
    { age:[55,64], years:[2047,2056], br:"Hợi" },
    { age:[65,74], years:[2057,2066], br:"Tuất" },
    { age:[75,84], years:[2067,2076], br:"Dậu" }
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
    conclusion:"Lá số nghiêng về giữ nền: bạn làm chắc trước, mở rộng sau, và hiếm khi đặt cược thứ mình đã có.",
    points:[
      "Liêm Trinh và Thiên Phủ ở Mệnh cho bạn nguyên tắc rõ và khả năng quản tiền, quản việc.",
      "Âm Sát, Bệnh Phù đi cùng khiến bạn cân nhắc lâu, có lúc thành do dự.",
      "Phần quyết đoán nằm ở cung Thân, nên bạn mạnh nhất khi ra ngoài làm việc với người khác."
    ],
    detail:[
      ["Cách bạn làm việc","Bạn thích kế hoạch có lộ trình, có người chịu trách nhiệm cho từng phần. Trước khi bắt tay, bạn thường rà chi tiết và tính trước chỗ có thể hỏng. Nhờ vậy việc bạn làm ít khi phải làm lại."],
      ["Chỗ dễ vướng","Cùng thói quen đó, khi thông tin chưa đủ, bạn dễ chần chừ và lo xa. Có những cơ hội cần trả lời trong vài ngày, không đợi được đến lúc mọi thứ rõ ràng."],
      ["Khi bước ra ngoài","Thân cư Thiên Di với Thất Sát sáng cho thấy ngoài xã hội bạn khác hẳn: nói thẳng, quyết nhanh, dám nhận việc khó. Hai mặt này không mâu thuẫn, chỉ cần biết lúc nào dùng mặt nào."]
    ],
    guide:{ do:["Chia việc lớn thành từng chặng, mỗi chặng có tiêu chí xong rõ ràng.","Đặt hạn chót cho việc cân nhắc, quá hạn thì quyết theo thông tin đang có."], avoid:["Đợi đủ mọi dữ kiện rồi mới hành động.","Giữ bất đồng trong lòng thay vì nói ra sớm."] },
    basis:"Cung Mệnh tại Bính Thìn: Liêm Trinh (Bình), Thiên Phủ (Miếu), Âm Sát, Bệnh Phù, Thiên Sát, Long Đức. Thân cư Thiên Di tại Tuất." },

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
      ["Hai lực kéo","Mệnh và Thân nằm đối nhau trên cùng một trục. Một bên muốn giữ ổn định, một bên muốn tiến ra ngoài giành vị trí. Khi hai bên lệch nhau, bạn thấy mình vừa muốn đổi việc vừa sợ mất cái đang có."],
      ["Cách dùng cả hai","Dùng tính quy củ của Mệnh để lên phương án, kiểm tra giấy tờ và chia ngân sách. Dùng sức quyết của Thất Sát ở khâu thực hiện, để không kéo dài việc đã quyết."],
      ["Giao tiếp bên ngoài","Thanh Long và Phan Án giúp bạn nhạy trong giao tế và dễ được tin nhờ chuyên môn. Hối Khí đi cùng nhắc bạn giữ lời nói điềm tĩnh, nhất là khi bị chạm tự ái."]
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
      ["Chỗ sinh lộc","Phá Quân Hóa Lộc nằm ở cung Phu Thê. Tiền và cơ hội thường đến qua người đồng hành, đối tác, hoặc những lần bạn chấp nhận làm khác đi."],
      ["Tiếng nói và uy tín","Cự Môn Hóa Quyền giúp việc thương thảo, tranh luận của bạn dứt khoát và có sức nặng. Thái Âm Hóa Khoa thêm sự tỉ mỉ, giúp bạn được biết đến nhờ làm kỹ."],
      ["Chỗ phải giữ","Tham Lang Hóa Kỵ ở cung Phúc Đức. Khi muốn quá nhiều thứ một lúc, bạn dễ mệt và dễ vướng vào quan hệ rắc rối. Thu hẹp mục tiêu giúp bạn giữ được sức."]
    ],
    guide:{ do:["Viết mục tiêu năm thành tối đa ba việc.","Khi đàm phán, chuẩn bị số liệu trước rồi mới nói."], avoid:["Nhận thêm việc chỉ vì ngại từ chối.","Hứa hẹn khi chưa tính xong nguồn lực."] },
    basis:"Tứ hóa năm Quý: Phá Quân Hóa Lộc (Phu Thê, Dần), Cự Môn Hóa Quyền (Điền Trạch, Mùi), Thái Âm Hóa Khoa (Phụ Mẫu, Tỵ), Tham Lang Hóa Kỵ (Phúc Đức, Ngọ)." },

  { id:"muoi-hai-cung", kind:"palaces", toc:"Mười hai cung", title:"Luận giải mười hai cung" },

  { id:"linh-vuc", kind:"themes", toc:"Tổng hợp theo lĩnh vực", title:"Tổng hợp theo lĩnh vực",
    themes:[
      { id:"cong-viec", title:"Công việc và tài chính", rel:["Thân","Tý","Thìn"],
        conclusion:"Bạn tiến bằng uy tín và sự chỉn chu; tiền tăng theo trách nhiệm được giao, không theo may rủi.",
        points:["Hợp vị trí quản lý tiền, hồ sơ, quy trình (Vũ Khúc, Thiên Tướng ở Quan Lộc).","Thu nhập ổn định, tích luỹ tốt nhờ Tử Vi và Lộc Tồn ở Tài Bạch.","Rủi ro lớn nhất là mở rộng quá nhanh khi chưa đủ nền."],
        detail:[["Nơi bạn được trả công xứng đáng","Những nơi đo kết quả bằng số liệu và giao quyền theo năng lực hợp với bạn hơn những nơi thưởng theo quan hệ. Với khoản đầu tư lớn, nên hỏi thêm ý kiến chuyên gia tài chính."]],
        guide:{ do:["Chọn vai trò có quyền và trách nhiệm đi cùng nhau."], avoid:["Dồn tiền vào kênh mình không hiểu."] } },
      { id:"quan-he", title:"Quan hệ và gia đình", rel:["Dần","Sửu","Mão"],
        conclusion:"Người thân của bạn đều có cá tính mạnh; hoà khí đến từ luật chơi rõ ràng hơn là từ nhường nhịn.",
        points:["Người đồng hành độc lập, mang lại cơ hội (Phá Quân Hóa Lộc ở Phu Thê).","Con cái tự lập sớm, cần đối thoại thay vì áp đặt.","Tiền chung trong họ hàng, anh em là chỗ dễ hao."],
        detail:[["Giữ gắn bó","Nói thẳng khi có bất đồng và thống nhất chuyện tiền từ đầu giúp bạn tránh phần lớn va chạm trong nhà."]],
        guide:{ do:["Thống nhất ai giữ khoản nào trong chi tiêu chung."], avoid:["Quyết khoản tiền lớn chung khi chưa bàn."] } },
      { id:"xa-hoi", title:"Môi trường xã hội", rel:["Tuất","Dậu"],
        conclusion:"Bên ngoài bạn được tin nhờ chuyên môn và sự thẳng thắn; hãy để người khác thấy cả sự mềm mỏng của bạn.",
        points:["Thất Sát sáng ở Thiên Di: đổi môi trường giúp bạn bật lên.","Bạn bè, đồng nghiệp phần lớn tử tế (Thiên Lương ở Nô Bộc).","Lời nói nóng khi bị phê bình là chỗ dễ mất điểm."],
        detail:[["Khi làm với người mới","Chủ động giới thiệu cách mình làm việc ngay từ đầu giúp người khác hiểu sự thẳng thắn của bạn là vì việc, không phải vì người."]],
        guide:{ do:["Nhận dự án có yếu tố đi xa hoặc đối tác mới."], avoid:["Tranh luận công khai khi đang bực."] } },
      { id:"noi-luc", title:"Thân tâm và nguồn lực nội tại", rel:["Ngọ","Hợi","Thìn"],
        conclusion:"Năng lượng của bạn dồi dào nhưng dễ tiêu vào quá nhiều thứ; sức bền đến từ việc biết chọn.",
        points:["Tham Lang ở Phúc Đức: nhiều sở thích, sống có màu sắc.","Thiên Cơ ở Tật Ách: mệt vì nghĩ nhiều hơn vì làm nặng.","Giấc ngủ đều là cách giữ sức hiệu quả nhất."],
        detail:[["Giữ sức lâu dài","Chọn một hai sở thích để theo lâu thay vì thử mọi thứ. Nếu cơ thể có dấu hiệu bất thường kéo dài, nên đi khám bác sĩ sớm."]],
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
      ["Điều chặng này mang lại","Những quyết định lớn trong chặng này thường gắn với một người khác: cưới, hợp tác, cùng mở một việc. Phá Quân Hóa Lộc cho thấy các thay đổi đó có thể sinh lợi nếu hai bên thống nhất cách làm."],
      ["Chuẩn bị cho chặng tiếp theo","Chặng 35-44 đi qua cung Tử Tức, nơi có Kình Dương và Linh Tinh. Những năm tới, chuyện con cái, người cấp dưới và việc bạn gây dựng sẽ nổi lên rõ hơn. Năm 2026 là lúc khép lại những cam kết chung còn dang dở."]
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
      ["Tiền bạc và sức lực","Hỏa Tinh đi cùng Tham Lang làm bạn dễ nóng vội. Các khoản chi lớn trong năm nên để qua một đêm rồi mới quyết."],
      ["Quan hệ","Những mối quan hệ mới trong năm có sức hút mạnh. Giữ ranh giới rõ giữa việc chung và việc riêng giúp bạn tránh rắc rối."]
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
