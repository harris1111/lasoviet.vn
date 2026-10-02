import { describe, expect, it } from "vitest";

import {
  findBannedOpener,
  findBannedPhrase,
  findMachineSubheading,
  overviewArcProblem,
  starDensityProblem,
} from "./comprehensive-report-beginner-gates.js";

const STAR_LABELS = ["Tử Vi", "Thiên Phủ", "Liêm Trinh", "Âm Sát", "Bệnh Phù", "Long Đức", "Thất Sát"];
const syllables = (n: number) => Array.from({ length: n }, () => "chữ").join(" ");

describe("findBannedPhrase", () => {
  it("catches a founder-flagged phrase anywhere, regardless of case", () => {
    expect(findBannedPhrase("Nhưng tính cách ấy có Mặt Sau của nó.", ["mặt sau"])).toBe("mặt sau");
  });
  it("does not match inside a longer word", () => {
    expect(findBannedPhrase("mặt sautrăm", ["mặt sau"])).toBeNull();
  });
  it("passes natural Vietnamese", () => {
    expect(findBannedPhrase("Nhưng tính cách ấy có mặt trái của nó.", ["mặt sau"])).toBeNull();
  });
});

describe("findBannedOpener", () => {
  it("flags a label phrase at the start of the text", () => {
    expect(findBannedOpener("Chỗ phải giữ là tiền chung.", ["chỗ phải giữ"])).toBe("chỗ phải giữ");
  });
  it("flags a label phrase at the start of a later sentence or line", () => {
    expect(findBannedOpener("Câu đầu đủ ý. Chỗ phải giữ là tiền chung.", ["chỗ phải giữ"])).toBe("chỗ phải giữ");
    expect(findBannedOpener("Câu đầu đủ ý\nĐường thăng tiến rộng.", ["đường thăng tiến"])).toBe("đường thăng tiến");
  });
  it("allows the same words inside a sentence, as the approved texts do", () => {
    expect(findBannedOpener("Hóa Kỵ rơi vào cung Phúc Đức, và đây là chỗ phải giữ.", ["chỗ phải giữ"])).toBeNull();
  });
});

describe("findMachineSubheading", () => {
  it("flags a short label line sitting above a paragraph", () => {
    expect(findMachineSubheading("Chỗ dễ va chạm\nĐịa Kiếp và Tiểu Hao cho thấy chi tiêu chung dễ phát sinh.")).toBe("Chỗ dễ va chạm");
  });
  it("rejects generic Markdown and colon headings separated by a blank line", () => {
    expect(findMachineSubheading("Thói quen tốt:\n\nBạn giữ lời hẹn.")).toBe("Thói quen tốt:");
    expect(findMachineSubheading("**Thói quen tốt**\n\nBạn giữ lời hẹn.")).toBe("**Thói quen tốt**");
  });
  it("accepts flowing paragraphs separated by blank lines", () => {
    expect(findMachineSubheading("Câu một dài đủ ý.\n\nCâu hai cũng dài đủ ý.")).toBeNull();
  });
  it("accepts a short final sentence that ends with punctuation", () => {
    expect(findMachineSubheading("Đoạn dài.\nNên đi.")).toBeNull();
  });
});

describe("starDensityProblem", () => {
  it("counts a repeated star once", () => {
    const text = `Thiên Phủ ${syllables(78)} Thiên Phủ lặp lại không tính thêm.`;
    expect(starDensityProblem(text, STAR_LABELS, 1.5)).toBeNull();
  });
  it("flags three distinct stars in about 80 syllables at 1.5 per 80", () => {
    const text = `Thiên Phủ, Liêm Trinh và Âm Sát ${syllables(74)}.`;
    expect(starDensityProblem(text, STAR_LABELS, 1.5)).toMatch(/3 distinct star names/);
  });
  it("does not count Tử Vi when it names the discipline", () => {
    const text = `Trong Tử Vi, Thiên Phủ là sao giữ kho. Sách Tử Vi Đẩu Số gọi đó là ${syllables(66)}.`;
    expect(starDensityProblem(text, STAR_LABELS, 1)).toBeNull();
  });
});

describe("overviewArcProblem", () => {
  const para = (s: string) => `${s} ${syllables(20)}.`;
  it("requires the configured number of paragraphs", () => {
    expect(overviewArcProblem([para("Một"), para("Hai")].join("\n\n"), STAR_LABELS, 5)).toMatch(/5 paragraphs/);
  });
  it("rejects an overview that opens on a star name", () => {
    const text = [para("Thiên Phủ đóng ở Mệnh"), para("b"), para("c"), para("d"), para("e")].join("\n\n");
    expect(overviewArcProblem(text, STAR_LABELS, 5)).toMatch(/opens with a star name/);
  });
  it("accepts five paragraphs that open on the person", () => {
    const text = [para("Lá số của bạn mở đầu bằng"), para("b"), para("c"), para("d"), para("e")].join("\n\n");
    expect(overviewArcProblem(text, STAR_LABELS, 5)).toBeNull();
  });
});
