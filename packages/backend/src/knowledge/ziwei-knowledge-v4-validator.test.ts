import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { ziweiKnowledgeV4ValidationV1 } from "@lasoviet/config";

import { validateZiweiKnowledgeV4Record } from "./ziwei-knowledge-v4-validator.js";

const content = [
  "Trong đại vận này, chuyện tiền bạc cần phòng bị hơn bình thường vì Hoá Kỵ ở cung Tài Bạch.",
  "Bạn dễ gặp lời rủ rê đầu tư khi đang muốn cải thiện thu nhập và cần để ý giấy tờ trước khi quyết định.",
  "Hãy giữ quỹ dự phòng, không ký bảo lãnh và đọc kỹ hợp đồng trước các khoản lớn.",
].join(" ");

function record(overrides: Record<string, unknown> = {}) {
  return {
    passageId: "v4-ziwei-001",
    reportSections: ["primary_evidence"],
    content,
    contentHash: createHash("sha256").update(content).digest("hex"),
    metadata: {
      topics: ["finance"],
      palaces: ["cung Tài Bạch"],
      stars: ["Hoá Kỵ"],
      brightness: [],
      transformations: ["Hoá Kỵ"],
      relations: [],
      patterns: [],
      sourceType: "curated",
      languageOrigin: "vi",
      priority: 1,
    },
    sourcePassageIds: ["v3-ziwei-001"],
    dispositionRationaleCode: "rewritten",
    ...overrides,
  };
}

function issueCodes(value: unknown): string[] {
  const result = validateZiweiKnowledgeV4Record(value);
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

function nonWarningRecord(addition: string) {
  const nonWarningContent = [
    "Ngôi sao Tử Vi trong lá số gợi ý rằng bạn thường thích chủ động sắp xếp trách nhiệm và giữ nhịp làm việc rõ ràng.",
    "Khi trao đổi với người thân, bạn nên nói cụ thể điều mình cần để mọi người hiểu nhau hơn.",
    addition,
  ].join(" ");
  return record({
    content: nonWarningContent,
    contentHash: createHash("sha256").update(nonWarningContent).digest("hex"),
  });
}

describe("Zi Wei knowledge V4 validator", () => {
  it("accepts a valid candidate record with complete warning preparation", () => {
    expect(validateZiweiKnowledgeV4Record(record())).toMatchObject({ ok: true });
  });

  it("rejects death, Han ideographs, and oral filler", () => {
    expect(issueCodes(record({ content: `${content} Không nói về chết.` }))).toContain("V4_DEATH_PROHIBITED");
    expect(issueCodes(record({ content: `${content} 命盤.` }))).toContain("V4_LOCALE_HAN_PROHIBITED");
    expect(issueCodes(record({ content: `${content} Các bạn có thấy không?` }))).toContain("V4_ORAL_FILLER_PROHIBITED");
  });

  it("requires complete warning preparation", () => {
    const incomplete = "Trong đại vận này, chuyện tiền bạc cần phòng bị vì cung Tài Bạch. Bạn dễ gặp lời rủ rê đầu tư.";
    expect(issueCodes(record({
      content: incomplete,
      contentHash: createHash("sha256").update(incomplete).digest("hex"),
    }))).toContain("V4_WARNING_PREPARATION_REQUIRED");
  });

  it("rejects safety prohibitions outside warning-domain sentences", () => {
    const cases: Array<[string, string]> = [
      ["Bạn chắc chắn sẽ gặp kết quả này.", "V4_WARNING_CERTAINTY_PROHIBITED"],
      ["Việc này xảy ra vào ngày 12 tháng 3.", "V4_WARNING_DATE_PROHIBITED"],
      ["Nội dung này gọi tên ung thư.", "V4_WARNING_DISEASE_PROHIBITED"],
      ["Nội dung này khẳng định vô sinh.", "V4_WARNING_REPRODUCTIVE_CLAIM_PROHIBITED"],
      ["Nội dung này khuyên cúng giải hạn.", "V4_WARNING_REMEDY_PROHIBITED"],
      ["Mở khoá để biết điều đang chờ bạn.", "V4_WARNING_PAYWALL_PRESSURE_PROHIBITED"],
    ];
    for (const [addition, expectedCode] of cases) {
      const codes = issueCodes(nonWarningRecord(addition));
      expect(codes).toContain(expectedCode);
      expect(codes).not.toContain("V4_WARNING_PERIOD_REQUIRED");
    }
  });

  it("requires source provenance and rejects malformed record contracts", () => {
    expect(issueCodes(record({ sourcePassageIds: [] }))).toContain("V4_RECORD_SCHEMA_INVALID");
    expect(issueCodes(record({ metadata: undefined }))).toContain("V4_RECORD_SCHEMA_INVALID");
  });

  it("accepts every configured contextual exemption in prose", () => {
    const contextualCases = [
      ...ziweiKnowledgeV4ValidationV1.palaces.map((value) => `Cung ${value} được nhắc đúng ngữ cảnh.`),
      ...ziweiKnowledgeV4ValidationV1.stars.map((value) => `${value} được nhắc đúng ngữ cảnh.`),
      ...ziweiKnowledgeV4ValidationV1.transformations.map((value) => `${value} được nhắc đúng ngữ cảnh.`),
      ...ziweiKnowledgeV4ValidationV1.brightness.map((value) => `${value} là nhãn độ sáng sao được nhắc đúng ngữ cảnh.`),
      ...ziweiKnowledgeV4ValidationV1.patterns.map((value) => `${value} là tên cách cục được nhắc đúng ngữ cảnh.`),
      ...ziweiKnowledgeV4ValidationV1.timeTerms.map((value) => `${value} là mốc thời gian được nhắc đúng ngữ cảnh.`),
    ];

    for (const addition of contextualCases) {
      const candidate = `${content} ${addition}`;
      expect(issueCodes(record({
        content: candidate,
        contentHash: createHash("sha256").update(candidate).digest("hex"),
      }))).toEqual([]);
    }
  });

  it("rejects bare palace and prohibited editorial vocabulary while allowing configured proper names", () => {
    expect(issueCodes(record({
      content: `${content} Phu Thê là phần cần xem thêm.`,
      contentHash: createHash("sha256").update(`${content} Phu Thê là phần cần xem thêm.`).digest("hex"),
    }))).toContain("V4_BARE_PALACE_PROHIBITED");
    expect(issueCodes(record({
      content: `${content} Tử Tức là phần cần xem thêm.`,
      contentHash: createHash("sha256").update(`${content} Tử Tức là phần cần xem thêm.`).digest("hex"),
    }))).toContain("V4_BARE_PALACE_PROHIBITED");
    expect(issueCodes(record({
      content: `${content} Cung Tử Tức được nhắc đúng ngữ cảnh, nhưng đắc địa không được phép.`,
      contentHash: createHash("sha256").update(`${content} Cung Tử Tức được nhắc đúng ngữ cảnh, nhưng đắc địa không được phép.`).digest("hex"),
    }))).toContain("V4_EDITORIAL_TERM_PROHIBITED");
    expect(issueCodes(record({
      content: `${content} Cung Tử Tức được nhắc đúng ngữ cảnh, nhưng thất địa không được phép.`,
      contentHash: createHash("sha256").update(`${content} Cung Tử Tức được nhắc đúng ngữ cảnh, nhưng thất địa không được phép.`).digest("hex"),
    }))).toContain("V4_EDITORIAL_TERM_PROHIBITED");
    const allowedPalace = `${content} Cung Phu Thê được nhắc đúng ngữ cảnh.`;
    expect(issueCodes(record({
      content: allowedPalace,
      contentHash: createHash("sha256").update(allowedPalace).digest("hex"),
    }))).toEqual([]);
  });

  it("rejects tampered hashes and non-NFC candidate values", () => {
    expect(issueCodes(record({ contentHash: "f".repeat(64) }))).toContain("V4_CONTENT_HASH_INVALID");
    const nonNfcContent = `${content} Ca\u0301c bước chuẩn bị cần được ghi rõ.`;
    expect(issueCodes(record({
      content: nonNfcContent,
      contentHash: createHash("sha256").update(nonNfcContent).digest("hex"),
    }))).toContain("V4_NFC_REQUIRED");
  });
});
