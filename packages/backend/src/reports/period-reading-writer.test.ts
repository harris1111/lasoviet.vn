import { describe, expect, it, vi } from "vitest";
import type { ZiweiPeriodReadingContentV1, ZiweiPeriodReadingFactsV1 } from "@lasoviet/contracts";
import { validatePeriodReading, writePeriodReading } from "./period-reading-writer.js";
const evidenceKey = "period.2026-08-regular-normal.palace.ziwei.palace.life";
const facts: ZiweiPeriodReadingFactsV1 = { version: 1, kind: "monthly", targetYear: 2026, calendar: "lunar", asOfDate: "2026-09-30", chartId: "chart", chartVersionId: "version", periodKey: "2026-08-regular", annualPalaceId: "ziwei.palace.life", periods: [{ id: "2026-08-regular-normal", year: 2026, month: 8, isLeapMonth: false, part: "normal", dayRange: [1, 30], palaceId: "ziwei.palace.life", starIds: [], obstacleStarIds: [], evidenceKeys: [evidenceKey] }], evidenceKeys: [evidenceKey] };
const prose = (count: number) => "Cân nhắc kế hoạch thực tế và trao đổi rõ ràng với người đồng hành. ".repeat(count);
function content(): ZiweiPeriodReadingContentV1 { return { version: 1, contentVersion: "ziwei.period-reading.v1", locale: "vi", kind: "monthly", targetYear: 2026, calendar: "lunar", periodKey: facts.periodKey, title: "Tháng tám âm lịch", overview: { narrative: prose(15), evidenceKeys: [evidenceKey] }, periods: [{ periodId: facts.periods[0]!.id, title: "Tháng tám", narrative: prose(55), recommendations: ["Lập kế hoạch.", "Ghi lại ưu tiên."], cautions: ["Tránh nhận quá nhiều việc."], evidenceKeys: [evidenceKey] }] }; }
describe("period writer fail-closed quality", () => {
  it.each([
    "Đây là bối cảnh đòi hỏi sự tỉnh táo cao độ chứ không phải điềm báo chắc chắn về tai họa.",
    "Đây là ngữ cảnh nhắc nhở bạn nên rà soát kỹ các khoản thanh toán, hạn chế mua sắm vượt quá khả năng thực tế chứ không phải là điều chắc chắn xảy ra rủi ro.",
    "Đây là bối cảnh cần sự minh bạch và đối thoại ôn hòa để giữ gìn sự yên ấm chứ không phải điềm báo chắc chắn về tranh chấp.",
    "Không phải điềm báo chắc chắn về tranh chấp.".normalize("NFD"),
  ])("accepts an immediate explicit denial of certainty: %s", text => {
    const report = content(); report.periods[0]!.narrative += text;
    const source = { ...facts, periods: facts.periods.map(period => ({ ...period, obstacleStarIds: ["ziwei.star.lianZhen"] })) };
    expect(validatePeriodReading(report, source).ok).toBe(true);
  });
  it.each([
    "Bạn chắc chắn sẽ gặp tranh chấp.",
    "Không phải điềm báo chắc chắn, nhưng bạn chắc chắn sẽ gặp tranh chấp.",
    "Bạn chắc chắn gặp tranh chấp, không phải điềm báo chắc chắn.",
    "Không phải điềm báo, chắc chắn sẽ gặp tranh chấp.",
    "Không phải không chắc chắn sẽ gặp tranh chấp.",
    "Không phải không phải điềm báo chắc chắn sẽ xảy ra tranh chấp.",
    "Không thể nói rằng không phải điềm báo chắc chắn sẽ xảy ra tranh chấp.",
    "Không thể nói rằng, không phải điềm báo chắc chắn sẽ xảy ra tranh chấp.",
    "Phủ nhận việc đây không phải điềm báo chắc chắn sẽ xảy ra tranh chấp.",
    "Không chỉ là điều chắc chắn sẽ gặp tranh chấp.",
    "Không phải điềm báo chắc chắn, hãy mua bùa chú.",
    "Không phải điềm báo chắc chắn nhưng không tránh khỏi tranh chấp.",
  ])("preserves affirmative certainty and mixed-content stops: %s", text => {
    const report = content(); report.periods[0]!.narrative += text;
    expect(validatePeriodReading(report, facts).findings).toContain("CONTENT_LINE_VIOLATION");
  });
  it("returns editorial advice after one provider call without corrective billing", async () => {
    const report = content(); report.overview.narrative += " Bản mệnh có thể cân nhắc.";
    const generateStructured = vi.fn().mockResolvedValue({ ok: true, value: { value: report, providerId: "fixture", modelId: "fixture" } });
    const result = await writePeriodReading({ facts, provider: { generateStructured } });
    expect(result).toMatchObject({ ok: true, value: { quality: { ok: true, findings: [], advisory: ["EDITORIAL_TERM"] } } });
    expect(generateStructured).toHaveBeenCalledTimes(1);
  });
  it.each(["Nên mua bùa để giải hạn.", "Hãy cúng giải hạn.", "Số xổ số phù hợp là 12.", "Ngày 12 có biến động.", "Giải hạn bằng cách mua lễ dâng sao.", "Hóa giải vận hạn bằng lễ dâng sao.", "Hãy mua vòng phong thủy để cải vận.", "Hãy hóa giải vận hạn.", "Không nên lo lắng, hãy mua bùa chú."])("rejects mixed editorial and hard failures: %s", text => {
    const report = content(); report.overview.narrative += ` Bản mệnh. ${text}`;
    const quality = validatePeriodReading(report, facts);
    expect(quality.ok).toBe(false);
    expect(quality.advisory).toContain("EDITORIAL_TERM");
    expect(quality.findings).toContain(text.startsWith("Ngày") ? "UNCOMPUTED_DAY" : "CONTENT_LINE_VIOLATION");
  });
  it("accepts only matching period lineage/evidence and adequate depth", () => {
    expect(validatePeriodReading(content(), facts).ok).toBe(true);
    const wrong = content(); wrong.periods[0]!.evidenceKeys = ["foreign-period"];
    expect(validatePeriodReading(wrong, facts).findings).toContain("EVIDENCE_MISMATCH");
    wrong.periodKey = "2027";
    expect(validatePeriodReading(wrong, facts).findings).toContain("PERIOD_LINEAGE_MISMATCH");
  });
  it.each(["tháng ba", "tháng 12", "tháng mười một"])("rejects naming an uncomputed month: %s", text => {
    const wrong = content(); wrong.periods[0]!.narrative += text;
    expect(validatePeriodReading(wrong, facts).findings).toContain("UNCOMPUTED_MONTH");
  });
  it("rejects exact-day prediction and uncomputed adverse claims", () => {
    const wrong = content(); wrong.periods[0]!.narrative += " Ngày 12 có hạn nặng.";
    expect(validatePeriodReading(wrong, facts).findings).toEqual(expect.arrayContaining(["UNCOMPUTED_DAY", "UNCOMPUTED_ADVERSITY"]));
  });
  it("does not transfer an adverse monthly fact to another month in the overview", () => {
    const annual = { ...facts, kind: "annual" as const, periods: [{ ...facts.periods[0]!, obstacleStarIds: ["ziwei.star.lianZhen"] }, { ...facts.periods[0]!, id: "september", month: 9 }] };
    const wrong = content(); wrong.kind = "annual"; wrong.overview.narrative += " Tháng chín hao tài.";
    expect(validatePeriodReading(wrong, annual).findings).toContain("UNCOMPUTED_ADVERSITY");
  });
  it.each([
    ["Bạn có nguy cơ mắc ung thư.", "NAMED_DISEASE_DIAGNOSIS"],
    ["Điểm vận may là 90 điểm.", "UNCOMPUTED_SCORE"],
    ["Khả năng thuận lợi là 90%.", "UNCOMPUTED_SCORE"],
    ["tháng mười một".normalize("NFD"), "UNCOMPUTED_MONTH"],
  ])("rejects unsupported claims: %s", (text, finding) => {
    const wrong = content(); wrong.periods[0]!.narrative += text;
    expect(validatePeriodReading(wrong, facts).findings).toContain(finding);
  });
  it("allows one corrective rewrite and never returns failed quality as success", async () => {
    const wrong = content(); wrong.periods[0]!.narrative = "Ngắn.";
    const generateStructured = vi.fn().mockResolvedValue({ ok: true, value: { value: wrong, providerId: "fixture", modelId: "fixture" } });
    const result = await writePeriodReading({ facts, provider: { generateStructured }, costContext: { idempotencyKey: "report-1" } });
    expect(result).toMatchObject({ ok: false, error: { code: "PERIOD_QUALITY_REJECTED" } });
    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(generateStructured.mock.calls[1]?.[0].purpose).toBe("rewrite");
    expect(generateStructured.mock.calls[0]?.[0].costContext.idempotencyKey).toBe("report-1:report");
    expect(generateStructured.mock.calls[1]?.[0].costContext.idempotencyKey).toBe("report-1:rewrite");
  });
  it("never returns mixed editorial and ritual failures as a publishable result", async () => {
    const wrong = content(); wrong.overview.narrative += " Bản mệnh nên mua bùa để giải hạn.";
    const generateStructured = vi.fn().mockResolvedValue({ ok: true, value: { value: wrong, providerId: "fixture", modelId: "fixture" } });
    const result = await writePeriodReading({ facts, provider: { generateStructured } });
    expect(result).toMatchObject({ ok: false, error: { code: "PERIOD_QUALITY_REJECTED" }, findings: ["CONTENT_LINE_VIOLATION"] });
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });
});
