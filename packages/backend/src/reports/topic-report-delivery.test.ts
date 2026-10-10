import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectTopicDeepDivePublicContent, ReportReadyViewV1Schema } from "@lasoviet/contracts";
import { createReportGenerationService, type ReportGenerationServiceDependencies, type GenerateReportInput } from "./report-generation.service.js";
import { createReportQueryService, ReportQueryDataError, type AuthorizedReportQueryRecord } from "./report-query.service.js";
import { writeZiweiTopicDeepDiveV4 } from "./topic-deep-dive-writer-v4.js";
import { buildFactsFixture, makeBusinessContentFixture, makeCareerTransitionContentFixture, makeFamilyChildrenContentFixture, makeStudyHousingContentFixture, makeValidRelationshipContent } from "./topic-report.test-fixture.js";
import { topicReportVersions } from "./topic-report-config.js";

vi.mock("./topic-deep-dive-writer-v4.js", () => ({ writeZiweiTopicDeepDiveV4: vi.fn() }));
const facts = buildFactsFixture();
const content = makeValidRelationshipContent(facts);
const tuple = topicReportVersions();
const reportId = "e51a9f02-0731-4cb9-b7a5-273adacb3c51";
const payload = { reportId, reportVersionId: "rv", entitlementId: "ent", chartVersionId: "cv", evidenceVersionId: "ev", knowledgeVersionId: tuple.knowledgeVersion, promptVersion: tuple.promptVersion, reportConfigVersion: tuple.reportConfigVersion, sku: "ZIWEI-RELATIONSHIP-P0", locale: "vi" as const, asOfDate: "2026-09-30", targetYear: 2026, timingRuleVersion: tuple.timingRuleVersion, sensitivityRuleVersion: "ziwei.birth-time-sensitivity.v1" };
const input: GenerateReportInput = { job: { schemaVersion: 2, name: "report.generate.v2", sourceEventId: "event", traceId: "trace", idempotencyKey: "job", payload }, attemptNumber: 1, workerId: "worker" };
function setup() {
  const commit = vi.fn(async (value: unknown) => ({ ok: true, value }));
  const lifecycle = vi.fn(async () => ({ ok: true, value: { readingContextRevisionId: null } }));
  const budget = vi.fn(async () => ({ok: true, value: {consumed: true}}));
  const dependencies = { gate: { allows: () => true }, provider: { generateStructured: vi.fn() }, sourceSnapshotPreparer: { prepare: vi.fn(async () => ({ok: true, value: {}})) }, sourceRepository: { loadSource: vi.fn(async () => ({ok: true, value: {comprehensiveFactsV4: facts, knowledgePacks: []}})), validateLifecycle: lifecycle }, versionRepository: { getImmutableVersion: vi.fn(async () => null), startOrReuseAttempt: vi.fn(async () => ({ok: true})), recordFailedAttempt: vi.fn(async () => ({ok: true})), consumeRewriteBudget: budget, commitImmutableVersion: commit } };
  return { service: createReportGenerationService(dependencies as unknown as ReportGenerationServiceDependencies), commit, lifecycle, budget, dependencies };
}
beforeEach(() => { vi.mocked(writeZiweiTopicDeepDiveV4).mockReset(); vi.mocked(writeZiweiTopicDeepDiveV4).mockResolvedValue({ok: true, value: { content, quality: {ok: true, findings: []}, providerId: "fixture", modelId: "fixture" }} as never); });
describe("paid topic delivery", () => {
  it("dispatches topic content to its own immutable SKU/version and never calls the natal provider", async () => {
    const { service, commit, dependencies } = setup();
    expect((await service.generate(input)).ok).toBe(true);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ sku: payload.sku, chartVersionId: "cv", templateVersion: tuple.templateVersion, structuredContent: content }));
    expect(dependencies.provider.generateStructured).not.toHaveBeenCalled();
    expect(vi.mocked(writeZiweiTopicDeepDiveV4).mock.calls[0]![0]).toMatchObject({topicId: "relationship_marriage", costContext: {sku: payload.sku, chartVersionId: "cv"}});
  });
  it("dispatches the reserved business mechanics fixture through its own topic lineage", async () => {
    const business = makeBusinessContentFixture(facts);
    vi.mocked(writeZiweiTopicDeepDiveV4).mockResolvedValue({ok: true, value: {content: business,
      quality: {ok: true, findings: []}, providerId: "synthetic", modelId: "synthetic"}} as never);
    const {service, commit, dependencies} = setup();
    const businessInput = {...input, job: {...input.job, payload: {...payload, sku: "ZIWEI-BUSINESS-P0"}}};
    expect((await service.generate(businessInput)).ok).toBe(true);
    expect(writeZiweiTopicDeepDiveV4).toHaveBeenCalledWith(expect.objectContaining({topicId: "business_enterprise",
      costContext: expect.objectContaining({sku: "ZIWEI-BUSINESS-P0"})}));
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({sku: "ZIWEI-BUSINESS-P0", structuredContent: business,
      templateVersion: tuple.templateVersion, renderVersion: tuple.renderVersion}));
    expect(dependencies.provider.generateStructured).not.toHaveBeenCalled();
  });
  it("dispatches the reserved transition mechanics fixture through its own topic lineage", async () => {
    const transition = makeCareerTransitionContentFixture(facts);
    vi.mocked(writeZiweiTopicDeepDiveV4).mockResolvedValue({ok: true, value: {content: transition,
      quality: {ok: true, findings: []}, providerId: "synthetic", modelId: "synthetic"}} as never);
    const {service, commit, dependencies} = setup();
    const transitionInput = {...input, job: {...input.job, payload: {...payload, sku: "ZIWEI-CAREER-TRANSITION-P0"}}};
    expect((await service.generate(transitionInput)).ok).toBe(true);
    expect(writeZiweiTopicDeepDiveV4).toHaveBeenCalledWith(expect.objectContaining({topicId: "career_transition",
      costContext: expect.objectContaining({sku: "ZIWEI-CAREER-TRANSITION-P0"})}));
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({sku: "ZIWEI-CAREER-TRANSITION-P0", structuredContent: transition,
      templateVersion: tuple.templateVersion, renderVersion: tuple.renderVersion}));
    expect(dependencies.provider.generateStructured).not.toHaveBeenCalled();
  });
  it("dispatches the reserved family fixture through its own immutable topic lineage", async () => {
    const family = makeFamilyChildrenContentFixture(facts);
    vi.mocked(writeZiweiTopicDeepDiveV4).mockResolvedValue({ok: true, value: {content: family,
      quality: {ok: true, findings: []}, providerId: "synthetic", modelId: "synthetic"}} as never);
    const {service, commit, dependencies} = setup();
    expect((await service.generate({...input, job: {...input.job, payload: {...payload, sku: "ZIWEI-FAMILY-CHILDREN-P0"}}})).ok).toBe(true);
    expect(writeZiweiTopicDeepDiveV4).toHaveBeenCalledWith(expect.objectContaining({topicId: "family_children",
      costContext: expect.objectContaining({sku: "ZIWEI-FAMILY-CHILDREN-P0"})}));
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({sku: "ZIWEI-FAMILY-CHILDREN-P0", structuredContent: family,
      templateVersion: tuple.templateVersion, renderVersion: tuple.renderVersion}));
    expect(dependencies.provider.generateStructured).not.toHaveBeenCalled();
  });
  it.each([
    ["education_career", "ZIWEI-EDUCATION-CAREER-P0"],
    ["property_home", "ZIWEI-PROPERTY-HOME-P0"],
  ] as const)("dispatches %s through its own immutable topic lineage", async (topicId, sku) => {
    const content = makeStudyHousingContentFixture(facts, topicId);
    vi.mocked(writeZiweiTopicDeepDiveV4).mockResolvedValue({ok: true, value: {content,
      quality: {ok: true, findings: []}, providerId: "synthetic", modelId: "synthetic"}} as never);
    const {service, commit, dependencies} = setup();
    expect((await service.generate({...input, job: {...input.job, payload: {...payload, sku}}})).ok).toBe(true);
    expect(writeZiweiTopicDeepDiveV4).toHaveBeenCalledWith(expect.objectContaining({topicId, costContext: expect.objectContaining({sku})}));
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({sku, structuredContent: content,
      templateVersion: tuple.templateVersion, renderVersion: tuple.renderVersion}));
    expect(dependencies.provider.generateStructured).not.toHaveBeenCalled();
  });
  it("rejects a topic SKU carrying the natal tuple before any writer or commit", async () => {
    const {service, commit} = setup();
    const job = {...input.job, payload: {...payload, reportConfigVersion: "ziwei.comprehensive.report.v4.1.1"}};
    expect((await service.generate({...input, job})).ok).toBe(false);
    expect(writeZiweiTopicDeepDiveV4).not.toHaveBeenCalled();expect(commit).not.toHaveBeenCalled();
  });
  it("uses one durable rewrite and never publishes a failed quality result", async () => {
    const {service, commit, budget} = setup();
    vi.mocked(writeZiweiTopicDeepDiveV4).mockResolvedValue({ok:true,value:{content,quality:{ok:false,findings:[]},providerId:"fixture",modelId:"fixture"}} as never);
    expect((await service.generate(input)).ok).toBe(false);
    expect(budget).toHaveBeenCalledTimes(1);expect(writeZiweiTopicDeepDiveV4).toHaveBeenCalledTimes(2);expect(commit).not.toHaveBeenCalled();
  });
  it("fences revoked authority or lease loss before committing", async () => {
    const {service, commit, lifecycle} = setup();
    lifecycle.mockResolvedValueOnce({ok:true,value:{readingContextRevisionId:null}}).mockResolvedValueOnce({ok:false,error:{code:"REPORT_PROFILE_PURGED"}} as never);
    expect((await service.generate(input)).ok).toBe(false);expect(commit).not.toHaveBeenCalled();
    const second=setup();expect((await second.service.generate({...input,executionGuard:{state:()=>"lease_lost"}})).ok).toBe(false);expect(second.commit).not.toHaveBeenCalled();
  });
  it("projects only paid prose and requires exact active topic authority", async () => {
    const record = {source:"ledger_spend",chartId:"chart",wallet:{spendId:"spend",purchaseIntentId:"intent"},evidenceItems:[],reservation:{...payload,status:"html_ready"},version:{...payload,structuredContent:content,templateVersion:tuple.templateVersion,renderVersion:tuple.renderVersion},entitlements:[{id:"ent",chartId:"chart",sku:payload.sku,scope:{sections:["topicDeepDive"]},active:true,source:"ledger_spend"}]} as unknown as AuthorizedReportQueryRecord;
    const repository={readAuthorizedReport:vi.fn(async()=>record)};
    const service=createReportQueryService({repository});const actor={kind:"account" as const,userId:"owner",sessionId:"session",requestId:"request"};
    const result=await service.getReport(actor,reportId);expect(result.ok).toBe(true);if(!result.ok)throw new Error("not ready");expect(ReportReadyViewV1Schema.safeParse(result.value).success).toBe(true);
    expect(JSON.stringify(result.value)).not.toContain("evidenceKeys");expect(result.value).toMatchObject({contentVersion:tuple.contentVersion,chartId:"chart",content:projectTopicDeepDivePublicContent(content)});
    record.entitlements[0]!.sku="ZIWEI-CAREER-P0";await expect(service.getReport(actor,reportId)).rejects.toBeInstanceOf(ReportQueryDataError);
    repository.readAuthorizedReport.mockResolvedValueOnce(null as never);expect(await service.getReport(actor,reportId)).toMatchObject({ok:false,error:{code:"REPORT_NOT_FOUND"}});
  });
});
