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

  it("rejects every configured process term in prose with whole-term semantics", () => {
    for (const term of ziweiKnowledgeV4ValidationV1.prohibitedProcessTerms) {
      const surface = term === "V4" ? "v4" : term;
      const candidate = nonWarningRecord(`Cụm từ ${surface} không được xuất hiện trong phần này.`);
      expect(issueCodes(candidate)).toContain("V4_PROCESS_TERM_PROHIBITED");
    }
  });

  it("rejects the final editorial-process variants without matching embedded text", () => {
    const prohibitedCases = [
      "biên tập",
      "đầu vào",
      "phép tính",
      "tái tạo nguồn",
      "cấu hình kỹ thuật",
      "bản mới",
    ];
    for (const term of prohibitedCases) {
      expect(issueCodes(nonWarningRecord(`Cụm ${term} không được xuất hiện trong phần này.`)))
        .toContain("V4_PROCESS_TERM_PROHIBITED");
    }

    for (const ordinaryCase of [
      "Bạn có thể chuyển thành từng bước nhỏ để dễ theo dõi hơn.",
      "Quy trình bàn giao ở nơi làm việc cần rõ ràng và tôn trọng mọi người.",
      "Từ đầu vàoX và phép tínhX chỉ là các ví dụ về cách ghép chữ.",
      "Bản mớiX là cách ghi tên một mục riêng.",
    ]) {
      expect(issueCodes(nonWarningRecord(ordinaryCase)))
        .not.toContain("V4_PROCESS_TERM_PROHIBITED");
    }
  });

  it("rejects every configured English prose term in localized content only", () => {
    for (const term of ziweiKnowledgeV4ValidationV1.prohibitedEnglishProseTerms) {
      const candidate = nonWarningRecord(`Từ ${term.toUpperCase()} không được xuất hiện trong phần này.`);
      expect(issueCodes(candidate)).toContain("V4_ENGLISH_PROSE_PROHIBITED");
    }
  });

  it("keeps process terms out of metadata and canonical identifiers", () => {
    const candidate = record({
      passageId: "v4-AI-V4-identifier-key-provenance-prose-metadata-mapping-output-template",
      metadata: {
        topics: ["dữ liệu"],
        palaces: ["cung Tài Bạch"],
        stars: ["Hoá Kỵ"],
        brightness: [],
        transformations: ["Hoá Kỵ"],
        relations: ["cách tính"],
        patterns: ["ma trận"],
        sourceType: "matrix",
        languageOrigin: "vi",
        priority: 1,
      },
      sourcePassageIds: ["v3-kết-quả-trung-gian-công-cụ-truy-xuất"],
    });
    expect(issueCodes(candidate)).not.toContain("V4_PROCESS_TERM_PROHIBITED");
  });

  it("does not match ordinary lowercase ai or terms embedded in longer words", () => {
    const candidate = nonWarningRecord(
      "Ai cũng có cách riêng; Mai dùng monkey, keyboard, outputting, templateX và V42 làm ví dụ.",
    );
    expect(issueCodes(candidate)).not.toContain("V4_PROCESS_TERM_PROHIBITED");
  });

  it("applies appropriate case semantics to AI and process vocabulary", () => {
    expect(issueCodes(nonWarningRecord("AI không được nhắc trong phần này.")))
      .toContain("V4_PROCESS_TERM_PROHIBITED");
    expect(issueCodes(nonWarningRecord("ai cũng có thể tự quan sát thói quen của mình.")))
      .not.toContain("V4_PROCESS_TERM_PROHIBITED");
    expect(issueCodes(nonWarningRecord("Identifier cũng không được nhắc trong phần này.")))
      .toContain("V4_PROCESS_TERM_PROHIBITED");
    expect(issueCodes(nonWarningRecord("HỆ THỐNG cũng không được nhắc trong phần này.")))
      .toContain("V4_PROCESS_TERM_PROHIBITED");
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

  it("requires canonical proper palace labels without rejecting ordinary palace phrases", () => {
    for (const palace of ziweiKnowledgeV4ValidationV1.palaces) {
      const candidate = `${content} Cung ${palace} được nhắc đúng ngữ cảnh.`;
      expect(issueCodes(record({
        content: candidate,
        contentHash: createHash("sha256").update(candidate).digest("hex"),
      }))).not.toContain("V4_PALACE_LABEL_PROHIBITED");
    }

    for (const alias of ["Cung Bạn Hữu", "Cung Công Danh", "cung Gia Đạo"]) {
      const candidate = `${content} ${alias} được nhắc đúng ngữ cảnh.`;
      expect(issueCodes(record({
        content: candidate,
        contentHash: createHash("sha256").update(candidate).digest("hex"),
      }))).toContain("V4_PALACE_LABEL_PROHIBITED");
    }

    for (const ordinaryPhrase of ["cung này", "cung liên hệ", "cung đang xét"]) {
      const candidate = `${content} ${ordinaryPhrase} cần được giải thích rõ ràng.`;
      expect(issueCodes(record({
        content: candidate,
        contentHash: createHash("sha256").update(candidate).digest("hex"),
      }))).not.toContain("V4_PALACE_LABEL_PROHIBITED");
    }
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
