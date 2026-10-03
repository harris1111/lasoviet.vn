import { describe, expect, it } from "vitest";
import type { FreePalaceGiftContentV1, FreePalaceGiftFactV1 } from "@lasoviet/contracts";
import { FREE_PALACE_MIN_NARRATIVE_CHARS, validateFreePalaceGift } from "./free-palace-quality.js";

const facts: FreePalaceGiftFactV1[] = [
  { key: "fact:one", label: "Cung Mệnh", value: "Sao Tử Vi ở thế vượng" },
  { key: "fact:two", label: "Cung Mệnh", value: "Sao Thiên Phủ hội chiếu" },
];
const point = (text: string) => ({ text, evidenceKeys: ["fact:one"] });
const prose = "Bạn là người có xu hướng giữ vai trò dẫn dắt trong những nhóm nhỏ, và điều đó thường bắt nguồn từ cách bạn cân nhắc kỹ trước khi quyết định. ".repeat(5);
const good = (): FreePalaceGiftContentV1 => ({
  palaceId: "ziwei.palace.life", title: "Cái cốt lõi của bạn", conclusion: "Cung Mệnh của bạn nghiêng về sự chủ động có cân nhắc.",
  keyPoints: [point("Bạn thích tự mình sắp xếp trình tự công việc."), point("Bạn cần thời gian trước khi chốt một lựa chọn lớn."), point("Bạn dễ được người khác tin cậy khi nói điều mình chắc chắn.")],
  narrative: prose, do: [point("Dành một buổi mỗi tuần để rà soát ưu tiên của mình.")], avoid: [point("Tránh ôm hết mọi việc về mình.")], evidenceKeys: ["fact:one", "fact:two"],
});
const run = (content: unknown, locale: "vi" | "en" = "vi", palaceId: "ziwei.palace.life" = "ziwei.palace.life") =>
  validateFreePalaceGift({ content, facts, palaceId, locale });
const codes = (result: ReturnType<typeof run>) => (result.ok ? [] : result.findings.map((f) => f.code));
const withNarrative = (extra: string) => ({ ...good(), narrative: `${prose} ${extra}` });

describe("free palace one-palace quality gate", () => {
  it("accepts a grounded, dateless, full-prose gift", () => {
    expect(prose.length).toBeGreaterThan(FREE_PALACE_MIN_NARRATIVE_CHARS);
    expect(run(good())).toEqual({ ok: true });
  });
  it("rejects schema-invalid content", () => {
    expect(codes(run({ ...good(), keyPoints: [] }))).toEqual(["schema_invalid"]);
  });
  it("rejects a gift that is not about the frozen palace", () => {
    expect(codes(run({ ...good(), palaceId: "ziwei.palace.wealth" }))).toContain("wrong_palace_focus");
    expect(codes(run({ ...good(), conclusion: "Cung Tài Bạch của bạn rất mạnh." }))).toContain("wrong_palace_focus");
  });
  it("allows relating other palaces in the body", () => {
    expect(run(withNarrative("Cung Tài Bạch hỗ trợ thêm cho cách bạn quản lý nguồn lực của mình.")).ok).toBe(true);
  });
  it.each([
    ["health", "Bạn dễ mắc ung thư nếu không cẩn thận."],
    ["death", "Bạn có nguy cơ qua đời sớm."],
    ["ritual", "Hãy làm lễ cúng sao giải hạn mỗi đầu năm."],
    ["lottery", "Hôm nay hợp đánh đề với số này."],
    ["health", "You may face cancer later."],
  ])("rejects a prohibited %s claim", (_name, text) => {
    expect(codes(run(withNarrative(text)))).toContain("prohibited_claim");
  });
  it("does not treat the palace name Tật Ách as a health claim", () => {
    expect(run(withNarrative("Cung Tật Ách chỉ là một vị trí trong lá số, không phải một lời nói về sức khỏe.")).ok).toBe(true);
  });
  it.each(["Năm 2031 sẽ là bước ngoặt.", "Vào ngày 12 tháng 3 bạn gặp may.", "Khoảng tuổi 35 bạn đổi nghề.", "Đến 40 tuổi bạn ổn định."])("rejects an unsupported date or age: %s", (text) => {
    expect(codes(run(withNarrative(text)))).toContain("uncomputed_date");
  });
  it("accepts a date only when a supplied fact carries it", () => {
    const dated = [...facts, { key: "fact:three", label: "Đại hạn", value: "Từ năm 2031 đến năm 2040" }];
    const result = validateFreePalaceGift({ content: withNarrative("Giai đoạn năm 2031 đến năm 2040 là giai đoạn nhấn mạnh sự ổn định."), facts: dated, palaceId: "ziwei.palace.life", locale: "vi" });
    expect(result.ok).toBe(true);
  });
  it("rejects a star that no supplied fact supports, but not the word Tử Vi used for the discipline", () => {
    expect(codes(run(withNarrative("Sao Thất Sát tạo nên tính cách mạnh.")))).toContain("invented_star");
    expect(run(withNarrative("Theo môn Tử Vi, mỗi cung nói về một mảng đời sống riêng biệt của bạn.")).ok).toBe(true);
  });
  it("rejects Han ideographs, raw canonical ids and English brightness labels in Vietnamese prose", () => {
    expect(codes(run(withNarrative("命宮 là tên gốc.")))).toContain("han_ideograph");
    expect(codes(run(withNarrative("Xem ziwei.star.ziwei để biết thêm.")))).toContain("canonical_id_leak");
    expect(codes(run(withNarrative("Sao ở thế prosperous và ổn định.")))).toContain("english_brightness");
    expect(codes(run(withNarrative("A weak position is not a verdict."), "en"))).not.toContain("english_brightness");
  });
  it("rejects machine sub-headings, thin prose and duplicated points", () => {
    expect(codes(run({ ...good(), narrative: `${prose}\n\n## Phần phụ\n\n${prose}` }))).toContain("machine_subheading");
    expect(codes(run({ ...good(), narrative: "Quá ngắn." }))).toContain("narrative_too_short");
    const dup = good();
    dup.do = [point(dup.keyPoints[0]!.text)];
    expect(codes(run(dup))).toContain("duplicate_points");
  });

  describe("English gifts", () => {
    const enFacts: FreePalaceGiftFactV1[] = [
      { key: "fact:one", label: "Selected palace", value: "Life Palace, at earthly branch Rat" },
      { key: "fact:two", label: "Principal star in this palace", value: "Zi Wei, exalted brightness, with Power transformation" },
    ];
    const enProse = "You tend to lead small groups and decide with care before committing to anything important, which people around you notice and trust. ".repeat(5);
    const enGood = (over: Record<string, unknown> = {}) => ({
      palaceId: "ziwei.palace.life", title: "Your core pattern", conclusion: "Your Life Palace leans toward deliberate initiative.",
      keyPoints: [point("You like to arrange the order of your own work."), point("You need time before locking in a big choice."), point("People find you reliable when you speak from certainty.")],
      narrative: enProse, do: [point("Set aside an hour each week to review your priorities.")], avoid: [point("Avoid carrying every task alone.")], evidenceKeys: ["fact:one", "fact:two"], ...over,
    });
    const runEn = (content: unknown) => validateFreePalaceGift({ content, facts: enFacts, palaceId: "ziwei.palace.life", locale: "en" });
    const enCodes = (result: ReturnType<typeof runEn>) => (result.ok ? [] : result.findings.map((f) => f.code));
    it("accepts a grounded English gift, including the discipline name and a supported star", () => {
      expect(runEn(enGood())).toEqual({ ok: true });
      expect(runEn(enGood({ narrative: `${enProse} In Zi Wei Dou Shu every palace speaks about one area of life, and Zi Wei is the star sitting here.` })).ok).toBe(true);
    });
    it("rejects an English star that no supplied fact supports", () => {
      expect(enCodes(runEn(enGood({ narrative: `${enProse} Tian Fu brings a steady temperament.` })))).toContain("invented_star");
    });
    it("applies the same prohibited-content, date and focus rules in English", () => {
      expect(enCodes(runEn(enGood({ narrative: `${enProse} You may face cancer later.` })))).toContain("prohibited_claim");
      expect(enCodes(runEn(enGood({ narrative: `${enProse} Around 2031 things change.` })))).toContain("uncomputed_date");
      expect(enCodes(runEn(enGood({ conclusion: "Your Wealth Palace is strong." })))).toContain("wrong_palace_focus");
      expect(enCodes(runEn(enGood({ narrative: `${enProse} This is a weak position, not a verdict.` })))).not.toContain("english_brightness");
    });
  });
});

