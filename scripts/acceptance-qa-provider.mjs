import assert from "node:assert/strict";
import {comprehensiveFixture} from "./acceptance-qa-comprehensive-provider.mjs";
import {TOPIC_PALACE_SCOPES} from "../packages/contracts/dist/index.js";
import {displayFact} from "../packages/backend/dist/reports/comprehensive-report-quality-v4.js";
const paragraph = "Cân nhắc kế hoạch thực tế và trao đổi rõ ràng với người đồng hành. Ghi nhận điều đã thực hiện, xem lại ưu tiên và dành thời gian lắng nghe trước khi đưa ra quyết định. ";
function prose(prefix, repeats = 9) { return prefix + " " + paragraph.repeat(repeats); }
function topicContent(input) {
  const {topicId, title, scopedFacts, allowedEvidenceKeys} = input;
  const primary = TOPIC_PALACE_SCOPES[topicId].primaryPalaces;
  const palaces = scopedFacts.natalPalaces;
  assert(primary.every(id => palaces.some(palace => palace.palaceId === id)));
  const summarize = palace => {
    const stars = palace.stars.map(star => displayFact(star.id)).filter(Boolean).slice(0, 2);
    assert(stars.length >= 2, "QA_FIXTURE_REQUIRES_TWO_SOURCE_STARS");
    return `Cung ${displayFact(palace.palaceId)} có ${stars.join(" và ")}.`;
  };
  const anchorText = palaces.slice(0, 2).map(summarize).join(" ");
  const evidenceKeys = [...allowedEvidenceKeys];
  const timing = scopedFacts.decadalTiming;
  const decadalTiming = timing.state === "active" ? {
    title: "Nhịp vận mười năm", state: timing.state, index: timing.index, ageRange: timing.ageRange,
    yearRange: timing.yearRange, palaceId: timing.palaceId,
    narrative: prose(anchorText, 9), evidenceKeys,
  } : {title: "Nhịp vận mười năm", state: timing.state, firstCycleStartAge: timing.firstCycleStartAge,
    firstCycleStartYear: timing.firstCycleStartYear, narrative: prose(anchorText, 9), evidenceKeys};
  return {topicId, title, overview: {title: "Định hướng chung", narrative: prose(anchorText, 12), evidenceKeys},
    palaceAnchors: primary.map(palaceId => ({palaceId, title: "Cung " + displayFact(palaceId),
      narrative: prose(summarize(palaces.find(palace => palace.palaceId === palaceId)), 9), evidenceKeys})),
    thematicDimensions: ["priorities", "communication"].map((key, index) => ({key,
      title: index ? "Trao đổi và điều chỉnh" : "Lựa chọn ưu tiên", narrative: prose(anchorText, 10), evidenceKeys})),
    decadalTiming, actions: [0, 1, 2].map(() => ({recommendation: prose("Ghi lại những việc cần ưu tiên.", 2),
      rationale: prose(anchorText, 2), avoid: "Tránh quyết định vội vàng khi chưa trao đổi đầy đủ.", evidenceKeys}))};
}
function periodContent(input) {
  const {facts} = input;
  return {version: 1, contentVersion: "ziwei.period-reading.v1", locale: "vi", kind: facts.kind,
    targetYear: facts.targetYear, calendar: "lunar", periodKey: facts.periodKey,
    title: facts.kind === "annual" ? `Vận hạn năm ${facts.targetYear}` : "Tháng này của bạn",
    overview: {narrative: prose("Xem lại các ưu tiên và dành thời gian chuẩn bị.", 8), evidenceKeys: facts.evidenceKeys.slice(0, 4)},
    periods: facts.periods.map(period => ({periodId: period.id, title: `Tháng ${period.month} âm lịch`,
      narrative: prose("Cân nhắc những việc phù hợp với nguồn lực hiện tại.", facts.kind === "monthly" ? 29 : 7),
      recommendations: ["Lập kế hoạch thực tế.", "Trao đổi rõ ràng với người đồng hành."],
      cautions: ["Tránh nhận quá nhiều việc khi chưa có thời gian chuẩn bị."], evidenceKeys: period.evidenceKeys}))};
}
export function createSourceBoundSyntheticProvider(receipts) {
  return {async generateStructured(request) {
    const input = JSON.parse(request.user);
    const content = /^(ziwei_comprehensive_report_section_|comprehensive_report_sectioned_critic_v4)/u.test(request.schemaName)
      ? comprehensiveFixture(request,input)
      : request.schemaName.startsWith("ziwei_topic_deep_dive_") ? topicContent(input) : periodContent(input);
    const value = request.schema.parse(content);
    receipts.push({schema: request.schemaName, syntheticMechanicsOnly: true, nativeProviderCalls: 0});
    return {ok: true, value: {value, providerId: "isolated-source-bound-synthetic", modelId: "isolated-source-bound-synthetic"}};
  }};
}
