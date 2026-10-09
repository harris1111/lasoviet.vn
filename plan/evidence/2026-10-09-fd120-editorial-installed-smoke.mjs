import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const root = process.argv[2] ?? process.cwd();
const deployedDist = resolve(root, "node_modules/@lasoviet/backend/dist");
const backendDist = existsSync(resolve(deployedDist, "index.js")) ? deployedDist : resolve(root, "packages/backend/dist");
const backend = await import(pathToFileURL(resolve(backendDist, "index.js")));
const fixture = await import(pathToFileURL(resolve(backendDist, "reports/topic-report.test-fixture.js")));
const facts = fixture.buildFactsFixture();
const report = fixture.makeValidRelationshipContent(facts);
report.actions[0].recommendation += " Bản mệnh có thể cân nhắc.";
let syntheticCalls = 0;
const provider = { async generateStructured() {
  syntheticCalls++;
  return { ok: true, value: { value: report, providerId: "synthetic-smoke", modelId: "synthetic-smoke" } };
} };
const qualityConfig = { minOverviewSyllables: 10, minPalaceAnchorSyllables: 10, minThematicDimensionSyllables: 10,
  minDecadalTimingSyllables: 10, minActionItemSyllables: 10, minTotalSyllables: 50 };
const result = await backend.generateZiweiTopicDeepDiveWithQualityLoopV4({ topicId: "relationship_marriage", facts,
  knowledgePacks: [], provider, qualityConfig });
assert(result.ok && result.value.quality.ok);
assert(result.value.quality.advisory.some(row => row.code === "DISCOURAGED_TERM"));
assert.equal(syntheticCalls, 1);
for (const text of ["Hãy hóa giải vận hạn.", "Không nên lo lắng, hãy mua bùa chú."]) {
  const wrong = structuredClone(report); wrong.actions[0].recommendation += ` ${text}`;
  const quality = backend.validateZiweiTopicDeepDiveQualityV4(wrong, facts, qualityConfig);
  assert(!quality.ok && quality.findings.some(row => row.code === "CONTENT_LINE_VIOLATION"));
}
const evidence = "period.2026-08-regular-normal.palace.ziwei.palace.life";
const periodFacts = { version: 1, kind: "monthly", targetYear: 2026, calendar: "lunar", asOfDate: "2026-09-30",
  chartId: "synthetic", chartVersionId: "synthetic-version", periodKey: "2026-08-regular", annualPalaceId: "ziwei.palace.life",
  periods: [{ id: "2026-08-regular-normal", year: 2026, month: 8, isLeapMonth: false, part: "normal", dayRange: [1, 30],
    palaceId: "ziwei.palace.life", starIds: [], obstacleStarIds: [], evidenceKeys: [evidence] }], evidenceKeys: [evidence] };
const prose = "Cân nhắc kế hoạch thực tế và trao đổi rõ ràng với người đồng hành. ";
const content = { version: 1, contentVersion: "ziwei.period-reading.v1", locale: "vi", kind: "monthly", targetYear: 2026,
  calendar: "lunar", periodKey: periodFacts.periodKey, title: "Tháng tám âm lịch",
  overview: { narrative: prose.repeat(15) + " Bản mệnh.", evidenceKeys: [evidence] },
  periods: [{ periodId: periodFacts.periods[0].id, title: "Tháng tám", narrative: prose.repeat(55),
    recommendations: ["Lập kế hoạch.", "Ghi lại ưu tiên."], cautions: ["Tránh nhận quá nhiều việc."], evidenceKeys: [evidence] }] };
assert.deepEqual(backend.validatePeriodReading(content, periodFacts), { ok: true, findings: [], advisory: ["EDITORIAL_TERM"] });
content.periods[0].narrative += " Ngày 12 có biến động.";
assert(backend.validatePeriodReading(content, periodFacts).findings.includes("UNCOMPUTED_DAY"));
assert.equal(backend.REPORT_QUALITY_VERSION_TOPIC_DEEP_DIVE_V2, "ziwei.topic-deep-dive.quality.v2");
assert.equal(backend.PERIOD_READING_TUPLE.qualityVersion, "ziwei.period-reading.quality.v2");
console.log(JSON.stringify({ status: "PASS", editorialAdvisory: true, hardContentAndFacts: true, qualityV2: true,
  syntheticCalls, physicalProviderCalls: 0, databaseWrites: 0, financialWrites: 0, customerSends: 0, manualAccepted: false }));
