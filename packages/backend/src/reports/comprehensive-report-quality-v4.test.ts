import { describe, expect, it } from "vitest";
import {
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_2_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
} from "./identity-report-config.js";

import { buildFacts } from "./comprehensive-report-test-facts.js";
import {
  COMPREHENSIVE_REPORT_QUALITY_FINDING_CODES_V4,
  countVietnameseSyllables,
  validateComprehensiveReportSectionQualityV4,
} from "./comprehensive-report-quality-v4.js";


const facts = buildFacts();

function evidenceKeyFor(factId: string): string {
  return facts.evidence.items.find((item) => item.sourceKeys.includes(factId))!.key;
}

function prose(words: number, suffix = "cung Mệnh sao Tử Vi sao Thiên Phủ"): string {
  return `${Array.from({ length: words }, () => "nội dung").join(" ")} ${suffix}`;
}

function gate(
  overrides: Record<string, unknown> = {},
  customFacts = facts,
  reportConfigVersion?: string,
  qualityVersion?: string,
) {
  return validateComprehensiveReportSectionQualityV4({
    key: "overview",
    kind: "overview",
    text: prose(610),
    evidenceKeys: [evidenceKeyFor("ziwei.star.ziwei"), evidenceKeyFor("ziwei.star.tianfu")],
    ...overrides,
  } as never, customFacts, reportConfigVersion, qualityVersion);
}

function expectFinding(result: ReturnType<typeof gate>, code: string): void {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.findings.some((item) => item.code === code)).toBe(true);
}

describe("comprehensive V4 section quality", () => {
  it("counts normalized whitespace-separated syllables", () => {
    expect(countVietnameseSyllables("một   hai\nba 紫微")).toBe(3);
  });

  it("rejects text below the syllable threshold", () => {
    const text = prose(295);
    expect(countVietnameseSyllables(text)).toBeLessThan(600);
    expectFinding(gate({ text }), "MINIMUM_SYLLABLES");
  });

  it.each([
    ["discouraged terms", `${prose(610)} cát tinh`, "DISCOURAGED_TERM"],
    ["death terms", `${prose(610)} tử vong`, "DEATH_TERM"],
    ["English brightness", `${prose(610)} prosperous`, "ENGLISH_BRIGHTNESS"],
    ["adverse date", `${prose(610)} tai nạn ngày 12 tháng 3, quỹ dự phòng và đọc kỹ hợp đồng`, "ADVERSE_DATE"],
    ["uncomputed year", `${prose(610)} tai nạn vào năm 2045`, "ADVERSE_DATE"],
    ["uncomputed month", `${prose(610)} trắc trở vào tháng 8`, "ADVERSE_DATE"],
    ["uncomputed age", `${prose(610)} phá sản ở tuổi 65`, "ADVERSE_DATE"],
  ])("rejects %s per section", (_name, text, code) => {
    expectFinding(gate({ text }), code);
  });

  it("permits direct traditional misfortune wording and engine-computed periods per FD-089", () => {
    // Direct misfortune without 2 preparation indicators passes (FD-089 supersedes preparation framing)
    expect(gate({ text: `${prose(610)} tai nạn và quỹ dự phòng` }).ok).toBe(true);
    // Computed annual year passes
    expect(gate({ text: `${prose(610)} năm 2026 bạn gặp hạn hao tài, trắc trở sự nghiệp.` }).ok).toBe(true);
    // Computed decadal year range passes
    expect(gate({ text: `${prose(610)} đại vận 2022-2031 có nguy cơ kiện tụng.` }).ok).toBe(true);
    // Computed decadal age passes
    expect(gate({ text: `${prose(610)} ở độ tuổi 25 có thể gặp biến cố tài chính.` }).ok).toBe(true);
  });

  it("detects Han ideographs from raw text even though normalized syllables exclude them", () => {
    const normalizedText = prose(610);
    const text = `${normalizedText} 紫微`;
    expect(countVietnameseSyllables(text)).toBe(countVietnameseSyllables(normalizedText));
    expectFinding(gate({ text }), "LOCALE_HAN");
  });

  it.each([
    "chắc chắn",
    "chắc chắn sẽ",
    "chac chan",
    "chac chan se",
    "không tránh khỏi",
    "khong tranh khoi",
    "không thể tránh",
    "khong the tranh",
    "định sẵn",
    "dinh san",
    "đại hoạ",
    "đại họa",
    "dai hoa",
    "đổi vận",
    "doi van",
    "chính xác 99%",
    "chinh xac 99%",
  ])("rejects required certainty form %s", (term) => {
    expectFinding(gate({ text: `${prose(610)} ${term}` }), "CERTAINTY");
  });

  it.each([
    "cung Phu Thê và cung Tử Tức",
    "tam phương của cung Thiên Di gồm Phu Thê và Phúc Đức",
    "đối cung Phu Thê có liên hệ với trục Mệnh",
    "xung chiếu đến Tử Tức cần được đọc cùng các sao liên quan",
  ])("permits %s as a contextual palace name", (palaceReference) => {
    expect(gate({ text: `${prose(610)} ${palaceReference}` }).ok).toBe(true);
  });

  it.each([
    "Phu Thê",
    "Tử Tức",
    "mối quan hệ Phu Thê được nhắc đến trong lời khuyên",
    "trục Mệnh cần cân nhắc mối quan hệ Phu Thê",
    "đối với Tử Tức, hãy chuẩn bị phương án phù hợp",
    "cung này được khuyên nên tránh Phu Thê",
  ])("rejects ambiguous discouraged palace phrase: %s", (phrase) => {
    expectFinding(gate({ text: `${prose(610)} ${phrase}` }), "DISCOURAGED_TERM");
  });

  it("enforces proper-name density and allows qualified preparation framing", () => {
    expectFinding(
      gate({ text: Array.from({ length: 610 }, () => "Tử Vi").join(" ") }),
      "PROPER_NAME_DENSITY",
    );
    expect(gate({
      text: `${prose(610)} tai nạn có thể xảy ra; hãy giữ quỹ dự phòng và đọc kỹ hợp đồng trước việc lớn.`,
    }).ok).toBe(true);
  });

  it("uses the V2.2 density allowance without removing the density gate", () => {
    const moderatelyDense = `${prose(610)} ${Array.from({ length: 130 }, () => "Tử Vi").join(" ")}`;
    expectFinding(
      gate(
        { text: moderatelyDense },
        facts,
        REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
        REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
      ),
      "PROPER_NAME_DENSITY",
    );
    expect(
      gate(
        { text: moderatelyDense },
        facts,
        REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
        REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_2_SENSITIVITY,
      ).ok,
    ).toBe(true);

    const excessive = `${prose(610)} ${Array.from({ length: 160 }, () => "Tử Vi").join(" ")}`;
    expectFinding(
      gate(
        { text: excessive },
        facts,
        REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
        REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_2_SENSITIVITY,
      ),
      "PROPER_NAME_DENSITY",
    );
  });

  it("does not reject dense chart names in the active V2.3 lineage", () => {
    const denseText = `${prose(610)} ${Array.from({ length: 400 }, () => "Tử Vi").join(" ")}`;
    expect(
      gate(
        { text: denseText },
        facts,
        REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
        REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
      ),
    ).toEqual({ ok: true, findings: [] });
  });

  it.each([
    ["minimum length", prose(100), "MINIMUM_SYLLABLES"],
    ["death claim", `${prose(610)} tử vong`, "DEATH_TERM"],
    ["Han locale", `${prose(610)} 紫微`, "LOCALE_HAN"],
    ["missing evidence anchors", prose(610, "sao Tử Vi"), "EVIDENCE_ANCHORS"],
  ])("keeps the V2.3 %s gate", (_name, text, code) => {
    expectFinding(gate(
      {
        text,
        ...(code === "EVIDENCE_ANCHORS"
          ? { evidenceKeys: [evidenceKeyFor("ziwei.star.ziwei")] }
          : {}),
      },
      facts,
      REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
      REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
    ), code);
  });

  it.each([
    ["ziwei.star.zuofu", "Tả Phù"],
    ["ziwei.star.wenchang", "Văn Xương"],
  ])("counts the actual minor star %s in proper-name density", (starId, label) => {
    const factsWithMinor = buildFacts({
      "ziwei.palace.life": [
        { id: "ziwei.star.ziwei", category: "major" },
        { id: "ziwei.star.tianfu", category: "major" },
        { id: starId, category: "minor" },
      ],
    });
    const minorStarMentions = 100;
    const text = `${prose(300)} ${Array.from({ length: minorStarMentions }, () => label).join(" ")}`;
    const syllables = countVietnameseSyllables(text);
    const minorStarDensity = minorStarMentions / syllables * 100;
    expect(syllables).toBeGreaterThanOrEqual(600);
    expect(minorStarDensity).toBeGreaterThan(8);
    expectFinding(gate({ text }, factsWithMinor), "PROPER_NAME_DENSITY");
    expect(gate({ text }).ok).toBe(true);
  });

  it("anchors non-palace prose to distinct source-backed facts from referenced evidence items", () => {
    expect(gate({
      evidenceKeys: [
        evidenceKeyFor("ziwei.star.ziwei"),
        evidenceKeyFor("ziwei.star.tianfu"),
        "natal.ziwei.palace.life",
      ],
      text: prose(610, "sao Tử Vi sao Thiên Phủ"),
    }).ok).toBe(true);

    expectFinding(gate({
      evidenceKeys: [evidenceKeyFor("ziwei.star.ziwei"), evidenceKeyFor("ziwei.star.ziwei")],
      text: prose(610, "sao Tử Vi"),
    }), "EVIDENCE_ANCHORS");
  });

  it("enforces palace star anchors once per distinct actual star and proves no-major safely", () => {
    const duplicateStarFacts = buildFacts({
      "ziwei.palace.life": [
        { id: "ziwei.star.ziwei", category: "major" },
        { id: "ziwei.star.ziwei", category: "major" },
      ],
    });
    expectFinding(gate({
      key: "palace:life",
      kind: "palace",
      palaceId: "ziwei.palace.life",
      text: prose(460, "cung Mệnh sao Tử Vi"),
    }, duplicateStarFacts), "PALACE_ANCHORS");

    const missingCategoryFacts = buildFacts({
      "ziwei.palace.health": [{ id: "ziwei.star.ziwei" }],
    });
    expectFinding(gate({
      key: "palace:health",
      kind: "palace",
      palaceId: "ziwei.palace.health",
      text: prose(460, "cung Tật Ách không có chính tinh"),
    }, missingCategoryFacts), "PALACE_ANCHORS");

    expect(gate({
      key: "palace:health",
      kind: "palace",
      palaceId: "ziwei.palace.health",
      text: prose(460, "cung Tật Ách không có chính tinh"),
    }).ok).toBe(true);
  });

  it("uses a closed finding-code union and bounds section key, note, and count", () => {
    const result = gate({
      key: "x".repeat(400),
      text: `${prose(1)} cát tinh tử vong chắc chắn 紫微 prosperous tai nạn ngày 12 tháng 3`,
      evidenceKeys: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.findings.length).toBeLessThanOrEqual(12);
      expect(result.findings.every((item) => (
        COMPREHENSIVE_REPORT_QUALITY_FINDING_CODES_V4.includes(item.code) &&
        item.sectionKey.length <= 96 &&
        item.note.length <= 240
      ))).toBe(true);
    }
  });
});

import {
  REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_4_BEGINNER,
} from "./identity-report-config.js";

const V42 = [REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER, REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_4_BEGINNER] as const;
const flowing = (n: number) => Array.from({ length: 5 }, (_, i) =>
  `${i === 0 ? "Lá số của bạn cho thấy" : "Đoạn tiếp theo kể"} ${Array.from({ length: n }, () => "nội dung").join(" ")} sao Tử Vi.`,
).join("\n\n");

describe("comprehensive V4 section quality, v2.4 beginner-first", () => {
  it("passes five flowing paragraphs with one star named and the rest in evidence refs", () => {
    expect(gate({ text: flowing(70) }, facts, ...V42)).toEqual({ ok: true, findings: [] });
  });

  it.each([
    ["banned phrase", `${flowing(70)} Nhưng nó có mặt sau.`, "BANNED_PHRASE"],
    ["banned opener", `${flowing(70)}\n\nChỗ dễ va chạm là tiền chung.`, "BANNED_PHRASE"],
    ["machine sub-heading", `Chỗ dễ va chạm\n${flowing(70)}`, "MACHINE_SUBHEADING"],
    ["star density", `${flowing(70)} Thiên Phủ, Liêm Trinh, Thất Sát, Thiên Cơ, Thái Âm, Cự Môn, Thiên Đồng, Thiên Lương, Vũ Khúc, Tham Lang, Phá Quân, Thái Dương, Thiên Tướng, Văn Xương, Văn Khúc, Tả Phù, Hữu Bật.`, "STAR_DENSITY"],
    ["too few overview paragraphs", flowing(70).split("\n\n").slice(0, 3).join(" "), "OVERVIEW_ARC"],
    ["overview opens on a star", `Tử Vi ${flowing(70)}`, "OVERVIEW_ARC"],
  ])("rejects %s", (_name, text, code) => {
    expectFinding(gate({ text }, facts, ...V42), code);
  });

  it("anchors non-palace sections through evidence refs, with one named in prose", () => {
    const noName = flowing(70).replaceAll("sao Tử Vi", "điều ấy");
    expectFinding(gate({ text: noName }, facts, ...V42), "EVIDENCE_ANCHORS");
    expect(gate({ text: flowing(70) }, facts, ...V42).ok).toBe(true);
  });

  it("anchors palace sections through the palace stars, with one named in prose", () => {
    const text = flowing(70).split("\n\n").join(" ");
    expect(gate({ key: "palace:ziwei.palace.life", kind: "palace", palaceId: "ziwei.palace.life", text }, facts, ...V42).ok).toBe(true);
    expectFinding(
      gate({ key: "palace:ziwei.palace.life", kind: "palace", palaceId: "ziwei.palace.life", text: text.replaceAll("sao Tử Vi", "điều ấy") }, facts, ...V42),
      "PALACE_ANCHORS",
    );
  });

  it("checks the title for banned wording", () => {
    expectFinding(gate({ text: flowing(70), title: "Chỗ đang mắc" }, facts, ...V42), "BANNED_PHRASE");
  });

  it("leaves the live v2.3 tuple unchanged", () => {
    const v23 = gate({ text: `${prose(610)} mặt sau` }, facts, REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY, REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY);
    expect(v23.ok).toBe(true);
  });
});
