import { describe, expect, it, vi } from "vitest";
import { ReportReadyViewV1Schema } from "@lasoviet/contracts";
import { createReportGenerationService, type ReportGenerationServiceDependencies, type GenerateReportInput } from "./report-generation.service.js";
import { createReportQueryService, ReportQueryDataError, type AuthorizedReportQueryRecord } from "./report-query.service.js";
import { facts, content } from "./period-report.test-fixture.js";
import { periodReportVersions } from "./period-report-config.js";
const tuple = periodReportVersions();
const reportId = "e51a9f02-0731-4cb9-b7a5-273adacb3c51";
const payload = { reportId, reportVersionId: "rv", entitlementId: "ent", chartVersionId: "version", evidenceVersionId: "ev", knowledgeVersionId: tuple.knowledgeVersion, promptVersion: tuple.promptVersion, reportConfigVersion: tuple.reportConfigVersion, sku: "ZIWEI-MONTHLY-P0", locale: "vi" as const, asOfDate: "2026-09-30", targetYear: 2026, timingRuleVersion: tuple.timingRuleVersion, sensitivityRuleVersion: "ziwei.birth-time-sensitivity.v1" };
const input: GenerateReportInput = { job: { schemaVersion: 2, name: "report.generate.v2", sourceEventId: "event", traceId: "trace", idempotencyKey: "job", payload }, attemptNumber: 1, workerId: "worker" };
function setup() {
  const commit = vi.fn(async (value: unknown) => ({ ok: true, value }));
  const lifecycle = vi.fn(async () => ({ ok: true, value: { readingContextRevisionId: null } }));
  const budget = vi.fn(async () => ({ok: true, value: {consumed: true}}));
  const dependencies = { gate: { allows: () => true }, provider: { generateStructured: vi.fn(async (_request: unknown) => ({ok:true,value:{value:content(),providerId:"fixture",modelId:"fixture"}})) }, sourceSnapshotPreparer: { prepare: vi.fn(async () => ({ok: true, value: {}})) }, sourceRepository: { loadSource: vi.fn(async () => ({ok: true, value: {periodReadingFacts: facts, paidPeriodKey: facts.periodKey, knowledgePacks: []}})), validateLifecycle: lifecycle }, versionRepository: { getImmutableVersion: vi.fn(async () => null), startOrReuseAttempt: vi.fn(async () => ({ok: true})), recordFailedAttempt: vi.fn(async () => ({ok: true})), consumeRewriteBudget: budget, commitImmutableVersion: commit } };
  return { service: createReportGenerationService(dependencies as unknown as ReportGenerationServiceDependencies), commit, lifecycle, budget, dependencies };
}
describe("paid period delivery", () => {
  it("commits only the computed paid period and strips evidence from the reader", async () => {
    const {service,commit,dependencies} = setup();
    expect((await service.generate(input)).ok).toBe(true);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({sku:payload.sku,structuredContent:content(),templateVersion:tuple.templateVersion}));
    expect(dependencies.provider.generateStructured.mock.calls[0]?.[0]).toMatchObject({schemaName:"ziwei_period_reading_v1",costContext:{idempotencyKey:"rv:period:report"}});
    const record = {source:"ledger_spend",chartId:"chart",wallet:{spendId:"spend",purchaseIntentId:"intent"},evidenceItems:[],sourceSnapshot:{periodReading:facts},reservation:{...payload,status:"html_ready"},version:{...payload,structuredContent:content(),templateVersion:tuple.templateVersion,renderVersion:tuple.renderVersion},entitlements:[{id:"ent",chartId:"chart",sku:payload.sku,scope:{sections:["periodReading"]},periodKey:facts.periodKey,active:true,source:"ledger_spend"}]} as unknown as AuthorizedReportQueryRecord;
    const repository={readAuthorizedReport:vi.fn(async()=>record)};const query=createReportQueryService({repository});const actor={kind:"account" as const,userId:"owner",sessionId:"session",requestId:"request"};
    const result=await query.getReport(actor,reportId);expect(result.ok).toBe(true);if(!result.ok)throw new Error("not ready");expect(ReportReadyViewV1Schema.safeParse(result.value).success).toBe(true);
    expect(JSON.stringify(result.value)).not.toMatch(/evidenceKeys|periodId/);
    record.entitlements[0]!.periodKey="2026-09-regular";await expect(query.getReport(actor,reportId)).rejects.toBeInstanceOf(ReportQueryDataError);
    record.entitlements[0]!.periodKey=facts.periodKey;record.entitlements[0]!.id="other-month-entitlement";await expect(query.getReport(actor,reportId)).rejects.toBeInstanceOf(ReportQueryDataError);
  });
  it("rejects unpaid periods, wrong source dates, and natal tuples before provider dispatch", async () => {
    for (const change of [{paidPeriodKey:"2026-09-regular"},{periodReadingFacts:{...facts,asOfDate:"2026-09-01"}},{periodReadingFacts:{...facts,chartVersionId:"other"}}]) {
      const {service,commit,dependencies}=setup();dependencies.sourceRepository.loadSource.mockResolvedValue({ok:true,value:{periodReadingFacts:facts,paidPeriodKey:facts.periodKey,knowledgePacks:[],...change}});
      expect((await service.generate(input)).ok).toBe(false);expect(commit).not.toHaveBeenCalled();expect(dependencies.provider.generateStructured).not.toHaveBeenCalled();
    }
    const {service,dependencies}=setup();expect((await service.generate({...input,job:{...input.job,payload:{...payload,reportConfigVersion:"ziwei.comprehensive.report.v4.1.1"}}})).ok).toBe(false);expect(dependencies.provider.generateStructured).not.toHaveBeenCalled();
  });
  it("consumes one durable rewrite and fences revoked authority before further disclosure", async () => {
    const first=setup();const bad=content();bad.periods[0]!.narrative="Ngắn.";
    first.dependencies.provider.generateStructured.mockResolvedValue({ok:true,value:{value:bad,providerId:"fixture",modelId:"fixture"}});
    expect((await first.service.generate(input)).ok).toBe(false);expect(first.budget).toHaveBeenCalledTimes(1);expect(first.dependencies.provider.generateStructured).toHaveBeenCalledTimes(2);expect(first.commit).not.toHaveBeenCalled();
    const rejected=setup();rejected.dependencies.provider.generateStructured.mockResolvedValue({ok:true,value:{value:bad,providerId:"fixture",modelId:"fixture"}});rejected.budget.mockResolvedValue({ok:true,value:{consumed:false}});
    expect((await rejected.service.generate(input)).ok).toBe(false);expect(rejected.dependencies.provider.generateStructured).toHaveBeenCalledTimes(1);
    const revoked=setup();revoked.lifecycle.mockResolvedValueOnce({ok:true,value:{readingContextRevisionId:null}}).mockResolvedValueOnce({ok:false,error:{code:"REPORT_PROFILE_PURGED"}} as never);
    expect((await revoked.service.generate(input)).ok).toBe(false);expect(revoked.commit).not.toHaveBeenCalled();
  });
  it("allows January Gregorian/lunar year difference when the immutable period agrees", async () => {
    const {service,dependencies}=setup();const january={...facts,asOfDate:"2026-01-15",targetYear:2025,periodKey:"2025-11-regular",periods:[{...facts.periods[0]!,id:"2025-11-regular-normal",year:2025,month:11}]};const output=content();output.targetYear=2025;output.periodKey=january.periodKey;output.title="Tháng mười một âm lịch";output.periods[0]!.periodId=january.periods[0]!.id;output.periods[0]!.title="Tháng mười một";
    dependencies.sourceRepository.loadSource.mockResolvedValue({ok:true,value:{periodReadingFacts:january,paidPeriodKey:january.periodKey,knowledgePacks:[]}});dependencies.provider.generateStructured.mockResolvedValue({ok:true,value:{value:output,providerId:"fixture",modelId:"fixture"}});
    expect((await service.generate({...input,job:{...input.job,payload:{...payload,asOfDate:"2026-01-15",targetYear:2026}}})).ok).toBe(true);
  });
});

// Synthetic writer fixtures exercise real dispatch/quality/read guards; no live provider call.
function annualFixture(year: number) {
  const annualFacts = {...facts, kind: "annual" as const, targetYear: year, periodKey: String(year),
    periods: Array.from({length: 12}, (_, index) => ({...facts.periods[0]!, year, month: index + 1,
      id: `${year}-${index + 1}-regular-normal`, evidenceKeys: [`period.${year}.${index + 1}.life`]}))};
  annualFacts.evidenceKeys = annualFacts.periods.flatMap(period => period.evidenceKeys);
  const base = content();
  const annualContent = {...base, kind: "annual" as const, targetYear: year, periodKey: String(year), title: `Năm ${year}`,
    overview: {...base.overview, evidenceKeys: annualFacts.evidenceKeys},
    periods: annualFacts.periods.map(period => ({...base.periods[0]!, periodId: period.id, title: `Tháng ${period.month}`,
      evidenceKeys: period.evidenceKeys}))};
  return {annualFacts, annualContent};
}
it.each([2026, 2027, 2028])("generates and reads the frozen generic annual year%s with all12 periods", async year => {
  const {annualFacts, annualContent} = annualFixture(year); const {service, dependencies, commit} = setup();
  const annualPayload = {...payload, sku: "ZIWEI-YEAR-P0", targetYear: year};
  dependencies.sourceRepository.loadSource.mockResolvedValue({ok: true, value: {periodReadingFacts: annualFacts, paidPeriodKey: String(year), knowledgePacks: []}});
  dependencies.provider.generateStructured.mockResolvedValue({ok: true, value: {value: annualContent, providerId: "synthetic", modelId: "synthetic"}});
  expect((await service.generate({...input, job: {...input.job, payload: annualPayload}})).ok).toBe(true);
  expect(dependencies.provider.generateStructured).toHaveBeenCalledTimes(1);
  expect(commit).toHaveBeenCalledWith(expect.objectContaining({sku: "ZIWEI-YEAR-P0", structuredContent: annualContent}));
  const record = {source: "ledger_spend", chartId: "chart", wallet: {spendId: "spend", purchaseIntentId: "intent"}, evidenceItems: [],
    sourceSnapshot: {periodReading: annualFacts}, reservation: {...annualPayload, status: "html_ready"},
    version: {...annualPayload, structuredContent: annualContent, templateVersion: tuple.templateVersion, renderVersion: tuple.renderVersion},
    entitlements: [{id: "ent", chartId: "chart", sku: "ZIWEI-YEAR-P0", scope: {sections: ["periodReading"]}, periodKey: String(year), active: true, source: "ledger_spend"}]} as unknown as AuthorizedReportQueryRecord;
  const query = createReportQueryService({repository: {readAuthorizedReport: async () => record}, now: () => new Date("2029-03-01T00:00:00Z")});
  const actor = {kind: "account" as const, userId: "owner", sessionId: "session", requestId: "request"};
  expect(await query.getReport(actor, reportId)).toMatchObject({ok: true, value: {state: "ready", content: {targetYear: year, periods: expect.any(Array)}}});
  const view = await query.getReport(actor, reportId); expect(JSON.stringify(view)).not.toMatch(/evidenceKeys|periodId/);
  record.entitlements[0]!.periodKey = String(year + 1);
  await expect(query.getReport(actor, reportId)).rejects.toBeInstanceOf(ReportQueryDataError);
});
it("rejects annual source/job mismatch before a provider call and preserves the closed legacy2026 SKU", async () => {
  for (const [sku, factsYear, jobYear] of [["ZIWEI-YEAR-P0", 2027, 2026], ["ZIWEI-YEAR-2026-P0", 2027, 2027]] as const) {
    const {annualFacts} = annualFixture(factsYear); const {service, dependencies, commit} = setup();
    dependencies.sourceRepository.loadSource.mockResolvedValue({ok: true, value: {periodReadingFacts: annualFacts, paidPeriodKey: String(factsYear), knowledgePacks: []}});
    expect((await service.generate({...input, job: {...input.job, payload: {...payload, sku, targetYear: jobYear}}})).ok).toBe(false);
    expect(dependencies.provider.generateStructured).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled();
  }
  const {annualFacts, annualContent} = annualFixture(2026); const {service, dependencies} = setup();
  dependencies.sourceRepository.loadSource.mockResolvedValue({ok: true, value: {periodReadingFacts: annualFacts, paidPeriodKey: "2026", knowledgePacks: []}});
  dependencies.provider.generateStructured.mockResolvedValue({ok: true, value: {value: annualContent, providerId: "synthetic", modelId: "synthetic"}});
  expect((await service.generate({...input, job: {...input.job, payload: {...payload, sku: "ZIWEI-YEAR-2026-P0"}}})).ok).toBe(true);
});
