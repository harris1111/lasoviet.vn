import { describe, expect, it, vi } from "vitest";
import type { ZiweiPeriodReadingContentV1, ZiweiPeriodReadingFactsV1 } from "@lasoviet/contracts";
import { validatePeriodReading, writePeriodReading } from "./period-reading-writer.js";
const evidenceKey = "period.2026-08-regular-normal.palace.ziwei.palace.life";
const facts: ZiweiPeriodReadingFactsV1 = { version: 1, kind: "monthly", targetYear: 2026, calendar: "lunar", asOfDate: "2026-09-30", chartId: "chart", chartVersionId: "version", periodKey: "2026-08-regular", annualPalaceId: "ziwei.palace.life", periods: [{ id: "2026-08-regular-normal", year: 2026, month: 8, isLeapMonth: false, part: "normal", dayRange: [1, 30], palaceId: "ziwei.palace.life", starIds: [], obstacleStarIds: [], evidenceKeys: [evidenceKey] }], evidenceKeys: [evidenceKey] };
const prose = (count: number) => "Cân nhắc kế hoạch thực tế và trao đổi rõ ràng với người đồng hành. ".repeat(count);
function content(): ZiweiPeriodReadingContentV1 { return { version: 1, contentVersion: "ziwei.period-reading.v1", locale: "vi", kind: "monthly", targetYear: 2026, calendar: "lunar", periodKey: facts.periodKey, title: "Tháng tám âm lịch", overview: { narrative: prose(15), evidenceKeys: [evidenceKey] }, periods: [{ periodId: facts.periods[0]!.id, title: "Tháng tám", narrative: prose(55), recommendations: ["Lập kế hoạch.", "Ghi lại ưu tiên."], cautions: ["Tránh nhận quá nhiều việc."], evidenceKeys: [evidenceKey] }] }; }
describe("period writer fail-closed quality", () => {
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
  it("allows one corrective rewrite and never returns failed quality as success", async () => {
    const wrong = content(); wrong.periods[0]!.narrative = "Ngắn.";
    const generateStructured = vi.fn().mockResolvedValue({ ok: true, value: { value: wrong, providerId: "fixture", modelId: "fixture" } });
    const result = await writePeriodReading({ facts, provider: { generateStructured } });
    expect(result).toMatchObject({ ok: false, error: { code: "PERIOD_QUALITY_REJECTED" } });
    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(generateStructured.mock.calls[1]?.[0].purpose).toBe("rewrite");
  });
});
