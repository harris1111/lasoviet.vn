// Voice, vocabulary and arc rules for prompt v4.2 (FD-106c, d).
// Source of truth: docs/superpowers/specs/2026-09-28-report-writing-rules-beginner-first.md.
// Banned lists come from the quality config so the prompt and the gate cannot drift apart.
import type { ZiweiReportQualityConfigV2_4Beginner } from "@lasoviet/config";

export function buildVoiceBlockV4_2(config: ZiweiReportQualityConfigV2_4Beginner): string {
  return `GIỌNG VĂN (bắt buộc cho mọi phần):
Viết bằng giọng tâm tình của người có nghề đang ngồi nói chuyện với người xem lá số. Tiếng Việt tự nhiên, câu có chủ ngữ là người, có việc người ấy làm. Nói với người đọc ("bạn"), không nói về người đọc. Được phép dặn dò, được phép nói rõ một sao KHÔNG có nghĩa là gì.
Người đọc chưa từng học Tử Vi. Mỗi đoạn phải hiểu được mà không cần biết trước tên sao nào.

Văn xuôi liền mạch. Không đặt tiêu đề nhỏ trong phần luận giải, không mở câu bằng nhãn. Không dùng các cụm sau làm tiêu đề hay làm chữ mở câu: ${config.bannedOpeners.join(" · ")}.
Không dùng các cụm sau ở bất kỳ đâu: ${config.bannedPhrases.join(" · ")}.
Không ghép danh từ trừu tượng thay cho câu. Nếu một câu có ba danh từ trừu tượng mà không ai làm gì, viết lại thành việc một người làm.
Từ Hán Việt chỉ dùng khi người Việt bình thường vẫn nói hằng ngày. Thuật ngữ Tử Vi (tên sao, tên cung, Hóa Lộc, đại vận) được giữ nhưng phải giải nghĩa.

TÊN SAO:
Lần đầu một sao xuất hiện trong phần, cùng câu đó hoặc câu ngay sau phải giải nghĩa ngay bằng lời đời thường. Không bao giờ để tên sao trơ trọi.
Nói nghĩa trước, cơ chế sau: điều người đọc nhận ra trong đời mình đi trước, căn cứ trên lá số theo sau.
Tối đa khoảng ${config.maxDistinctStarNamesPer80Syllables} tên sao khác nhau cho mỗi 80 âm tiết. Các sao còn lại vẫn là căn cứ: đưa vào evidenceKeys, không cần nêu tên trong bài. Mỗi phần nêu tên ít nhất ${config.minimumNamedAnchorsInProse} sao có trong evidenceKeys.
Độ sáng viết bằng lời ("ở vị trí sáng nhất"), không viết nhãn ("ở trạng thái Miếu").
Ví dụ sai: "Cung Mệnh có Liêm Trinh ở trạng thái Bình và Thiên Phủ ở trạng thái Miếu, củng cố xu hướng hành động chặt chẽ."
Ví dụ đúng: "Ngôi lo kho là Thiên Phủ, và nó ở vị trí sáng nhất trong lá số bạn. Nó khiến bạn có phản xạ tích luỹ, dự phòng, và rất không thích cảm giác tay trắng."

MẠCH KỂ:
Phần tổng quan (overview) gồm đúng năm đoạn văn xuôi, không có tiêu đề, cách nhau một dòng trống: (1) con người bạn nhìn từ xa, mở bằng con người hoặc cấu trúc nổi bật đã dịch ra lời thường, không mở bằng tên sao; (2) cách bạn làm việc và quyết định, có một cảnh đời thường cụ thể; (3) cái giá của chính nét tính cách ở đoạn một, viết như một phần của con người chứ không phải danh sách lỗi; (4) con người thứ hai của bạn, tức độ vênh giữa Mệnh và Thân hoặc một chế độ khác mà lá số cho thấy; (5) kiểu sống nào hợp với bạn, kết bằng một nhận định, không tóm tắt lại.
Phần cung và phần chủ đề: vùng đời này trông thế nào với bạn, chỗ nào khó, điều gì thật sự giúp. Viết thành các đoạn liền mạch, không tiêu đề.
decadalTeasers: mỗi chặng hai đến ba câu. Nói chặng đi qua cung nào (giải nghĩa cung đó bằng lời thường), mười năm ấy điều gì nổi lên, rồi dừng. Đây là lời mở, không phải bài luận.

MẪU VĂN ĐÃ ĐƯỢC DUYỆT (chỉ học giọng, không chép nội dung, không dùng facts trong mẫu):
${FEW_SHOT_V4_2}`;
}

// Verbatim from prototype/revamp-2026-09/doc-bao-cao-tuong-tac-palaces.js, "Thìn" detail[0..1]
// (177 syllables). Do not add more: longer few-shots make the model copy content.
const FEW_SHOT_V4_2 = `Nhìn vào cung Mệnh, điều thấy ngay là Thiên Phủ đóng ở vị trí sáng nhất. Thiên Phủ vốn là sao trông coi kho tàng. Người có Thiên Phủ sáng ở Mệnh thường mang sẵn một phản xạ: trước khi tiêu thì đã nghĩ đến phần còn lại, trước khi nhận việc thì đã nghĩ đến lúc phải trả. Đi cùng là Liêm Trinh, sao của phép tắc. Hai sao ghép lại thành một kiểu người mà thời nào cũng cần: nói được làm được, giữ lời, và không để sổ sách của mình lộn xộn.

Cho nên người quanh bạn có một thói quen mà có lẽ bạn chưa để ý: họ giao việc rồi thôi, không hỏi lại. Vì họ biết bạn sẽ làm, và làm xong sẽ báo. Cái uy ấy không đến từ việc bạn nói to hay quyết liệt. Nó đến từ chỗ bạn chưa bao giờ hứa suông. Đây là vốn liếng lớn nhất của lá số này, và nó tích dần theo năm tháng chứ không có sẵn từ đầu.`;
