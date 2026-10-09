/** FD089 ritual recommendations/sales and lottery advice stay hard failures.
 * Ordinary objects, conflict resolution and explicit refusals are not advice. */
export function hasProhibitedReadingAdvice(text: string): boolean {
  const normalized = text.normalize("NFC").toLocaleLowerCase("vi");
  for (const clause of normalized.split(/[,.!?;\n]+|(?<![\p{L}\p{N}])(?:nhưng|mà|và|rồi|tuy nhiên)(?![\p{L}\p{N}])/u)) {
    // A refusal governs only its own clause; a later affirmative clause is
    // checked independently. Bare "không chỉ" is not a refusal.
    if (/^\s*(?:(?:bạn|anh|chị|chúng ta|bản mệnh)\s+)?(?:không(?: nên| cần| được)?|đừng|tránh|từ chối)\s+(?:mua|bán|cúng|dùng|đeo|làm|giải|h(?:óa|oá) giải|đánh|chơi)/u.test(clause)) continue;
    const patterns = [
      /(?:nên|cần|hãy|khuyên|gợi ý|đề xuất|bán|mua|thuê|đeo|dùng|sử dụng|thực hiện|tổ chức|trả tiền)[^.!?\n]{0,60}(?:giải hạn|bùa(?: chú)?|cúng(?: bái)?|nghi lễ|vật phẩm phong th(?:ủy|uỷ)|gói cải vận)/gu,
      /(?:cúng|làm lễ|làm phép)[^.!?\n]{0,40}(?:giải hạn|h(?:óa|oá) giải|cải vận)/gu,
      /(?:giải hạn|cúng bái|bùa chú|lễ dâng sao)/gu,
      /h(?:óa|oá) giải\s+(?:vận hạn|vận|hạn|sao|xui)/gu,
      /(?:vòng|đá|vật phẩm|đồ)\s+phong th(?:ủy|uỷ)[^.!?\n]{0,40}(?:cải vận|giải hạn|h(?:óa|oá) giải)/gu,
      /(?:lô đề|số đề|số xổ số|đánh (?:số|đề))/gu,
    ];
    for (const pattern of patterns) {
      for (const match of clause.matchAll(pattern)) {
        const prefix = clause.slice(0, match.index);
        if (!/(?:không(?: nên| cần| được)?|đừng|tránh|từ chối)(?: việc)?\s*$/u.test(prefix)) return true;
      }
    }
  }
  return false;
}
