import { describe, expect, it } from "vitest";

import { splitLeadSentence, splitNarrative } from "./report-paragraphs";

const seven = "Một là một. Hai là hai. Ba là ba. Bốn là bốn. Năm là năm. Sáu là sáu. Bảy là bảy.";

describe("splitNarrative", () => {
  it("returns no paragraphs for blank text", () => {
    expect(splitNarrative("  \n ")).toEqual([]);
  });

  it("keeps the model's blank-line paragraphs", () => {
    expect(splitNarrative("Câu một. Câu hai.\n\nCâu ba.")).toEqual(["Câu một. Câu hai.", "Câu ba."]);
  });

  it("treats single newlines as paragraph breaks", () => {
    expect(splitNarrative("Câu một.\nCâu hai.")).toEqual(["Câu một.", "Câu hai."]);
  });

  it("groups unbroken text into three-sentence paragraphs", () => {
    expect(splitNarrative(seven).map((p) => p.split(". ").length)).toEqual([3, 3, 1]);
  });

  it("does not split inside decimals", () => {
    expect(splitNarrative("Thu nhập tăng 2.5 lần. Chi tiêu giữ nguyên.")).toEqual([
      "Thu nhập tăng 2.5 lần. Chi tiêu giữ nguyên.",
    ]);
  });

  it("chunks an over-long model paragraph", () => {
    expect(splitNarrative(`${seven}\n\nCâu cuối.`)).toHaveLength(4);
  });

  it("splits before Vietnamese capitals with diacritics", () => {
    expect(splitNarrative("A. B. C. D. Đây là câu năm.")).toEqual(["A. B. C.", "D. Đây là câu năm."]);
  });
});

describe("splitLeadSentence", () => {
  it("separates the first sentence", () => {
    expect(splitLeadSentence("Câu một. Câu hai.")).toEqual({ lead: "Câu một.", rest: " Câu hai." });
  });

  it("returns the whole paragraph when it has one sentence", () => {
    expect(splitLeadSentence("Chỉ một câu.")).toEqual({ lead: "Chỉ một câu.", rest: "" });
  });
});
