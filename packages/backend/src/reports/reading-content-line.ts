/** FD089 ritual recommendations/sales and lottery advice stay hard failures.
 * Ordinary objects, conflict resolution and explicit refusals are not advice. */
export function hasProhibitedReadingAdvice(text: string): boolean {
  // This fixed adjective describes a cozy home, not a ritual. Replace only
  // this complete phrase; real ritual advice elsewhere still reaches the gate.
  const normalized = text.normalize("NFC").toLocaleLowerCase("vi")
    .replace(/(?<![\p{L}\p{N}])ấm\s+cúng(?![\p{L}\p{N}])/gu, "ấm áp");
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

/** FD089 also excludes affirmative long-life vocabulary, including star glosses.
 * Thiên Thọ and Trường Sinh are distinct actual star names, not this phrase. */
export function hasProhibitedReadingLifespan(text: string): boolean {
  const normalized = text.normalize("NFC").toLocaleLowerCase("vi");
  for (const match of normalized.matchAll(/(?<![\p{L}\p{N}])trường\s+thọ(?![\p{L}\p{N}])/gu)) {
    const prefix = normalized.slice(0, match.index).split(/[.!?;\n]/u).at(-1)!;
    const refusal = /(?:không(?:\s+(?:nên|cần|được))?|đừng)\s+(?:luận|dự đoán|nói về|đề cập đến)\s*$/u.exec(prefix);
    const outer = refusal ? prefix.slice(0, refusal.index) : "";
    if (refusal && !/(?<![\p{L}\p{N}])(?:không|chưa|chẳng|phủ nhận|bác bỏ)(?![\p{L}\p{N}])/u.test(outer)) continue;
    return true;
  }
  return false;
}
