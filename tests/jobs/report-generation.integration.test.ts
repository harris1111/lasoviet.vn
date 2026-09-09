import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "../../packages/backend/node_modules/drizzle-orm/index.js";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  IDENTITY_REPORT_SECTION_IDS,
  IdentityReportV1Schema,
  type IdentityReportV1,
  type NormalizedZiweiChartV1,
} from "@lasoviet/contracts";
import {
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceAlertDeliveries,
  commerceOrders,
  commercePaymentEvents,
  createDatabase,
  evidenceItems,
  evidenceSets,
  notificationDeliveries,
  outbox,
  reportGenerationAttempts,
  reportQueueJobs,
  reportReservations,
  reportVersions,
  runMigrations,
  ziweiChartVersions,
  ziweiCharts,
} from "../../packages/database/src/index.js";
import {
  createAiProductionGate,
  createDatabaseOutboxStore,
  createDatabaseReportGenerationSourceRepository,
  createDatabaseReportQueuePublisher,
  createDatabaseReportQueueStore,
  createDatabaseReportVersionRepository,
  createKnowledgeIngestionService,
  createKnowledgeRetrievalService,
  createOutboxDispatcher,
  createReportGenerationService,
  createReportService,
  type AiProvider,
  type KnowledgeManifestV1,
} from "../../packages/backend/src/index.js";
import { createReportGenerateProcessor } from "../../apps/worker/src/processors/report-generate.processor.js";
import { createReportGenerateRunner } from "../../apps/worker/src/worker.module.js";

const palaceIds = [
  "life", "siblings", "spouse", "children", "wealth", "health",
  "travel", "friends", "career", "property", "fortune", "parents",
] as const;

const branchIds = [
  "ziwei.branch.rat",
  "ziwei.branch.ox",
  "ziwei.branch.tiger",
  "ziwei.branch.rabbit",
  "ziwei.branch.dragon",
  "ziwei.branch.snake",
  "ziwei.branch.horse",
  "ziwei.branch.goat",
  "ziwei.branch.monkey",
  "ziwei.branch.rooster",
  "ziwei.branch.dog",
  "ziwei.branch.pig",
] as const;

const reportRepositoryOptions = {
  betterAuthUrl: "https://lasoviet.vn/configured/path?ignored=true#fragment",
  recipientFingerprintSecret: "test-internal-secret",
};

function sampleChart(): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id, index) => ({
      id: `ziwei.palace.${id}` as NormalizedZiweiChartV1["palaces"][number]["id"],
      earthlyBranchId: branchIds[index]!,
      stars: [],
    })),
    transformations: [{
      starId: "ziwei.star.wuqu",
      id: "ziwei.transformation.prosperity",
    }],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [{ id: "ziwei.horoscope.annual", supported: true }],
    warnings: [],
    provenance: {
      version: 1,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-02T00:00:00+00:00",
      limitations: [],
    },
  };
}

function sampleVietnameseReport(): IdentityReportV1 {
  return IdentityReportV1Schema.parse({
    version: 1,
    sku: "ZIWEI-IDENTITY-P0",
    capabilityId: "ziwei.identity.p0",
    locale: "vi",
    provenance: {
      chartVersionId: "chart-1",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      providerId: "openai",
      modelId: "gpt-4o",
      promptVersion: "ziwei.identity.prompt.v1",
      templateVersion: "identity-report-html.v1",
    },
    sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
      id,
      title: `Tiêu đề mục ${index + 1}`,
      narrative: `Nội dung diễn giải chi tiết cho phần ${id} mang tính chất phản chiếu và hỗ trợ định hướng cá nhân.`,
      claims: [
        {
          id: `claim-${index + 1}`,
          text: `Nhận định cốt lõi cho mục ${id} gắn với các chỉ dấu trong lá số tử vi.`,
          confidence: "moderate",
          evidenceIds: ["ziwei.identity.life-palace"],
          interpretationBoundCode: "reflective_identity_only",
          limitations: ["Nhận định mang tính tham khảo và tự chiêm nghiệm."],
          suggestedActions: [
            {
              text: "Xem xét kỹ phản ứng của bản thân trong các bối cảnh quan trọng.",
              category: "reflect" as const,
            },
          ],
        },
      ],
    })),
    reflectionQuestions: [
      "Bạn nhận thấy điều gì phản ánh đúng nhất cách bạn phản ứng trước áp lực?",
      "Môi trường nào giúp bạn duy trì trạng thái tập trung và điềm tĩnh nhất?",
      "Bước thử nghiệm thực tế nào bạn có thể bắt đầu ngay trong tuần này?",
    ],
    summaryActions: [
      "Dành thời gian quan sát thói quen ra quyết định trong tuần này.",
      "Ghi lại những khoảnh khắc cảm xúc bị kích hoạt mạnh.",
    ],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  });
}

describe("report generation source loading integration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  const repoRoot = resolve(process.cwd());

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_report_source_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);

    const database = createDatabase(databaseUrl);
    const ingestion = createKnowledgeIngestionService({
      database,
      repositoryRoot: repoRoot,
    });
    const viRaw = await readFile(
      resolve(repoRoot, "content/knowledge/vi/ziwei/identity-report-foundation.v1.json"),
      "utf8",
    );
    const enRaw = await readFile(
      resolve(repoRoot, "content/knowledge/en/ziwei/identity-report-foundation.v1.json"),
      "utf8",
    );
    await ingestion.ingestKnowledge(JSON.parse(viRaw) as KnowledgeManifestV1);
    await ingestion.ingestKnowledge(JSON.parse(enRaw) as KnowledgeManifestV1);
    await database.$client.end();
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function seedValidSourceFixtures(database: ReturnType<typeof createDatabase>, suffix: string) {
    const now = new Date("2026-09-04T00:00:00Z");
    const chartVersionId = `chart-version-${suffix}`;
    const evidenceSetId = `evidence-set-${suffix}`;

    await database.insert(authUsers).values({
      id: `user-${suffix}`,
      name: "Source User",
      email: `source-${suffix}@example.test`,
      emailVerified: true,
    });
    await database.insert(birthProfiles).values({
      id: `profile-${suffix}`,
      userId: `user-${suffix}`,
      createdAt: now,
      updatedAt: now,
    });
    await database.insert(birthProfileRevisions).values({
      id: `revision-${suffix}`,
      profileId: `profile-${suffix}`,
      revisionNumber: 1,
      originalInput: {
        version: 1,
        calendar: { kind: "solar", date: "1990-01-01" },
        time: { precision: "exact_minute", localTime: "12:00" },
        timezone: { offsetMinutes: 420 },
        consentVersion: "2026-09-01",
      },
      normalizedInput: {
        version: 1,
        normalizedCalendar: { kind: "solar", date: "1990-01-01" },
        normalizedTime: { precision: "exact_minute", localTime: "12:00" },
        timezoneProvenance: { source: "offset", offsetMinutes: 420 },
        utcInstant: "1990-01-01T05:00:00.000Z",
        normalizationWarnings: [],
        limitations: [],
      },
      normalizationWarnings: [],
      limitations: [],
      consentVersion: "2026-09-01",
      createdAt: now,
    });
    await database.insert(calculationRuns).values({
      id: `run-${suffix}`,
      profileId: `profile-${suffix}`,
      profileRevisionId: `revision-${suffix}`,
      idempotencyKey: `run-key-${suffix}`,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      createdAt: now,
    });
    await database.insert(ziweiCharts).values({
      id: `chart-${suffix}`,
      profileId: `profile-${suffix}`,
      profileRevisionId: `revision-${suffix}`,
      createdAt: now,
    });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionId,
      chartId: `chart-${suffix}`,
      calculationRunId: `run-${suffix}`,
      normalizedOutput: sampleChart(),
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
      createdAt: now,
    });
    await database.insert(evidenceSets).values({
      id: evidenceSetId,
      chartVersionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
      createdAt: now,
    });
    await database.insert(evidenceItems).values([
      {
        id: `item-1-${suffix}`,
        evidenceSetId,
        evidenceKey: "ziwei.identity.life-palace",
        payload: {
          id: "ziwei.identity.life-palace",
          factReferences: ["palaces.ziwei.palace.life.earthlyBranchId", "soulPalaceId"],
          confidence: "moderate",
          interpretationBounds: ["Bound 1"],
          interpretationBoundCodes: ["reflective_identity_only"],
          limitations: ["Limitation 1"],
          riskTags: ["identity", "determinism", "birth-time"],
          allowedActionCategories: ["reflect", "explore"],
        },
        createdAt: now,
      },
      {
        id: `item-2-${suffix}`,
        evidenceSetId,
        evidenceKey: "ziwei.identity.body-palace",
        payload: {
          id: "ziwei.identity.body-palace",
          factReferences: ["palaces.ziwei.palace.career.earthlyBranchId", "bodyPalaceId"],
          confidence: "moderate",
          interpretationBounds: ["Bound 2"],
          interpretationBoundCodes: ["reflective_identity_only"],
          limitations: ["Limitation 2"],
          riskTags: ["identity", "determinism", "birth-time"],
          allowedActionCategories: ["reflect", "explore"],
        },
        createdAt: now,
      },
      {
        id: `item-3-${suffix}`,
        evidenceSetId,
        evidenceKey: "ziwei.identity.transformations",
        payload: {
          id: "ziwei.identity.transformations",
          factReferences: ["transformations", "provenance.ruleSetId"],
          confidence: "moderate",
          interpretationBounds: ["Bound 3"],
          interpretationBoundCodes: ["reflective_identity_only"],
          limitations: ["Limitation 3"],
          riskTags: ["identity", "determinism", "birth-time"],
          allowedActionCategories: ["reflect", "explore"],
        },
        createdAt: now,
      },
    ]);

    return { chartVersionId, evidenceVersionId: evidenceSetId };
  }

  it("loads exact chart, evidence items in key order, frozen facts, and canonical knowledge to valid source", async () => {
    const database = createDatabase(databaseUrl);
    const { chartVersionId, evidenceVersionId } = await seedValidSourceFixtures(database, "valid");
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const repository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });

    const result = await repository.loadSource({
      reportVersionId: "report-version-1",
      chartVersionId,
      evidenceVersionId,
      knowledgeVersionId: "ziwei.identity.knowledge.v1",
      promptVersion: "ziwei.identity.prompt.v1",
      locale: "vi",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected source loading to succeed");

    expect(result.value.evidence.chartVersionId).toBe(chartVersionId);
    expect(result.value.evidence.capabilityId).toBe("ziwei.identity.p0");
    expect(result.value.evidence.items.map((i) => i.id)).toEqual([
      "ziwei.identity.body-palace",
      "ziwei.identity.life-palace",
      "ziwei.identity.transformations",
    ]);
    expect(result.value.frozenFacts.chartVersionId).toBe(chartVersionId);
    expect(result.value.knowledgePassages.length).toBeGreaterThan(0);

    const passageIds = result.value.knowledgePassages.map((p) => p.passageId);
    const uniquePassageIds = new Set(passageIds);
    expect(passageIds.length).toBe(uniquePassageIds.size);

    await database.$client.end();
  });

  it("maps missing chart version to REPORT_EVIDENCE_INVALID", async () => {
    const database = createDatabase(databaseUrl);
    const { evidenceVersionId } = await seedValidSourceFixtures(database, "missing-chart");
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const repository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });

    const result = await repository.loadSource({
      reportVersionId: "report-version-missing-chart",
      chartVersionId: "chart-version-non-existent",
      evidenceVersionId,
      knowledgeVersionId: "ziwei.identity.knowledge.v1",
      promptVersion: "ziwei.identity.prompt.v1",
      locale: "vi",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_EVIDENCE_INVALID",
        messageKey: "reports.report_evidence_invalid",
        retryable: false,
      },
    });

    await database.$client.end();
  });

  it("maps evidence capability mismatch to REPORT_EVIDENCE_INVALID", async () => {
    const database = createDatabase(databaseUrl);
    const { chartVersionId } = await seedValidSourceFixtures(database, "mismatched-cap");
    const mismatchedEvidenceId = "evidence-mismatched-cap-extra";
    await database.insert(evidenceSets).values({
      id: mismatchedEvidenceId,
      chartVersionId,
      capabilityId: "ziwei.horoscope.p0",
      ruleVersion: "ziwei.horoscope.v1",
    });

    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const repository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });

    const result = await repository.loadSource({
      reportVersionId: "report-version-mismatched-cap",
      chartVersionId,
      evidenceVersionId: mismatchedEvidenceId,
      knowledgeVersionId: "ziwei.identity.knowledge.v1",
      promptVersion: "ziwei.identity.prompt.v1",
      locale: "vi",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_EVIDENCE_INVALID",
        messageKey: "reports.report_evidence_invalid",
        retryable: false,
      },
    });

    await database.$client.end();
  });

  it("maps empty knowledge retrieval result to REPORT_EVIDENCE_INVALID", async () => {
    const database = createDatabase(databaseUrl);
    const { chartVersionId, evidenceVersionId } = await seedValidSourceFixtures(database, "empty-knowledge");
    const mockRetrieval = {
      retrieveKnowledge: async () => [],
    };
    const repository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval: mockRetrieval,
    });

    const result = await repository.loadSource({
      reportVersionId: "report-version-empty-knowledge",
      chartVersionId,
      evidenceVersionId,
      knowledgeVersionId: "ziwei.identity.knowledge.v1",
      promptVersion: "ziwei.identity.prompt.v1",
      locale: "vi",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_EVIDENCE_INVALID",
        messageKey: "reports.report_evidence_invalid",
        retryable: false,
      },
    });

    await database.$client.end();
  });

  it("deduplicates passages across canonical sections deterministically keeping first occurrence", async () => {
    const database = createDatabase(databaseUrl);
    const { chartVersionId, evidenceVersionId } = await seedValidSourceFixtures(database, "dedup");
    const calls: string[] = [];
    const mockRetrieval = {
      retrieveKnowledge: async (query: { reportSection: string }) => {
        calls.push(query.reportSection);
        if (query.reportSection === "personal_summary") {
          return [
            {
              id: "chunk-1",
              passageId: "p1",
              documentId: "doc-1",
              discipline: "ziwei" as const,
              locale: "vi" as const,
              reportSections: ["personal_summary" as const],
              knowledgeVersion: "ziwei.identity.knowledge.v1",
              content: "Content 1",
              contentHash: "hash-1",
              sourceAttribution: "Source 1",
              permittedUse: "first_party" as const,
            },
            {
              id: "chunk-2",
              passageId: "p2",
              documentId: "doc-1",
              discipline: "ziwei" as const,
              locale: "vi" as const,
              reportSections: ["personal_summary" as const],
              knowledgeVersion: "ziwei.identity.knowledge.v1",
              content: "Content 2 (first occurrence)",
              contentHash: "hash-2",
              sourceAttribution: "Source 2",
              permittedUse: "first_party" as const,
            },
          ];
        }
        if (query.reportSection === "primary_evidence") {
          return [
            {
              id: "chunk-2-dup",
              passageId: "p2",
              documentId: "doc-1",
              discipline: "ziwei" as const,
              locale: "vi" as const,
              reportSections: ["primary_evidence" as const],
              knowledgeVersion: "ziwei.identity.knowledge.v1",
              content: "Content 2 (duplicate occurrence)",
              contentHash: "hash-2",
              sourceAttribution: "Source 2",
              permittedUse: "first_party" as const,
            },
            {
              id: "chunk-3",
              passageId: "p3",
              documentId: "doc-1",
              discipline: "ziwei" as const,
              locale: "vi" as const,
              reportSections: ["primary_evidence" as const],
              knowledgeVersion: "ziwei.identity.knowledge.v1",
              content: "Content 3",
              contentHash: "hash-3",
              sourceAttribution: "Source 3",
              permittedUse: "first_party" as const,
            },
          ];
        }
        return [];
      },
    };

    const repository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval: mockRetrieval,
    });

    const result = await repository.loadSource({
      reportVersionId: "report-version-dedup",
      chartVersionId,
      evidenceVersionId,
      knowledgeVersionId: "ziwei.identity.knowledge.v1",
      promptVersion: "ziwei.identity.prompt.v1",
      locale: "vi",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected source loading to succeed");

    expect(calls).toEqual(IDENTITY_REPORT_SECTION_IDS);
    expect(result.value.knowledgePassages.map((p) => p.passageId)).toEqual(["p1", "p2", "p3"]);
    expect(result.value.knowledgePassages[1]?.content).toBe("Content 2 (first occurrence)");
    expect(result.value.knowledgePassages[1]?.permittedUse).toBe("first_party");
    expect(result.value.knowledgePassages[1]?.sourceAttribution).toBe("Source 2");

    await database.$client.end();
  });
});

describe("immutable report version repository integration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_report_version_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function seedReservationAndJobFixture(
    database: ReturnType<typeof createDatabase>,
    suffix: string,
    options?: {
      jobLeaseStatus?: "leased" | "waiting";
      leasedBy?: string;
      leasedUntil?: Date;
      reservationStatus?: string;
    },
  ) {
    const fixtureNow = new Date();
    const now = new Date("2026-09-04T00:00:00.000Z");
    const userId = `user-ver-${suffix}`;
    const orderId = randomUUID();
    const entitlementId = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    const jobId = `job-${suffix}`;
    const workerId = options?.leasedBy ?? "report-worker-1";
    const chartVersionId = `chart-ver-${suffix}`;
    const evidenceVersionId = `evidence-ver-${suffix}`;
    const knowledgeVersionId = "ziwei.identity.knowledge.v1";

    await database.insert(authUsers).values({
      id: userId,
      name: "Version Test User",
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `INV-VER-${suffix}`,
      chartId: `chart-${suffix}`,
      chartVersionId,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: now,
      paidAt: now,
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId: `chart-${suffix}`,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userId,
      createdAt: now,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId,
      evidenceVersionId,
      knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: options?.reservationStatus ?? "generating",
      stateVersion: 1,
      attemptCount: 1,
      activeJobId: jobId,
      createdAt: now,
      updatedAt: now,
    });
    await database.insert(reportQueueJobs).values({
      id: jobId,
      name: "report.generate.v1",
      sourceEventId: `evt-${suffix}`,
      traceId: `trace-${suffix}`,
      idempotencyKey: `report-generate:${reportVersionId}`,
      payload: {
        reportId,
        reportVersionId,
        entitlementId,
        chartVersionId,
        evidenceVersionId,
        knowledgeVersionId,
        promptVersion: "ziwei.identity.prompt.v1",
        reportConfigVersion: "identity-report-config.v1",
        locale: "vi",
        sku: "ZIWEI-IDENTITY-P0",
      },
      status: options?.jobLeaseStatus ?? "leased",
      attemptCount: 1,
      availableAt: fixtureNow,
      leasedBy: options?.jobLeaseStatus === "waiting" ? null : workerId,
      leasedUntil: options?.leasedUntil ?? new Date(fixtureNow.getTime() + 300_000),
      createdAt: now,
      updatedAt: now,
    });

    return {
      userId,
      orderId,
      entitlementId,
      reportId,
      reportVersionId,
      jobId,
      workerId,
      chartVersionId,
      evidenceVersionId,
      knowledgeVersionId,
    };
  }

  it("commits immutable version atomically with lowercase sha256, advances reservation states, succeeds attempt, processes queue job, and emits single pdf event", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedReservationAndJobFixture(database, "atomic-commit");
    const repository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );

    const startAttemptResult = await repository.startOrReuseAttempt({
      jobId: fixture.jobId,
      attemptNumber: 1,
      reportVersionId: fixture.reportVersionId,
      providerId: "openai",
      modelId: "gpt-4o",
    });
    expect(startAttemptResult.ok).toBe(true);

    const structuredContent = sampleVietnameseReport();
    const htmlContent = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>${structuredContent.sections[0].title}</title></head><body><h1>${structuredContent.sections[0].title}</h1></body></html>`;
    const expectedHash = createHash("sha256").update(Buffer.from(htmlContent, "utf8")).digest("hex").toLowerCase();
    expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);

    const commitResult = await repository.commitImmutableVersion({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent,
      jobId: fixture.jobId,
      workerId: fixture.workerId,
      attemptNumber: 1,
      traceId: `trace-${fixture.jobId}`,
    });

    expect(commitResult.ok).toBe(true);
    if (!commitResult.ok) throw new Error("Expected commit to succeed");

    expect(commitResult.value.reportVersionId).toBe(fixture.reportVersionId);
    expect(commitResult.value.contentHash).toBe(expectedHash);
    expect(commitResult.value.pdfAssetId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const allVersions = await database.select().from(reportVersions);
    const versionRow = allVersions.find((v) => v.reportVersionId === fixture.reportVersionId);
    expect(versionRow).toBeDefined();
    expect(versionRow?.contentHash).toBe(expectedHash);
    expect(versionRow?.renderVersion).toBe("identity-report-pdf.v1");

    const allReservations = await database.select().from(reportReservations);
    const reservationRow = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservationRow?.status).toBe("html_ready");
    expect(reservationRow?.stateVersion).toBe(3);

    const allAttempts = await database.select().from(reportGenerationAttempts);
    const attemptRow = allAttempts.find((a) => a.jobId === fixture.jobId);
    expect(attemptRow?.status).toBe("succeeded");
    expect(attemptRow?.completedAt).not.toBeNull();

    const allJobs = await database.select().from(reportQueueJobs);
    const queueJobRow = allJobs.find((j) => j.id === fixture.jobId);
    expect(queueJobRow?.status).toBe("processed");
    expect(queueJobRow?.leasedBy).toBeNull();
    expect(queueJobRow?.leasedUntil).toBeNull();
    expect(queueJobRow?.processedAt).not.toBeNull();

    const allOutbox = await database.select().from(outbox);
    const matchingOutbox = allOutbox.filter((o) => o.idempotencyKey === `pdf-request:${fixture.reportVersionId}:identity-report-pdf.v1`);
    expect(matchingOutbox.length).toBe(1);
    expect(matchingOutbox[0]?.eventType).toBe("report.pdf.requested.v1");
    expect(matchingOutbox[0]?.payload).toEqual({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      assetId: commitResult.value.pdfAssetId,
      renderVersion: "identity-report-pdf.v1",
    });

    const allNotifications = await database.select().from(notificationDeliveries);
    const matchingNotification = allNotifications.filter(
      (n) => n.idempotencyKey === `report-ready-email:${fixture.reportVersionId}:${fixture.userId}`,
    );
    expect(matchingNotification.length).toBe(1);
    expect(matchingNotification[0]?.kind).toBe("report_ready");
    expect(matchingNotification[0]?.status).toBe("pending");
    expect(matchingNotification[0]?.attemptCount).toBe(0);
    expect(matchingNotification[0]?.recipientFingerprint).toBeDefined();
    expect(matchingNotification[0]?.requestPayload).toEqual({
      version: 1,
      kind: "report_ready",
      idempotencyKey: `report-ready-email:${fixture.reportVersionId}:${fixture.userId}`,
      recipient: `${fixture.userId}@example.test`,
      locale: "vi",
      actionUrl: `https://lasoviet.vn/bao-cao/${fixture.reportId}`,
      requestId: `trace-${fixture.jobId}`,
    });

    await database.$client.end();
  });

  it("atomically claims rewrite budget with exactly one consumed:true on concurrent/repeated consumption", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedReservationAndJobFixture(database, "rewrite-budget");
    const repository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );

    const [res1, res2, res3] = await Promise.all([
      repository.consumeRewriteBudget(fixture.reportVersionId),
      repository.consumeRewriteBudget(fixture.reportVersionId),
      repository.consumeRewriteBudget(fixture.reportVersionId),
    ]);

    const consumedCount = [res1, res2, res3].filter((r) => r.ok && r.value.consumed === true).length;
    const rejectedCount = [res1, res2, res3].filter((r) => r.ok && r.value.consumed === false).length;

    expect(consumedCount).toBe(1);
    expect(rejectedCount).toBe(2);

    const repeated = await repository.consumeRewriteBudget(fixture.reportVersionId);
    expect(repeated).toEqual({ ok: true, value: { consumed: false } });

    const missing = await repository.consumeRewriteBudget(randomUUID());
    expect(missing).toMatchObject({
      ok: false,
      error: { code: "REPORT_VERSION_CONFLICT" },
    });

    await database.$client.end();
  });

  it("replays existing immutable version without creating second output, attempt, or outbox event", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedReservationAndJobFixture(database, "replay");
    const repository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );

    await repository.startOrReuseAttempt({
      jobId: fixture.jobId,
      attemptNumber: 1,
      reportVersionId: fixture.reportVersionId,
      providerId: "openai",
      modelId: "gpt-4o",
    });

    const structuredContent = sampleVietnameseReport();
    const htmlContent = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Replay</title></head><body><h1>Replay</h1></body></html>`;
    const commitParams = {
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1",
      locale: "vi" as const,
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent,
      jobId: fixture.jobId,
      workerId: fixture.workerId,
      attemptNumber: 1,
      traceId: `trace-${fixture.jobId}`,
    };

    const firstCommit = await repository.commitImmutableVersion(commitParams);
    expect(firstCommit.ok).toBe(true);
    if (!firstCommit.ok) throw new Error("Expected initial commit to succeed");

    const replayCommit = await repository.commitImmutableVersion(commitParams);
    expect(replayCommit.ok).toBe(true);
    if (!replayCommit.ok) throw new Error("Expected replay commit to succeed");

    expect(replayCommit.value.reportVersionId).toBe(firstCommit.value.reportVersionId);
    expect(replayCommit.value.pdfAssetId).toBe(firstCommit.value.pdfAssetId);
    expect(replayCommit.value.contentHash).toBe(firstCommit.value.contentHash);

    const allVersions = await database.select().from(reportVersions);
    const matchingVersions = allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId);
    expect(matchingVersions.length).toBe(1);

    const allAttempts = await database.select().from(reportGenerationAttempts);
    const matchingAttempts = allAttempts.filter((a) => a.reportVersionId === fixture.reportVersionId);
    expect(matchingAttempts.length).toBe(1);

    const allOutbox = await database.select().from(outbox);
    const matchingOutbox = allOutbox.filter((o) => o.idempotencyKey === `pdf-request:${fixture.reportVersionId}:identity-report-pdf.v1`);
    expect(matchingOutbox.length).toBe(1);

    const allNotifications = await database.select().from(notificationDeliveries);
    const matchingNotifications = allNotifications.filter(
      (n) => n.idempotencyKey === `report-ready-email:${fixture.reportVersionId}:${fixture.userId}`,
    );
    expect(matchingNotifications.length).toBe(1);

    await database.$client.end();
  });

  it("rolls back with REPORT_VERSION_CONFLICT when queue lease is expired or lost to another worker", async () => {
    const database = createDatabase(databaseUrl);
    const past = new Date("2026-09-03T00:00:00Z");
    const fixture = await seedReservationAndJobFixture(database, "stale-lease", {
      leasedUntil: past,
    });
    const repository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );

    const structuredContent = sampleVietnameseReport();
    const htmlContent = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Stale</title></head><body><h1>Stale</h1></body></html>`;

    const result = await repository.commitImmutableVersion({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent,
      jobId: fixture.jobId,
      workerId: fixture.workerId,
      attemptNumber: 1,
      traceId: `trace-${fixture.jobId}`,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_VERSION_CONFLICT",
        messageKey: "reports.report_version_conflict",
        retryable: false,
      },
    });

    const allVersions = await database.select().from(reportVersions);
    const matchingVersions = allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId);
    expect(matchingVersions.length).toBe(0);

    const allOutbox = await database.select().from(outbox);
    const matchingOutbox = allOutbox.filter((o) => o.idempotencyKey === `pdf-request:${fixture.reportVersionId}:identity-report-pdf.v1`);
    expect(matchingOutbox.length).toBe(0);

    await database.$client.end();
  });

  it("rolls back with REPORT_VERSION_CONFLICT when attempting to commit conflicting content or source for existing report version", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedReservationAndJobFixture(database, "content-conflict");
    const repository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );

    const structuredContent = sampleVietnameseReport();
    const htmlContent = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Initial</title></head><body><h1>Initial</h1></body></html>`;
    const initialHash = createHash("sha256").update(Buffer.from(htmlContent, "utf8")).digest("hex").toLowerCase();

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent,
      contentHash: initialHash,
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
    });

    const conflictingHtmlContent = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Conflicting</title></head><body><h1>Conflicting</h1></body></html>`;

    const result = await repository.commitImmutableVersion({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent: conflictingHtmlContent,
      jobId: fixture.jobId,
      workerId: fixture.workerId,
      attemptNumber: 1,
      traceId: `trace-${fixture.jobId}`,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_VERSION_CONFLICT",
        messageKey: "reports.report_version_conflict",
        retryable: false,
      },
    });

    const allVersions = await database.select().from(reportVersions);
    const versionRow = allVersions.find((v) => v.reportVersionId === fixture.reportVersionId);
    expect(versionRow?.contentHash).toBe(initialHash);

    await database.$client.end();
  });

  it("rolls back with REPORT_VERSION_CONFLICT when no running attempt exists for (jobId, attemptNumber)", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedReservationAndJobFixture(database, "missing-attempt");
    const repository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );

    // Intentionally do NOT start an attempt row for (fixture.jobId, 1)
    const structuredContent = sampleVietnameseReport();
    const htmlContent = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>No Attempt</title></head><body><h1>No Attempt</h1></body></html>`;

    const result = await repository.commitImmutableVersion({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent,
      jobId: fixture.jobId,
      workerId: fixture.workerId,
      attemptNumber: 1,
      traceId: `trace-${fixture.jobId}`,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_VERSION_CONFLICT",
        messageKey: "reports.report_version_conflict",
        retryable: false,
      },
    });

    const allVersions = await database.select().from(reportVersions);
    const versionRow = allVersions.find((v) => v.reportVersionId === fixture.reportVersionId);
    expect(versionRow).toBeUndefined();

    const allReservations = await database.select().from(reportReservations);
    const reservationRow = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservationRow?.status).toBe("generating");
    expect(reservationRow?.stateVersion).toBe(1);

    const allOutbox = await database.select().from(outbox);
    const matchingOutbox = allOutbox.filter((o) => o.aggregateId === fixture.reportVersionId);
    expect(matchingOutbox.length).toBe(0);

    await database.$client.end();
  });

  it("rolls back with REPORT_VERSION_CONFLICT when replay has matching html and source metadata but mismatched structured content", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedReservationAndJobFixture(database, "struct-conflict");
    const repository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );

    await repository.startOrReuseAttempt({
      jobId: fixture.jobId,
      attemptNumber: 1,
      reportVersionId: fixture.reportVersionId,
      providerId: "openai",
      modelId: "gpt-4o",
    });

    const originalContent = sampleVietnameseReport();
    const htmlContent = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Same HTML</title></head><body><h1>Same HTML</h1></body></html>`;
    const baseParams = {
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1" as const,
      locale: "vi" as const,
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      htmlContent,
      jobId: fixture.jobId,
      workerId: fixture.workerId,
      attemptNumber: 1,
      traceId: `trace-${fixture.jobId}`,
    };

    const firstCommit = await repository.commitImmutableVersion({
      ...baseParams,
      structuredContent: originalContent,
    });
    expect(firstCommit.ok).toBe(true);

    const conflictingStructuredContent = {
      ...originalContent,
      sections: [
        {
          ...originalContent.sections[0],
          narrative: "Nội dung mục 1 đã bị thay đổi trái phép so với bản gốc.",
        },
        ...originalContent.sections.slice(1),
      ],
    };

    const replayWithMismatch = await repository.commitImmutableVersion({
      ...baseParams,
      structuredContent: conflictingStructuredContent,
    });

    expect(replayWithMismatch).toEqual({
      ok: false,
      error: {
        code: "REPORT_VERSION_CONFLICT",
        messageKey: "reports.report_version_conflict",
        retryable: false,
      },
    });

    const allVersions = await database.select().from(reportVersions);
    const versionRow = allVersions.find((v) => v.reportVersionId === fixture.reportVersionId);
    expect((versionRow?.structuredContent as IdentityReportV1).sections[0].narrative).toBe(originalContent.sections[0].narrative);

    await database.$client.end();
  });

  it("rolls back with REPORT_VERSION_CONFLICT and does not process queue job when replay lease is expired", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedReservationAndJobFixture(database, "replay-expired-lease", {
      leasedUntil: new Date("2026-09-03T00:00:00.000Z"),
    });
    const repository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );

    const structuredContent = sampleVietnameseReport();
    const htmlContent = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Replay Expired</title></head><body><h1>Replay Expired</h1></body></html>`;
    const initialHash = createHash("sha256").update(Buffer.from(htmlContent, "utf8")).digest("hex").toLowerCase();

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent,
      contentHash: initialHash,
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
    });

    const result = await repository.commitImmutableVersion({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent,
      jobId: fixture.jobId,
      workerId: fixture.workerId,
      attemptNumber: 1,
      traceId: `trace-${fixture.jobId}`,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_VERSION_CONFLICT",
        messageKey: "reports.report_version_conflict",
        retryable: false,
      },
    });

    const allJobs = await database.select().from(reportQueueJobs);
    const queueJobRow = allJobs.find((j) => j.id === fixture.jobId);
    expect(queueJobRow?.status).toBe("leased");
    expect(queueJobRow?.processedAt).toBeNull();

    await database.$client.end();
  });

  it("rolls back publication transaction when recipient lineage is unverified, anonymous, or unpaid", async () => {
    const database = createDatabase(databaseUrl);

    // 1. Unverified email rollback
    const unverifiedFixture = await seedReservationAndJobFixture(database, "unverified-email");
    await database
      .update(authUsers)
      .set({ emailVerified: false })
      .where(eq(authUsers.id, unverifiedFixture.userId));

    const repo = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const structuredContent = sampleVietnameseReport();
    const htmlContent = "<html><body>Unverified test</body></html>";

    const unverifiedResult = await repo.commitImmutableVersion({
      reportId: unverifiedFixture.reportId,
      reportVersionId: unverifiedFixture.reportVersionId,
      entitlementId: unverifiedFixture.entitlementId,
      chartVersionId: unverifiedFixture.chartVersionId,
      evidenceVersionId: unverifiedFixture.evidenceVersionId,
      knowledgeVersionId: unverifiedFixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent,
      jobId: unverifiedFixture.jobId,
      workerId: unverifiedFixture.workerId,
      attemptNumber: 1,
      traceId: `trace-${unverifiedFixture.jobId}`,
    });

    expect(unverifiedResult.ok).toBe(false);
    expect(unverifiedResult.error?.code).toBe("REPORT_VERSION_CONFLICT");

    // Assert rollback: no report version inserted, reservation still generating, no notification
    const versions1 = await database.select().from(reportVersions);
    expect(versions1.find((v) => v.reportVersionId === unverifiedFixture.reportVersionId)).toBeUndefined();
    const [res1] = await database.select().from(reportReservations).where(eq(reportReservations.reportVersionId, unverifiedFixture.reportVersionId));
    expect(res1?.status).toBe("generating");
    const notifs1 = await database.select().from(notificationDeliveries);
    expect(notifs1.find((n) => n.idempotencyKey.includes(unverifiedFixture.reportVersionId))).toBeUndefined();

    // 2. Anonymous user rollback
    const anonFixture = await seedReservationAndJobFixture(database, "anonymous-lineage");
    await database
      .update(authUsers)
      .set({ isAnonymous: true })
      .where(eq(authUsers.id, anonFixture.userId));

    const anonResult = await repo.commitImmutableVersion({
      reportId: anonFixture.reportId,
      reportVersionId: anonFixture.reportVersionId,
      entitlementId: anonFixture.entitlementId,
      chartVersionId: anonFixture.chartVersionId,
      evidenceVersionId: anonFixture.evidenceVersionId,
      knowledgeVersionId: anonFixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent,
      jobId: anonFixture.jobId,
      workerId: anonFixture.workerId,
      attemptNumber: 1,
      traceId: `trace-${anonFixture.jobId}`,
    });

    expect(anonResult.ok).toBe(false);
    expect(anonResult.error?.code).toBe("REPORT_VERSION_CONFLICT");
    const versions2 = await database.select().from(reportVersions);
    expect(versions2.find((v) => v.reportVersionId === anonFixture.reportVersionId)).toBeUndefined();

    // 3. Null paidAt timestamp rollback
    const unpaidFixture = await seedReservationAndJobFixture(database, "unpaid-lineage");
    await database
      .update(commerceOrders)
      .set({ paidAt: null })
      .where(eq(commerceOrders.id, unpaidFixture.orderId));

    const unpaidResult = await repo.commitImmutableVersion({
      reportId: unpaidFixture.reportId,
      reportVersionId: unpaidFixture.reportVersionId,
      entitlementId: unpaidFixture.entitlementId,
      chartVersionId: unpaidFixture.chartVersionId,
      evidenceVersionId: unpaidFixture.evidenceVersionId,
      knowledgeVersionId: unpaidFixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      renderVersion: "identity-report-pdf.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent,
      htmlContent,
      jobId: unpaidFixture.jobId,
      workerId: unpaidFixture.workerId,
      attemptNumber: 1,
      traceId: `trace-${unpaidFixture.jobId}`,
    });

    expect(unpaidResult.ok).toBe(false);
    expect(unpaidResult.error?.code).toBe("REPORT_VERSION_CONFLICT");

    await database.$client.end();
  });

});

describe("report generation orchestration and worker integration (Slice B)", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  const repoRoot = resolve(process.cwd());

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_report_orchestration_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);

    const database = createDatabase(databaseUrl);
    const ingestion = createKnowledgeIngestionService({
      database,
      repositoryRoot: repoRoot,
    });
    const viRaw = await readFile(
      resolve(repoRoot, "content/knowledge/vi/ziwei/identity-report-foundation.v1.json"),
      "utf8",
    );
    const enRaw = await readFile(
      resolve(repoRoot, "content/knowledge/en/ziwei/identity-report-foundation.v1.json"),
      "utf8",
    );
    await ingestion.ingestKnowledge(JSON.parse(viRaw) as KnowledgeManifestV1);
    await ingestion.ingestKnowledge(JSON.parse(enRaw) as KnowledgeManifestV1);
    await database.$client.end();
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function seedFullOrchestrationFixture(
    database: ReturnType<typeof createDatabase>,
    suffix: string,
    options?: {
      jobLeaseStatus?: "leased" | "waiting";
      leasedBy?: string;
      leasedUntil?: Date;
      reservationStatus?: string;
      attemptCount?: number;
      locale?: "vi" | "en";
    },
  ) {
    const fixtureNow = new Date();
    const now = new Date("2026-09-04T00:00:00.000Z");
    const userId = `user-orch-${suffix}`;
    const orderId = randomUUID();
    const entitlementId = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    const jobId = `job-orch-${suffix}`;
    const workerId = options?.leasedBy ?? "orch-worker-1";
    const chartVersionId = `chart-ver-orch-${suffix}`;
    const evidenceVersionId = `evidence-ver-orch-${suffix}`;
    const knowledgeVersionId = "ziwei.identity.knowledge.v1";
    const locale = options?.locale ?? "vi";

    await database.insert(authUsers).values({
      id: userId,
      name: "Orchestration Test User",
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await database.insert(birthProfiles).values({
      id: `profile-${suffix}`,
      userId,
      createdAt: now,
      updatedAt: now,
    });
    await database.insert(birthProfileRevisions).values({
      id: `rev-${suffix}`,
      profileId: `profile-${suffix}`,
      revisionNumber: 1,
      originalInput: {
        version: 1,
        calendar: { kind: "solar", date: "1990-01-01" },
        time: { precision: "exact_minute", localTime: "12:00" },
        timezone: { offsetMinutes: 420 },
        consentVersion: "2026-09-01",
      },
      normalizedInput: {
        version: 1,
        normalizedCalendar: { kind: "solar", date: "1990-01-01" },
        normalizedTime: { precision: "exact_minute", localTime: "12:00" },
        timezoneProvenance: { source: "offset", offsetMinutes: 420 },
        utcInstant: "1990-01-01T05:00:00.000Z",
        normalizationWarnings: [],
        limitations: [],
      },
      normalizationWarnings: [],
      limitations: [],
      consentVersion: "2026-09-01",
      createdAt: now,
    });
    await database.insert(calculationRuns).values({
      id: `run-${suffix}`,
      profileId: `profile-${suffix}`,
      profileRevisionId: `rev-${suffix}`,
      idempotencyKey: `run-key-${suffix}`,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      createdAt: now,
    });
    await database.insert(ziweiCharts).values({
      id: `chart-${suffix}`,
      profileId: `profile-${suffix}`,
      profileRevisionId: `rev-${suffix}`,
      createdAt: now,
    });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionId,
      chartId: `chart-${suffix}`,
      calculationRunId: `run-${suffix}`,
      normalizedOutput: sampleChart(),
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
      createdAt: now,
    });
    await database.insert(evidenceSets).values({
      id: evidenceVersionId,
      chartVersionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
      createdAt: now,
    });
    await database.insert(evidenceItems).values([
      {
        id: `item-1-${suffix}`,
        evidenceSetId: evidenceVersionId,
        evidenceKey: "ziwei.identity.life-palace",
        payload: {
          id: "ziwei.identity.life-palace",
          factReferences: ["palaces.ziwei.palace.life.earthlyBranchId", "soulPalaceId"],
          confidence: "moderate",
          interpretationBounds: ["Bound 1"],
          interpretationBoundCodes: ["reflective_identity_only"],
          limitations: ["Limitation 1"],
          riskTags: ["identity", "determinism", "birth-time"],
          allowedActionCategories: ["reflect", "explore"],
        },
        createdAt: now,
      },
      {
        id: `item-2-${suffix}`,
        evidenceSetId: evidenceVersionId,
        evidenceKey: "ziwei.identity.body-palace",
        payload: {
          id: "ziwei.identity.body-palace",
          factReferences: ["palaces.ziwei.palace.career.earthlyBranchId", "bodyPalaceId"],
          confidence: "moderate",
          interpretationBounds: ["Bound 2"],
          interpretationBoundCodes: ["reflective_identity_only"],
          limitations: ["Limitation 2"],
          riskTags: ["identity", "determinism", "birth-time"],
          allowedActionCategories: ["reflect", "explore"],
        },
        createdAt: now,
      },
      {
        id: `item-3-${suffix}`,
        evidenceSetId: evidenceVersionId,
        evidenceKey: "ziwei.identity.transformations",
        payload: {
          id: "ziwei.identity.transformations",
          factReferences: ["transformations", "provenance.ruleSetId"],
          confidence: "moderate",
          interpretationBounds: ["Bound 3"],
          interpretationBoundCodes: ["reflective_identity_only"],
          limitations: ["Limitation 3"],
          riskTags: ["identity", "determinism", "birth-time"],
          allowedActionCategories: ["reflect", "explore"],
        },
        createdAt: now,
      },
    ]);
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `INV-ORCH-${suffix}`,
      chartId: `chart-${suffix}`,
      chartVersionId,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale,
      status: "paid",
      createdAt: now,
      paidAt: now,
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId: `chart-${suffix}`,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userId,
      createdAt: now,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId,
      evidenceVersionId,
      knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      locale,
      sku: "ZIWEI-IDENTITY-P0",
      status: options?.reservationStatus ?? "requested",
      stateVersion: 1,
      attemptCount: options?.attemptCount ?? 0,
      activeJobId: options?.reservationStatus === "generating" ? jobId : null,
      createdAt: now,
      updatedAt: now,
    });
    await database.insert(reportQueueJobs).values({
      id: jobId,
      name: "report.generate.v1",
      sourceEventId: `evt-orch-${suffix}`,
      traceId: `trace-orch-${suffix}`,
      idempotencyKey: `report-generate:${reportVersionId}`,
      payload: {
        reportId,
        reportVersionId,
        entitlementId,
        chartVersionId,
        evidenceVersionId,
        knowledgeVersionId,
        promptVersion: "ziwei.identity.prompt.v1",
        reportConfigVersion: "identity-report-config.v1",
        locale,
        sku: "ZIWEI-IDENTITY-P0",
      },
      status: options?.jobLeaseStatus ?? "waiting",
      attemptCount: options?.attemptCount ?? 0,
      availableAt: fixtureNow,
      leasedBy: options?.jobLeaseStatus === "leased" ? workerId : null,
      leasedUntil: options?.leasedUntil ?? (options?.jobLeaseStatus === "leased" ? new Date(fixtureNow.getTime() + 300_000) : null),
      createdAt: now,
      updatedAt: now,
    });

    return {
      userId,
      orderId,
      entitlementId,
      reportId,
      reportVersionId,
      jobId,
      workerId,
      chartVersionId,
      evidenceVersionId,
      knowledgeVersionId,
      locale,
    };
  }

  function createDeterministicMockProvider(overrides?: {
    writerResponse?: (req: any) => any;
    criticResponse?: (req: any) => any;
  }): AiProvider & { writerCalls: number; criticCalls: number } {
    let writerCalls = 0;
    let criticCalls = 0;
    return {
      get writerCalls() {
        return writerCalls;
      },
      get criticCalls() {
        return criticCalls;
      },
      async generateStructured(req) {
        if (req.schemaName === "identity_report_content_v1") {
          writerCalls++;
          if (overrides?.writerResponse) return overrides.writerResponse(req);
          const full = sampleVietnameseReport();
          return {
            ok: true as const,
            value: {
              value: {
                sections: full.sections,
                reflectionQuestions: full.reflectionQuestions,
                summaryActions: full.summaryActions,
              },
              providerId: "mock-provider",
              modelId: "mock-model",
            },
          };
        }
        if (req.schemaName === "identity_report_critic_v1") {
          criticCalls++;
          if (overrides?.criticResponse) return overrides.criticResponse(req);
          return {
            ok: true as const,
            value: {
              value: {
                correctness: 5,
                evidenceCoverage: 5,
                specificity: 5,
                languageClarity: 5,
                consistency: 5,
                actionability: 5,
                safety: 5,
                repetitionControl: 5,
                notes: ["Approved by critic"],
              },
              providerId: "mock-provider",
              modelId: "mock-model",
            },
          };
        }
        throw new Error(`Unexpected schemaName: ${req.schemaName}`);
      },
    };
  }

  it("approved deterministic generation persists one immutable output and one PDF event", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "gen-approved", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const sourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });
    const versionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const gate = createAiProductionGate("approved");
    const provider = createDeterministicMockProvider();
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: true });

    const allVersions = await database.select().from(reportVersions);
    const matchingVersions = allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId);
    expect(matchingVersions).toHaveLength(1);
    expect(matchingVersions[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(matchingVersions[0].renderVersion).toBe("identity-report-pdf.v1");

    const allReservations = await database.select().from(reportReservations);
    const reservation = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservation?.status).toBe("html_ready");

    const allAttempts = await database.select().from(reportGenerationAttempts);
    const attempt = allAttempts.find((a) => a.jobId === fixture.jobId);
    expect(attempt?.status).toBe("succeeded");
    expect(attempt?.errorCode).toBeNull();
    expect(attempt?.providerId).toBe("mock-provider");
    expect(attempt?.modelId).toBe("mock-model");

    const allJobs = await database.select().from(reportQueueJobs);
    const job = allJobs.find((j) => j.id === fixture.jobId);
    expect(job?.status).toBe("processed");

    const allOutbox = await database.select().from(outbox);
    const pdfEvents = allOutbox.filter((e) => e.eventType === "report.pdf.requested.v1" && e.aggregateId === fixture.reportVersionId);
    expect(pdfEvents).toHaveLength(1);
    expect(pdfEvents[0].payload).toMatchObject({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      renderVersion: "identity-report-pdf.v1",
    });

    const failedEvents = allOutbox.filter((e) => e.eventType === "report.fulfillment.failed.v1" && e.aggregateId === fixture.reportVersionId);
    expect(failedEvents).toHaveLength(0);

    await database.$client.end();
  });

  it("fabricated evidence persists no output/PDF event and becomes terminal failure with REPORT_EVIDENCE_INVALID", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "gen-fabricated", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const sourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });
    const versionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const gate = createAiProductionGate("approved");
    const full = sampleVietnameseReport();
    const provider = createDeterministicMockProvider({
      writerResponse: () => ({
        ok: true as const,
        value: {
          value: {
            sections: full.sections.map((s) => ({
              ...s,
              claims: [
                {
                  ...s.claims[0],
                  evidenceIds: ["ziwei.identity.fabricated-evidence-key"],
                },
              ],
            })),
            reflectionQuestions: full.reflectionQuestions,
            summaryActions: full.summaryActions,
          },
          providerId: "mock-provider",
          modelId: "mock-model",
        },
      }),
    });
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });

    const allVersions = await database.select().from(reportVersions);
    expect(allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId)).toHaveLength(0);

    const allReservations = await database.select().from(reportReservations);
    const reservation = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservation?.status).toBe("terminal_failure");
    expect(reservation?.lastErrorCode).toBe("REPORT_EVIDENCE_INVALID");

    const allAttempts = await database.select().from(reportGenerationAttempts);
    const attempt = allAttempts.find((a) => a.jobId === fixture.jobId);
    expect(attempt?.status).toBe("failed");
    expect(attempt?.errorCode).toBe("REPORT_EVIDENCE_INVALID");

    const allJobs = await database.select().from(reportQueueJobs);
    const job = allJobs.find((j) => j.id === fixture.jobId);
    expect(job?.status).toBe("terminal_failure");
    expect(job?.lastErrorCode).toBe("REPORT_EVIDENCE_INVALID");

    const allOutbox = await database.select().from(outbox);
    expect(allOutbox.filter((e) => e.eventType === "report.pdf.requested.v1" && e.aggregateId === fixture.reportVersionId)).toHaveLength(0);

    const failedEvents = allOutbox.filter((e) => e.eventType === "report.fulfillment.failed.v1" && e.aggregateId === fixture.reportVersionId);
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].payload).toMatchObject({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      errorCode: "REPORT_EVIDENCE_INVALID",
      failureStage: "generation",
    });

    await database.$client.end();
  });

  it("unsafe content rejected by critic persists no output/PDF event and becomes terminal failure with REPORT_SAFETY_REJECTED", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "gen-unsafe", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const sourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });
    const versionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const gate = createAiProductionGate("approved");
    const provider = createDeterministicMockProvider({
      criticResponse: () => ({
        ok: true as const,
        value: {
          value: {
            correctness: 5,
            evidenceCoverage: 5,
            specificity: 5,
            languageClarity: 5,
            consistency: 5,
            actionability: 5,
            safety: 1,
            repetitionControl: 5,
            notes: ["Dangerous fear-mongering content"],
          },
          providerId: "mock-provider",
          modelId: "mock-model",
        },
      }),
    });
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });

    const allVersions = await database.select().from(reportVersions);
    expect(allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId)).toHaveLength(0);

    const allReservations = await database.select().from(reportReservations);
    const reservation = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservation?.status).toBe("terminal_failure");
    expect(reservation?.lastErrorCode).toBe("REPORT_SAFETY_REJECTED");

    const allAttempts = await database.select().from(reportGenerationAttempts);
    const attempt = allAttempts.find((a) => a.jobId === fixture.jobId);
    expect(attempt?.status).toBe("failed");
    expect(attempt?.errorCode).toBe("REPORT_SAFETY_REJECTED");

    const allJobs = await database.select().from(reportQueueJobs);
    const job = allJobs.find((j) => j.id === fixture.jobId);
    expect(job?.status).toBe("terminal_failure");
    expect(job?.lastErrorCode).toBe("REPORT_SAFETY_REJECTED");

    const allOutbox = await database.select().from(outbox);
    expect(allOutbox.filter((e) => e.eventType === "report.pdf.requested.v1" && e.aggregateId === fixture.reportVersionId)).toHaveLength(0);

    const failedEvents = allOutbox.filter((e) => e.eventType === "report.fulfillment.failed.v1" && e.aggregateId === fixture.reportVersionId);
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].payload).toMatchObject({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      errorCode: "REPORT_SAFETY_REJECTED",
      failureStage: "generation",
    });

    await database.$client.end();
  });

  it("provider timeout is retryable and releases the queue lease", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "gen-timeout", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const sourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });
    const versionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const gate = createAiProductionGate("approved");
    const provider = createDeterministicMockProvider({
      writerResponse: () => ({
        ok: false as const,
        error: { code: "AI_TIMEOUT" as const, retryable: true },
      }),
    });
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });

    const allVersions = await database.select().from(reportVersions);
    expect(allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId)).toHaveLength(0);

    const allJobs = await database.select().from(reportQueueJobs);
    const job = allJobs.find((j) => j.id === fixture.jobId);
    expect(job?.status).toBe("retryable_failure");
    expect(job?.lastErrorCode).toBe("AI_TIMEOUT");
    expect(job?.leasedBy).toBeNull();
    expect(job?.leasedUntil).toBeNull();

    const allReservations = await database.select().from(reportReservations);
    const reservation = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservation?.status).toBe("generating");

    const allAttempts = await database.select().from(reportGenerationAttempts);
    const attempt = allAttempts.find((a) => a.jobId === fixture.jobId);
    expect(attempt?.status).toBe("failed");
    expect(attempt?.errorCode).toBe("AI_TIMEOUT");

    const allOutbox = await database.select().from(outbox);
    expect(allOutbox.filter((e) => e.aggregateId === fixture.reportVersionId)).toHaveLength(0);

    await database.$client.end();
  });

  it("uncaught provider exception from writer or critic is classified as retryable AI_TIMEOUT and releases lease", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "gen-thrown-exception", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const sourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });
    const versionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const gate = createAiProductionGate("approved");
    const provider = createDeterministicMockProvider({
      writerResponse: () => {
        throw new Error("network socket hung up or ETIMEDOUT");
      },
    });
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });

    const allJobs = await database.select().from(reportQueueJobs);
    const job = allJobs.find((j) => j.id === fixture.jobId);
    expect(job?.status).toBe("retryable_failure");
    expect(job?.lastErrorCode).toBe("AI_TIMEOUT");
    expect(job?.leasedBy).toBeNull();
    expect(job?.leasedUntil).toBeNull();

    const allReservations = await database.select().from(reportReservations);
    const reservation = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservation?.status).toBe("generating");

    const allAttempts = await database.select().from(reportGenerationAttempts);
    const attempt = allAttempts.find((a) => a.jobId === fixture.jobId);
    expect(attempt?.status).toBe("failed");
    expect(attempt?.errorCode).toBe("AI_TIMEOUT");

    await database.$client.end();
  });

  it("retryable AI_PROVIDER_REQUEST_FAILED is classified as AI_TIMEOUT and enters retry path", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "gen-provider-req-failed", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const sourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });
    const versionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const gate = createAiProductionGate("approved");
    const provider = createDeterministicMockProvider({
      writerResponse: () => ({
        ok: false as const,
        error: { code: "AI_PROVIDER_REQUEST_FAILED" as const, retryable: true },
      }),
    });
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });

    const allJobs = await database.select().from(reportQueueJobs);
    const job = allJobs.find((j) => j.id === fixture.jobId);
    expect(job?.status).toBe("retryable_failure");
    expect(job?.lastErrorCode).toBe("AI_TIMEOUT");
    expect(job?.leasedBy).toBeNull();

    const allReservations = await database.select().from(reportReservations);
    const reservation = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservation?.status).toBe("generating");

    const allAttempts = await database.select().from(reportGenerationAttempts);
    const attempt = allAttempts.find((a) => a.jobId === fixture.jobId);
    expect(attempt?.status).toBe("failed");
    expect(attempt?.errorCode).toBe("AI_TIMEOUT");

    await database.$client.end();
  });

  it("generation timeout on attempt 3 terminates with JOB_RETRY_EXHAUSTED via terminal failure transaction", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "gen-attempt3-timeout", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
      attemptCount: 2,
    });
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const sourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });
    const versionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const gate = createAiProductionGate("approved");
    const provider = createDeterministicMockProvider({
      writerResponse: () => ({
        ok: false as const,
        error: { code: "AI_TIMEOUT" as const, retryable: true },
      }),
    });
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });

    const allJobs = await database.select().from(reportQueueJobs);
    const job = allJobs.find((j) => j.id === fixture.jobId);
    expect(job?.status).toBe("terminal_failure");
    expect(job?.lastErrorCode).toBe("JOB_RETRY_EXHAUSTED");
    expect(job?.attemptCount).toBe(3);

    const allReservations = await database.select().from(reportReservations);
    const reservation = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservation?.status).toBe("terminal_failure");
    expect(reservation?.lastErrorCode).toBe("JOB_RETRY_EXHAUSTED");
    expect(reservation?.stateVersion).toBe(3);

    const allOutbox = await database.select().from(outbox);
    const failedEvents = allOutbox.filter((e) => e.eventType === "report.fulfillment.failed.v1" && e.aggregateId === fixture.reportVersionId);
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].payload).toMatchObject({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      errorCode: "JOB_RETRY_EXHAUSTED",
      failureStage: "generation",
    });

    await database.$client.end();
  });

  it("surfaces REPORT_VERSION_CONFLICT when recordFailedAttempt fails and prevents incorrect queue mutation", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "gen-failed-attempt-conflict", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const sourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });
    const realVersionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const versionRepository = {
      ...realVersionRepository,
      recordFailedAttempt: async () => ({
        ok: false as const,
        error: {
          code: "REPORT_VERSION_CONFLICT" as const,
          messageKey: "reports.report_version_conflict",
          retryable: false,
        },
      }),
    };
    const gate = createAiProductionGate("approved");
    const provider = createDeterministicMockProvider({
      writerResponse: () => ({
        ok: false as const,
        error: { code: "AI_TIMEOUT" as const, retryable: true },
      }),
    });
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });

    const allJobs = await database.select().from(reportQueueJobs);
    const job = allJobs.find((j) => j.id === fixture.jobId);
    expect(job?.status).toBe("leased");
    expect(job?.leasedBy).toBe(fixture.workerId);
    expect(job?.lastErrorCode).toBeNull();

    await database.$client.end();
  });

  it("malformed output is terminal AI_OUTPUT_INVALID", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "gen-malformed", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const sourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });
    const versionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const gate = createAiProductionGate("approved");
    const provider = createDeterministicMockProvider({
      writerResponse: () => ({
        ok: false as const,
        error: { code: "AI_OUTPUT_INVALID" as const, retryable: false },
      }),
    });
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });

    const allVersions = await database.select().from(reportVersions);
    expect(allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId)).toHaveLength(0);

    const allReservations = await database.select().from(reportReservations);
    const reservation = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservation?.status).toBe("terminal_failure");
    expect(reservation?.lastErrorCode).toBe("AI_OUTPUT_INVALID");

    const allAttempts = await database.select().from(reportGenerationAttempts);
    const attempt = allAttempts.find((a) => a.jobId === fixture.jobId);
    expect(attempt?.status).toBe("failed");
    expect(attempt?.errorCode).toBe("AI_OUTPUT_INVALID");

    const allJobs = await database.select().from(reportQueueJobs);
    const job = allJobs.find((j) => j.id === fixture.jobId);
    expect(job?.status).toBe("terminal_failure");
    expect(job?.lastErrorCode).toBe("AI_OUTPUT_INVALID");

    const allOutbox = await database.select().from(outbox);
    const failedEvents = allOutbox.filter((e) => e.eventType === "report.fulfillment.failed.v1" && e.aggregateId === fixture.reportVersionId);
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].payload).toMatchObject({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      errorCode: "AI_OUTPUT_INVALID",
      failureStage: "generation",
    });

    await database.$client.end();
  });

  it("unsupported or unapproved AI capability returns terminal AI_CAPABILITY_UNSUPPORTED", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "unapproved-gate", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    const knowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const sourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval,
    });
    const versionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const gate = createAiProductionGate("pending");
    const provider = createDeterministicMockProvider();
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });

    const allVersions = await database.select().from(reportVersions);
    expect(allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId)).toHaveLength(0);

    const allReservations = await database.select().from(reportReservations);
    const reservation = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservation?.status).toBe("terminal_failure");
    expect(reservation?.lastErrorCode).toBe("AI_CAPABILITY_UNSUPPORTED");

    const allOutbox = await database.select().from(outbox);
    const failedEvents = allOutbox.filter((e) => e.eventType === "report.fulfillment.failed.v1" && e.aggregateId === fixture.reportVersionId);
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].payload).toMatchObject({
      errorCode: "AI_CAPABILITY_UNSUPPORTED",
      failureStage: "generation",
    });

    await database.$client.end();
  });

  it("duplicate/crash replay calls neither source loader nor provider and creates no second output/event", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "gen-replay", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    let loadSourceCalls = 0;
    const realKnowledgeRetrieval = createKnowledgeRetrievalService({ database });
    const realSourceRepository = createDatabaseReportGenerationSourceRepository({
      database,
      knowledgeRetrieval: realKnowledgeRetrieval,
    });
    const sourceRepository = {
      async loadSource(params: any) {
        loadSourceCalls++;
        return realSourceRepository.loadSource(params);
      },
    };
    const versionRepository = createDatabaseReportVersionRepository(
      database,
      reportRepositoryOptions,
    );
    const gate = createAiProductionGate("approved");
    const provider = createDeterministicMockProvider();
    const generationService = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
      generationService,
    });

    const firstResult = await processor.processNext();
    expect(firstResult).toEqual({ processed: true });
    expect(loadSourceCalls).toBe(1);
    expect(provider.writerCalls).toBe(1);
    expect(provider.criticCalls).toBe(1);

    const replayJobId = `replay-job-${randomUUID()}`;
    await database.insert(reportQueueJobs).values({
      id: replayJobId,
      name: "report.generate.v1",
      sourceEventId: `evt-replay-${randomUUID()}`,
      traceId: `trace-replay-${randomUUID()}`,
      idempotencyKey: `report-generate-replay:${fixture.reportVersionId}`,
      payload: {
        reportId: fixture.reportId,
        reportVersionId: fixture.reportVersionId,
        entitlementId: fixture.entitlementId,
        chartVersionId: fixture.chartVersionId,
        evidenceVersionId: fixture.evidenceVersionId,
        knowledgeVersionId: fixture.knowledgeVersionId,
        promptVersion: "ziwei.identity.prompt.v1",
        reportConfigVersion: "identity-report-config.v1",
        locale: "vi",
        sku: "ZIWEI-IDENTITY-P0",
      },
      status: "waiting",
      attemptCount: 0,
      availableAt: new Date(),
    });

    loadSourceCalls = 0;
    const initialWriterCalls = provider.writerCalls;
    const initialCriticCalls = provider.criticCalls;

    const replayResult = await processor.processNext();
    expect(replayResult).toEqual({ processed: true });

    expect(loadSourceCalls).toBe(0);
    expect(provider.writerCalls).toBe(initialWriterCalls);
    expect(provider.criticCalls).toBe(initialCriticCalls);

    const allVersions = await database.select().from(reportVersions);
    expect(allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId)).toHaveLength(1);

    const allOutbox = await database.select().from(outbox);
    expect(allOutbox.filter((e) => e.eventType === "report.pdf.requested.v1" && e.aggregateId === fixture.reportVersionId)).toHaveLength(1);

    await database.$client.end();
  });

  it("pending default runtime returns zero without claiming a job or calling a provider", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "pending-runner", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });

    const previousEnv = process.env.WORKER_QUEUES;
    process.env.WORKER_QUEUES = "report.generate";

    try {
      const runner = createReportGenerateRunner();
      const result = await runner.runOnce();
      expect(result).toEqual({ processed: 0 });

      const allJobs = await database.select().from(reportQueueJobs);
      const job = allJobs.find((j) => j.id === fixture.jobId);
      expect(job?.status).toBe("waiting");
      expect(job?.leasedBy).toBeNull();
      expect(job?.attemptCount).toBe(0);

      const allVersions = await database.select().from(reportVersions);
      expect(allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId)).toHaveLength(0);
    } finally {
      process.env.WORKER_QUEUES = previousEnv;
      await database.delete(reportQueueJobs);
      await database.$client.end();
    }
  });

  it("existing P04-T03 compatibility behavior remains compatible when no generation dependency is supplied", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "p04-t03-compat", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    const queueStore = createDatabaseReportQueueStore(database, fixture.workerId);
    const reportService = createReportService(database);
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: fixture.workerId,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: true });

    const allJobs = await database.select().from(reportQueueJobs);
    const job = allJobs.find((j) => j.id === fixture.jobId);
    expect(job?.status).toBe("processed");

    const allReservations = await database.select().from(reportReservations);
    const reservation = allReservations.find((r) => r.reportVersionId === fixture.reportVersionId);
    expect(reservation?.status).toBe("generating");

    const allVersions = await database.select().from(reportVersions);
    expect(allVersions.filter((v) => v.reportVersionId === fixture.reportVersionId)).toHaveLength(0);

    const allOutbox = await database.select().from(outbox);
    expect(allOutbox.filter((e) => e.aggregateId === fixture.reportVersionId)).toHaveLength(0);

    await database.$client.end();
  });

  it("recovers terminal failure caused by missing knowledge, preserving history and enqueuing requested outbox event", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "evidence-recovery", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });

    // Simulate production terminal failure state from missing knowledge provisioning
    await database
      .update(reportReservations)
      .set({
        status: "terminal_failure",
        lastErrorCode: "REPORT_EVIDENCE_INVALID",
        activeJobId: fixture.jobId,
        attemptCount: 1,
      })
      .where(eq(reportReservations.reportVersionId, fixture.reportVersionId));

    await database
      .update(reportQueueJobs)
      .set({
        status: "terminal_failure",
        lastErrorCode: "REPORT_EVIDENCE_INVALID",
        attemptCount: 1,
        leasedBy: null,
        leasedUntil: null,
      })
      .where(eq(reportQueueJobs.id, fixture.jobId));

    await database.insert(reportGenerationAttempts).values({
      id: randomUUID(),
      reportVersionId: fixture.reportVersionId,
      jobId: fixture.jobId,
      attemptNumber: 1,
      status: "failed",
      errorCode: "REPORT_EVIDENCE_INVALID",
    });

    await database.insert(outbox).values({
      schemaVersion: 1,
      eventType: "report.fulfillment.failed.v1",
      eventId: `evt-failed-${fixture.reportVersionId}`,
      occurredAt: new Date("2026-09-06T00:00:00.000Z"),
      traceId: `trace-failed-${fixture.reportVersionId}`,
      actorId: null,
      aggregateType: "report",
      aggregateId: fixture.reportVersionId,
      idempotencyKey: `report-failed:${fixture.reportVersionId}:generation`,
      payload: {
        reportId: fixture.reportId,
        reportVersionId: fixture.reportVersionId,
        failureStage: "generation",
        errorCode: "REPORT_EVIDENCE_INVALID",
      },
      status: "processed",
      attemptCount: 1,
      processedAt: new Date("2026-09-06T00:01:00.000Z"),
    });

    const reportService = createReportService(database);
    const recoveryResult = await reportService.recoverEvidenceInvalidGeneration({
      reportVersionId: fixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: "rec-2026-09-06-001",
    });

    expect(recoveryResult).toEqual({ ok: true, stateVersion: 2 });

    // Verify reservation reset and preserved fields
    const [reservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.reportVersionId, fixture.reportVersionId));
    expect(reservation?.status).toBe("requested");
    expect(reservation?.stateVersion).toBe(2);
    expect(reservation?.activeJobId).toBeNull();
    expect(reservation?.lastErrorCode).toBeNull();
    expect(reservation?.nextAttemptAt).toBeNull();
    expect(reservation?.attemptCount).toBe(1);
    expect(reservation?.reportId).toBe(fixture.reportId);
    expect(reservation?.entitlementId).toBe(fixture.entitlementId);
    expect(reservation?.chartVersionId).toBe(fixture.chartVersionId);
    expect(reservation?.evidenceVersionId).toBe(fixture.evidenceVersionId);
    expect(reservation?.knowledgeVersionId).toBe(fixture.knowledgeVersionId);

    // Verify old terminal queue job and attempt remain immutable history
    const [queueJob] = await database
      .select()
      .from(reportQueueJobs)
      .where(eq(reportQueueJobs.id, fixture.jobId));
    expect(queueJob?.status).toBe("terminal_failure");
    expect(queueJob?.lastErrorCode).toBe("REPORT_EVIDENCE_INVALID");
    expect(queueJob?.attemptCount).toBe(1);

    const attempts = await database
      .select()
      .from(reportGenerationAttempts)
      .where(eq(reportGenerationAttempts.reportVersionId, fixture.reportVersionId));
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("failed");
    expect(attempts[0].errorCode).toBe("REPORT_EVIDENCE_INVALID");

    // Verify fresh pending outbox event with exact reservation payload
    const allOutbox = await database
      .select()
      .from(outbox)
      .where(eq(outbox.aggregateId, fixture.reportVersionId));
    const recoveryEvents = allOutbox.filter(
      (e) => e.eventType === "report.generation.requested.v1",
    );
    expect(recoveryEvents).toHaveLength(1);
    const outboxEvent = recoveryEvents[0];
    expect(outboxEvent.status).toBe("pending");
    expect(outboxEvent.attemptCount).toBe(0);
    expect(outboxEvent.aggregateType).toBe("report");
    expect(outboxEvent.aggregateId).toBe(fixture.reportVersionId);
    expect(outboxEvent.actorId).toBeNull();
    expect(outboxEvent.schemaVersion).toBe(1);
    const expectedRecoveryToken = createHash("sha256")
      .update(`${fixture.reportVersionId}::rec-2026-09-06-001`)
      .digest("hex");
    expect(outboxEvent.eventId).toBe(`evt-recovery-${expectedRecoveryToken}`);
    expect(outboxEvent.traceId).toBe(`trace-recovery-${expectedRecoveryToken}`);
    expect(outboxEvent.idempotencyKey).toBe(`report-recovery:${expectedRecoveryToken}`);
    expect(outboxEvent.payload).toEqual({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
    });

    // Dispatch outbox recovery event to create exactly one distinct waiting queue job
    const outboxStore = createDatabaseOutboxStore(database, "test-recovery-dispatcher");
    const queuePublisher = createDatabaseReportQueuePublisher(database);
    const dispatcher = createOutboxDispatcher({
      claim: () => outboxStore.claim(),
      markProcessed: (id) => outboxStore.markProcessed(id),
      release: (id, code) => outboxStore.release(id, code),
      publish: (job) => queuePublisher.publish(job),
    });

    const dispatchResult = await dispatcher.dispatchOne();
    expect(dispatchResult).toEqual({ dispatched: true });

    // Verify exactly one distinct waiting queue job created
    const allJobsAfterDispatch = await database.select().from(reportQueueJobs);
    const waitingRecoveryJobs = allJobsAfterDispatch.filter(
      (j) =>
        j.status === "waiting" &&
        (j.payload as { reportVersionId?: string })?.reportVersionId === fixture.reportVersionId,
    );
    expect(waitingRecoveryJobs).toHaveLength(1);
    const freshJob = waitingRecoveryJobs[0];
    expect(freshJob.id).toBe(`report-generate:${outboxEvent.eventId}`);
    expect(freshJob.idempotencyKey).toBe(`report-generate:${outboxEvent.eventId}`);
    expect(freshJob.sourceEventId).toBe(outboxEvent.eventId);
    expect(freshJob.traceId).toBe(outboxEvent.traceId);
    expect(freshJob.payload).toEqual(outboxEvent.payload);

    // Verify old terminal queue job and attempt remain unchanged
    const [originalJobAfterDispatch] = await database
      .select()
      .from(reportQueueJobs)
      .where(eq(reportQueueJobs.id, fixture.jobId));
    expect(originalJobAfterDispatch?.status).toBe("terminal_failure");
    expect(originalJobAfterDispatch?.lastErrorCode).toBe("REPORT_EVIDENCE_INVALID");
    expect(originalJobAfterDispatch?.attemptCount).toBe(1);

    const attemptsAfterDispatch = await database
      .select()
      .from(reportGenerationAttempts)
      .where(eq(reportGenerationAttempts.reportVersionId, fixture.reportVersionId));
    expect(attemptsAfterDispatch).toHaveLength(1);
    expect(attemptsAfterDispatch[0].status).toBe("failed");
    expect(attemptsAfterDispatch[0].errorCode).toBe("REPORT_EVIDENCE_INVALID");

    // Verify dispatch retry does not create another queue job
    await database
      .update(outbox)
      .set({ status: "pending", processedAt: null, leasedBy: null, leasedUntil: null })
      .where(eq(outbox.id, outboxEvent.id));

    const retryDispatchResult = await dispatcher.dispatchOne();
    expect(retryDispatchResult).toEqual({ dispatched: true });

    const allJobsAfterRetry = await database.select().from(reportQueueJobs);
    const jobsForFirstReport = allJobsAfterRetry.filter(
      (j) => (j.payload as { reportVersionId?: string })?.reportVersionId === fixture.reportVersionId,
    );
    expect(jobsForFirstReport).toHaveLength(2);
    expect(jobsForFirstReport.filter((j) => j.status === "terminal_failure")).toHaveLength(1);
    expect(jobsForFirstReport.filter((j) => j.status === "waiting")).toHaveLength(1);

    // Start generating with the distinct recovery job
    await database
      .update(reportQueueJobs)
      .set({
        status: "leased",
        leasedBy: fixture.workerId,
        leasedUntil: new Date(Date.now() + 60_000),
      })
      .where(eq(reportQueueJobs.id, freshJob.id));

    const startGeneratingResult = await reportService.startGenerating({
      reportVersionId: fixture.reportVersionId,
      jobId: freshJob.id,
      workerId: fixture.workerId,
    });
    expect(startGeneratingResult).toEqual({
      ok: true,
      report: expect.objectContaining({
        status: "generating",
        activeJobId: freshJob.id,
        stateVersion: 3,
      }),
    });

    // Terminal-fail the recovery job; must not collide with old failure event
    const recoveryTerminalResult = await reportService.recordTerminalFailure({
      reportVersionId: fixture.reportVersionId,
      jobId: freshJob.id,
      workerId: fixture.workerId,
      errorCode: "REPORT_VALIDATION_FAILED",
      failureStage: "generation",
      expectedStateVersion: 3,
    });
    expect(recoveryTerminalResult).toEqual({ ok: true });

    const [finalReservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.reportVersionId, fixture.reportVersionId));
    expect(finalReservation?.status).toBe("terminal_failure");
    expect(finalReservation?.lastErrorCode).toBe("REPORT_VALIDATION_FAILED");
    expect(finalReservation?.stateVersion).toBe(4);

    const [finalRecoveryJob] = await database
      .select()
      .from(reportQueueJobs)
      .where(eq(reportQueueJobs.id, freshJob.id));
    expect(finalRecoveryJob?.status).toBe("terminal_failure");
    expect(finalRecoveryJob?.lastErrorCode).toBe("REPORT_VALIDATION_FAILED");
    expect(finalRecoveryJob?.leasedBy).toBeNull();

    const [finalOriginalJob] = await database
      .select()
      .from(reportQueueJobs)
      .where(eq(reportQueueJobs.id, fixture.jobId));
    expect(finalOriginalJob?.status).toBe("terminal_failure");
    expect(finalOriginalJob?.lastErrorCode).toBe("REPORT_EVIDENCE_INVALID");
    expect(finalOriginalJob?.attemptCount).toBe(1);

    const failureOutboxEvents = (
      await database
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, fixture.reportVersionId))
    ).filter((e) => e.eventType === "report.fulfillment.failed.v1");
    expect(failureOutboxEvents).toHaveLength(2);
    expect(failureOutboxEvents[0].eventId).not.toBe(failureOutboxEvents[1].eventId);
    expect(failureOutboxEvents[0].idempotencyKey).not.toBe(failureOutboxEvents[1].idempotencyKey);

    // Verify the same human recoveryId works for two different reports without collision
    const secondFixture = await seedFullOrchestrationFixture(database, "evidence-recovery-second", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    await database
      .update(reportReservations)
      .set({
        status: "terminal_failure",
        lastErrorCode: "REPORT_EVIDENCE_INVALID",
        activeJobId: secondFixture.jobId,
        attemptCount: 1,
      })
      .where(eq(reportReservations.reportVersionId, secondFixture.reportVersionId));

    const secondRecoveryResult = await reportService.recoverEvidenceInvalidGeneration({
      reportVersionId: secondFixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: "rec-2026-09-06-001",
    });
    expect(secondRecoveryResult).toEqual({ ok: true, stateVersion: 2 });

    const [secondReservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.reportVersionId, secondFixture.reportVersionId));
    expect(secondReservation?.status).toBe("requested");
    expect(secondReservation?.stateVersion).toBe(2);

    const secondOutboxEvents = await database
      .select()
      .from(outbox)
      .where(eq(outbox.aggregateId, secondFixture.reportVersionId));
    expect(secondOutboxEvents).toHaveLength(1);
    const secondExpectedToken = createHash("sha256")
      .update(`${secondFixture.reportVersionId}::rec-2026-09-06-001`)
      .digest("hex");
    expect(secondOutboxEvents[0].idempotencyKey).toBe(`report-recovery:${secondExpectedToken}`);
    expect(secondOutboxEvents[0].idempotencyKey).not.toBe(outboxEvent.idempotencyKey);

    // Verify forced outbox collision causes WORKFLOW_STATE_CONFLICT and affected reservation
    // remains terminal_failure with its original stateVersion/error (transaction rollback)
    const collisionFixture = await seedFullOrchestrationFixture(database, "evidence-recovery-collision", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    await database
      .update(reportReservations)
      .set({
        status: "terminal_failure",
        lastErrorCode: "REPORT_EVIDENCE_INVALID",
        activeJobId: collisionFixture.jobId,
        attemptCount: 1,
      })
      .where(eq(reportReservations.reportVersionId, collisionFixture.reportVersionId));

    const forcedRecoveryId = "rec-forced-collision";
    const forcedToken = createHash("sha256")
      .update(`${collisionFixture.reportVersionId}::${forcedRecoveryId}`)
      .digest("hex");

    await database.insert(outbox).values({
      schemaVersion: 1,
      eventType: "report.generation.requested.v1",
      eventId: `evt-recovery-${forcedToken}`,
      occurredAt: new Date(),
      traceId: `trace-recovery-${forcedToken}`,
      actorId: null,
      aggregateType: "report",
      aggregateId: collisionFixture.reportVersionId,
      idempotencyKey: `report-recovery:${forcedToken}`,
      payload: {},
    });

    const collisionResult = await reportService.recoverEvidenceInvalidGeneration({
      reportVersionId: collisionFixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: forcedRecoveryId,
    });
    expect(collisionResult).toEqual({ ok: false, code: "WORKFLOW_STATE_CONFLICT" });

    const [collisionReservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.reportVersionId, collisionFixture.reportVersionId));
    expect(collisionReservation?.status).toBe("terminal_failure");
    expect(collisionReservation?.stateVersion).toBe(1);
    expect(collisionReservation?.lastErrorCode).toBe("REPORT_EVIDENCE_INVALID");
    expect(collisionReservation?.activeJobId).toBe(collisionFixture.jobId);

    // Repeat call with stale expected version fails without duplicate outbox event
    const repeatStale = await reportService.recoverEvidenceInvalidGeneration({
      reportVersionId: fixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: "rec-2026-09-06-001",
    });
    expect(repeatStale).toEqual({ ok: false, code: "WORKFLOW_STATE_CONFLICT" });

    // Repeat call with active (requested) state version also fails without duplicate outbox event
    const repeatRequested = await reportService.recoverEvidenceInvalidGeneration({
      reportVersionId: fixture.reportVersionId,
      expectedStateVersion: 2,
      recoveryId: "rec-2026-09-06-001",
    });
    expect(repeatRequested).toEqual({ ok: false, code: "WORKFLOW_STATE_CONFLICT" });

    const outboxAfterRepeats = await database
      .select()
      .from(outbox)
      .where(eq(outbox.aggregateId, fixture.reportVersionId));
    expect(
      outboxAfterRepeats.filter((e) => e.eventType === "report.generation.requested.v1"),
    ).toHaveLength(1);

    // Fail-closed validation for invalid recovery ID
    const emptyIdResult = await reportService.recoverEvidenceInvalidGeneration({
      reportVersionId: fixture.reportVersionId,
      expectedStateVersion: 2,
      recoveryId: "   ",
    });
    expect(emptyIdResult).toEqual({ ok: false, code: "RECOVERY_ID_INVALID" });

    // Fail-closed validation for report not found
    const notFoundResult = await reportService.recoverEvidenceInvalidGeneration({
      reportVersionId: randomUUID(),
      expectedStateVersion: 1,
      recoveryId: "rec-2026-09-06-not-found",
    });
    expect(notFoundResult).toEqual({ ok: false, code: "REPORT_NOT_FOUND" });

    // Fail-closed validation for immutable report version conflict
    const conflictFixture = await seedFullOrchestrationFixture(database, "evidence-recovery-conflict", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    await database
      .update(reportReservations)
      .set({
        status: "terminal_failure",
        lastErrorCode: "REPORT_EVIDENCE_INVALID",
        activeJobId: conflictFixture.jobId,
        attemptCount: 1,
      })
      .where(eq(reportReservations.reportVersionId, conflictFixture.reportVersionId));

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: conflictFixture.reportId,
      reportVersionId: conflictFixture.reportVersionId,
      entitlementId: conflictFixture.entitlementId,
      chartVersionId: conflictFixture.chartVersionId,
      evidenceVersionId: conflictFixture.evidenceVersionId,
      knowledgeVersionId: conflictFixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<html></html>",
      contentHash: "a".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "v1",
    });

    const conflictResult = await reportService.recoverEvidenceInvalidGeneration({
      reportVersionId: conflictFixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: "rec-2026-09-06-conflict",
    });
    expect(conflictResult).toEqual({ ok: false, code: "REPORT_VERSION_CONFLICT" });

    await database.$client.end();
  });


  it("recovers terminal failure caused by invalid AI output, preserving history and enqueuing requested outbox event", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedFullOrchestrationFixture(database, "output-recovery", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });

    // Simulate terminal failure state from invalid AI output
    await database
      .update(reportReservations)
      .set({
        status: "terminal_failure",
        lastErrorCode: "AI_OUTPUT_INVALID",
        activeJobId: fixture.jobId,
        attemptCount: 1,
      })
      .where(eq(reportReservations.reportVersionId, fixture.reportVersionId));

    await database
      .update(reportQueueJobs)
      .set({
        status: "terminal_failure",
        lastErrorCode: "AI_OUTPUT_INVALID",
        attemptCount: 1,
        leasedBy: null,
        leasedUntil: null,
      })
      .where(eq(reportQueueJobs.id, fixture.jobId));

    await database.insert(reportGenerationAttempts).values({
      id: randomUUID(),
      reportVersionId: fixture.reportVersionId,
      jobId: fixture.jobId,
      attemptNumber: 1,
      status: "failed",
      errorCode: "AI_OUTPUT_INVALID",
    });

    await database.insert(outbox).values({
      schemaVersion: 1,
      eventType: "report.fulfillment.failed.v1",
      eventId: `evt-failed-${fixture.reportVersionId}`,
      occurredAt: new Date("2026-09-08T00:00:00.000Z"),
      traceId: `trace-failed-${fixture.reportVersionId}`,
      actorId: null,
      aggregateType: "report",
      aggregateId: fixture.reportVersionId,
      idempotencyKey: `report-failed:${fixture.reportVersionId}:generation`,
      payload: {
        reportId: fixture.reportId,
        reportVersionId: fixture.reportVersionId,
        failureStage: "generation",
        errorCode: "AI_OUTPUT_INVALID",
      },
      status: "processed",
      attemptCount: 1,
      processedAt: new Date("2026-09-08T00:01:00.000Z"),
    });

    await database.insert(commercePaymentEvents).values({
      id: randomUUID(),
      orderId: fixture.orderId,
      providerEventId: `sepay-recovery-${fixture.orderId}`,
      amount: 79_000,
      currency: "VND",
      status: "paid",
      createdAt: new Date("2026-09-08T00:00:00.000Z"),
    });

    const reportService = createReportService(database);

    // Verify cross-error rejection: recoverEvidenceInvalidGeneration rejects AI_OUTPUT_INVALID reservation
    const wrongMethodResult = await reportService.recoverEvidenceInvalidGeneration({
      reportVersionId: fixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: "rec-wrong-method-001",
    });
    expect(wrongMethodResult).toEqual({ ok: false, code: "WORKFLOW_STATE_CONFLICT" });

    // Verify rejection of REPORT_EVIDENCE_INVALID reservation through recoverInvalidOutputGeneration
    const evidenceFixture = await seedFullOrchestrationFixture(database, "output-recovery-mismatch", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    await database
      .update(reportReservations)
      .set({
        status: "terminal_failure",
        lastErrorCode: "REPORT_EVIDENCE_INVALID",
        activeJobId: evidenceFixture.jobId,
        attemptCount: 1,
      })
      .where(eq(reportReservations.reportVersionId, evidenceFixture.reportVersionId));

    const rejectEvidenceResult = await reportService.recoverInvalidOutputGeneration({
      reportVersionId: evidenceFixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: "rec-output-reject-evidence",
    });
    expect(rejectEvidenceResult).toEqual({ ok: false, code: "WORKFLOW_STATE_CONFLICT" });

    const commerceOrdersBeforeRecovery = await database
      .select()
      .from(commerceOrders);
    const paymentEventsBeforeRecovery = await database
      .select()
      .from(commercePaymentEvents);

    // Execute successful recovery of AI_OUTPUT_INVALID
    const recoveryResult = await reportService.recoverInvalidOutputGeneration({
      reportVersionId: fixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: "rec-invalid-output-001",
    });
    expect(recoveryResult).toEqual({ ok: true, stateVersion: 2 });

    expect(await database.select().from(commerceOrders)).toEqual(
      commerceOrdersBeforeRecovery,
    );
    expect(await database.select().from(commercePaymentEvents)).toEqual(
      paymentEventsBeforeRecovery,
    );

    // Verify reservation reset and preserved fields
    const [reservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.reportVersionId, fixture.reportVersionId));
    expect(reservation?.status).toBe("requested");
    expect(reservation?.stateVersion).toBe(2);
    expect(reservation?.activeJobId).toBeNull();
    expect(reservation?.lastErrorCode).toBeNull();
    expect(reservation?.nextAttemptAt).toBeNull();
    expect(reservation?.attemptCount).toBe(1);
    expect(reservation?.reportId).toBe(fixture.reportId);
    expect(reservation?.entitlementId).toBe(fixture.entitlementId);
    expect(reservation?.chartVersionId).toBe(fixture.chartVersionId);
    expect(reservation?.evidenceVersionId).toBe(fixture.evidenceVersionId);
    expect(reservation?.knowledgeVersionId).toBe(fixture.knowledgeVersionId);

    // Verify old terminal queue job and attempt remain immutable history
    const [queueJob] = await database
      .select()
      .from(reportQueueJobs)
      .where(eq(reportQueueJobs.id, fixture.jobId));
    expect(queueJob?.status).toBe("terminal_failure");
    expect(queueJob?.lastErrorCode).toBe("AI_OUTPUT_INVALID");
    expect(queueJob?.attemptCount).toBe(1);

    const attempts = await database
      .select()
      .from(reportGenerationAttempts)
      .where(eq(reportGenerationAttempts.reportVersionId, fixture.reportVersionId));
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("failed");
    expect(attempts[0].errorCode).toBe("AI_OUTPUT_INVALID");

    const failedEvents = (
      await database
        .select()
        .from(outbox)
        .where(eq(outbox.aggregateId, fixture.reportVersionId))
    ).filter((e) => e.eventType === "report.fulfillment.failed.v1");
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].status).toBe("processed");

    // Verify fresh pending outbox event with exact reservation payload and recovery token
    const allOutbox = await database
      .select()
      .from(outbox)
      .where(eq(outbox.aggregateId, fixture.reportVersionId));
    const recoveryEvents = allOutbox.filter(
      (e) => e.eventType === "report.generation.requested.v1",
    );
    expect(recoveryEvents).toHaveLength(1);
    const outboxEvent = recoveryEvents[0];
    expect(outboxEvent.status).toBe("pending");
    expect(outboxEvent.attemptCount).toBe(0);
    expect(outboxEvent.aggregateType).toBe("report");
    expect(outboxEvent.aggregateId).toBe(fixture.reportVersionId);
    expect(outboxEvent.actorId).toBeNull();
    expect(outboxEvent.schemaVersion).toBe(1);

    const expectedRecoveryToken = createHash("sha256")
      .update(`invalid_output::${fixture.reportVersionId}::rec-invalid-output-001`)
      .digest("hex");
    expect(outboxEvent.eventId).toBe(`evt-recovery-${expectedRecoveryToken}`);
    expect(outboxEvent.traceId).toBe(`trace-recovery-${expectedRecoveryToken}`);
    expect(outboxEvent.idempotencyKey).toBe(`report-recovery:${expectedRecoveryToken}`);
    expect(outboxEvent.payload).toEqual({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
    });

    // Verify collision safety: legacy evidence recovery with the same reportVersionId and recoveryId produces a different token
    const sameIdLegacyEvidenceToken = createHash("sha256")
      .update(`${fixture.reportVersionId}::rec-invalid-output-001`)
      .digest("hex");
    expect(expectedRecoveryToken).not.toBe(sameIdLegacyEvidenceToken);

    // Prove invalid-output recoveryId X does not collide with legacy evidence recoveryId invalid_output::X for the same reportVersionId
    const craftedLegacyEvidenceToken = createHash("sha256")
      .update(`${fixture.reportVersionId}::invalid_output::rec-invalid-output-001`)
      .digest("hex");
    expect(expectedRecoveryToken).not.toBe(craftedLegacyEvidenceToken);

    // Dispatch outbox recovery event using a scoped claim test-double returning only this recovery event
    const queuePublisher = createDatabaseReportQueuePublisher(database);
    let recoveryClaimed = false;
    const dispatcher = createOutboxDispatcher({
      claim: async () => {
        if (recoveryClaimed) return null;
        recoveryClaimed = true;
        return {
          id: outboxEvent.id,
          eventId: outboxEvent.eventId,
          traceId: outboxEvent.traceId,
          idempotencyKey: outboxEvent.idempotencyKey,
          eventType: outboxEvent.eventType,
          payload: outboxEvent.payload,
        };
      },
      markProcessed: async (id) => {
        await database
          .update(outbox)
          .set({ status: "processed", processedAt: new Date() })
          .where(eq(outbox.id, id));
      },
      release: async (id, code) => {
        await database
          .update(outbox)
          .set({ status: "pending", lastErrorCode: code })
          .where(eq(outbox.id, id));
      },
      publish: (job) => queuePublisher.publish(job),
    });

    const dispatchResult = await dispatcher.dispatchOne();
    expect(dispatchResult).toEqual({ dispatched: true });

    // Verify exactly one distinct waiting queue job created
    const allJobsAfterDispatch = await database.select().from(reportQueueJobs);
    const waitingRecoveryJobs = allJobsAfterDispatch.filter(
      (j) =>
        j.status === "waiting" &&
        (j.payload as { reportVersionId?: string })?.reportVersionId === fixture.reportVersionId,
    );
    expect(waitingRecoveryJobs).toHaveLength(1);
    const freshJob = waitingRecoveryJobs[0];
    expect(freshJob.id).toBe(`report-generate:${outboxEvent.eventId}`);
    expect(freshJob.idempotencyKey).toBe(`report-generate:${outboxEvent.eventId}`);
    expect(freshJob.sourceEventId).toBe(outboxEvent.eventId);
    expect(freshJob.traceId).toBe(outboxEvent.traceId);
    expect(freshJob.payload).toEqual(outboxEvent.payload);

    // Verify old terminal queue job remains unchanged
    const [originalJobAfterDispatch] = await database
      .select()
      .from(reportQueueJobs)
      .where(eq(reportQueueJobs.id, fixture.jobId));
    expect(originalJobAfterDispatch?.status).toBe("terminal_failure");
    expect(originalJobAfterDispatch?.lastErrorCode).toBe("AI_OUTPUT_INVALID");
    expect(originalJobAfterDispatch?.attemptCount).toBe(1);

    // Repeat call with stale expected version fails without duplicate outbox event
    const repeatStale = await reportService.recoverInvalidOutputGeneration({
      reportVersionId: fixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: "rec-invalid-output-001",
    });
    expect(repeatStale).toEqual({ ok: false, code: "WORKFLOW_STATE_CONFLICT" });

    // Fail-closed validation for invalid recovery ID
    const emptyIdResult = await reportService.recoverInvalidOutputGeneration({
      reportVersionId: fixture.reportVersionId,
      expectedStateVersion: 2,
      recoveryId: "   ",
    });
    expect(emptyIdResult).toEqual({ ok: false, code: "RECOVERY_ID_INVALID" });

    // Fail-closed validation for report not found
    const notFoundResult = await reportService.recoverInvalidOutputGeneration({
      reportVersionId: randomUUID(),
      expectedStateVersion: 1,
      recoveryId: "rec-invalid-output-not-found",
    });
    expect(notFoundResult).toEqual({ ok: false, code: "REPORT_NOT_FOUND" });

    // Fail-closed validation for immutable report version conflict
    const conflictFixture = await seedFullOrchestrationFixture(database, "output-recovery-conflict", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    await database
      .update(reportReservations)
      .set({
        status: "terminal_failure",
        lastErrorCode: "AI_OUTPUT_INVALID",
        activeJobId: conflictFixture.jobId,
        attemptCount: 1,
      })
      .where(eq(reportReservations.reportVersionId, conflictFixture.reportVersionId));

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: conflictFixture.reportId,
      reportVersionId: conflictFixture.reportVersionId,
      entitlementId: conflictFixture.entitlementId,
      chartVersionId: conflictFixture.chartVersionId,
      evidenceVersionId: conflictFixture.evidenceVersionId,
      knowledgeVersionId: conflictFixture.knowledgeVersionId,
      promptVersion: "ziwei.identity.prompt.v1",
      reportConfigVersion: "identity-report-config.v1",
      templateVersion: "identity-report-html.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: {},
      htmlContent: "<html></html>",
      contentHash: "c".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "v1",
    });

    const conflictResult = await reportService.recoverInvalidOutputGeneration({
      reportVersionId: conflictFixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: "rec-invalid-output-conflict",
    });
    expect(conflictResult).toEqual({ ok: false, code: "REPORT_VERSION_CONFLICT" });

    // Forced outbox collision causes WORKFLOW_STATE_CONFLICT and affected reservation
    // remains terminal_failure with its original stateVersion/error (transaction rollback)
    const collisionFixture = await seedFullOrchestrationFixture(database, "output-recovery-collision", {
      jobLeaseStatus: "waiting",
      reservationStatus: "requested",
    });
    await database
      .update(reportReservations)
      .set({
        status: "terminal_failure",
        lastErrorCode: "AI_OUTPUT_INVALID",
        activeJobId: collisionFixture.jobId,
        attemptCount: 1,
      })
      .where(eq(reportReservations.reportVersionId, collisionFixture.reportVersionId));

    const forcedRecoveryId = "rec-forced-collision-output";
    const forcedToken = createHash("sha256")
      .update(`invalid_output::${collisionFixture.reportVersionId}::${forcedRecoveryId}`)
      .digest("hex");

    await database.insert(outbox).values({
      schemaVersion: 1,
      eventType: "report.generation.requested.v1",
      eventId: `evt-recovery-${forcedToken}`,
      occurredAt: new Date(),
      traceId: `trace-recovery-${forcedToken}`,
      actorId: null,
      aggregateType: "report",
      aggregateId: collisionFixture.reportVersionId,
      idempotencyKey: `report-recovery:${forcedToken}`,
      payload: {},
    });

    const collisionResult = await reportService.recoverInvalidOutputGeneration({
      reportVersionId: collisionFixture.reportVersionId,
      expectedStateVersion: 1,
      recoveryId: forcedRecoveryId,
    });
    expect(collisionResult).toEqual({ ok: false, code: "WORKFLOW_STATE_CONFLICT" });

    const [collisionReservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.reportVersionId, collisionFixture.reportVersionId));
    expect(collisionReservation?.status).toBe("terminal_failure");
    expect(collisionReservation?.stateVersion).toBe(1);
    expect(collisionReservation?.lastErrorCode).toBe("AI_OUTPUT_INVALID");
    expect(collisionReservation?.activeJobId).toBe(collisionFixture.jobId);

    await database.$client.end();
  });


  it("atomically creates one pending report_terminal_failure delivery with bounded payload, prevents replay duplicates, and enforces atomic rollback on conflict", async () => {
    const database = createDatabase(databaseUrl);
    const reportService = createReportService(database);
    const fixture = await seedFullOrchestrationFixture(database, "terminal-alert-atomicity", {
      jobLeaseStatus: "leased",
      reservationStatus: "generating",
      leasedBy: "worker-term-alert-1",
      leasedUntil: new Date(Date.now() + 60_000),
    });

    const [orderBefore] = await database.select().from(commerceOrders).where(eq(commerceOrders.id, fixture.orderId));
    const [paymentBefore] = await database.select().from(commercePaymentEvents).where(eq(commercePaymentEvents.orderId, fixture.orderId));

    // 1. Terminal failure transition
    const termResult = await reportService.recordTerminalFailure({
      reportVersionId: fixture.reportVersionId,
      jobId: fixture.jobId,
      workerId: "worker-term-alert-1",
      errorCode: "JOB_RETRY_EXHAUSTED",
      failureStage: "generation",
    });
    expect(termResult).toEqual({ ok: true });

    // Verify reservation transitioned
    const [res] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.reportVersionId, fixture.reportVersionId));
    expect(res?.status).toBe("terminal_failure");
    expect(res?.lastErrorCode).toBe("JOB_RETRY_EXHAUSTED");

    // Verify exactly one pending commerce_alert_deliveries row created atomically
    const failureToken = createHash("sha256")
      .update(`${fixture.reportVersionId}::${fixture.jobId}::generation`)
      .digest("hex");
    const expectedIdempotencyKey = `report-terminal-failure:${failureToken}`;

    const alertRows = await database
      .select()
      .from(commerceAlertDeliveries)
      .where(eq(commerceAlertDeliveries.idempotencyKey, expectedIdempotencyKey));
    expect(alertRows).toHaveLength(1);

    const alert = alertRows[0];
    expect(alert.alertKind).toBe("report_terminal_failure");
    expect(alert.status).toBe("pending");
    expect(alert.leaseToken).toBeNull();
    expect(alert.sentAt).toBeNull();
    expect(alert.payload).toEqual({
      reportVersionId: fixture.reportVersionId,
      failureStage: "generation",
      errorCode: "JOB_RETRY_EXHAUSTED",
      failedAt: expect.any(String),
      idempotencyKey: expectedIdempotencyKey,
    });

    // Verify strictly bounded payload (no customer PII, credentials, or prompt)
    const payloadStr = JSON.stringify(alert.payload);
    expect(payloadStr).not.toContain("customer");
    expect(payloadStr).not.toContain("example.test");
    expect(payloadStr).not.toContain("Orchestration Test User");
    expect(payloadStr).not.toContain("chart");
    expect(payloadStr).not.toContain("ziwei");

    // 2. Replay with the same parameters fails with WORKFLOW_STATE_CONFLICT without duplicate alert
    const replayResult = await reportService.recordTerminalFailure({
      reportVersionId: fixture.reportVersionId,
      jobId: fixture.jobId,
      workerId: "worker-term-alert-1",
      errorCode: "JOB_RETRY_EXHAUSTED",
      failureStage: "generation",
    });
    expect(replayResult.ok).toBe(false);
    expect(["LEASE_LOST", "WORKFLOW_STATE_CONFLICT"]).toContain(replayResult.code);

    const alertRowsAfterReplay = await database
      .select()
      .from(commerceAlertDeliveries)
      .where(eq(commerceAlertDeliveries.idempotencyKey, expectedIdempotencyKey));
    expect(alertRowsAfterReplay).toHaveLength(1);

    // 3. Conflict case: lease/state conflict commits neither a terminal transition nor an alert
    const conflictFixture = await seedFullOrchestrationFixture(database, "terminal-alert-conflict", {
      jobLeaseStatus: "leased",
      reservationStatus: "generating",
      leasedBy: "legitimate-worker",
      leasedUntil: new Date(Date.now() + 60_000),
    });

    const staleWorkerResult = await reportService.recordTerminalFailure({
      reportVersionId: conflictFixture.reportVersionId,
      jobId: conflictFixture.jobId,
      workerId: "stale-worker-impostor",
      errorCode: "JOB_RETRY_EXHAUSTED",
      failureStage: "generation",
    });
    expect(staleWorkerResult).toEqual({ ok: false, code: "LEASE_LOST" });

    const conflictFailureToken = createHash("sha256")
      .update(`${conflictFixture.reportVersionId}::${conflictFixture.jobId}::generation`)
      .digest("hex");
    const conflictAlertRows = await database
      .select()
      .from(commerceAlertDeliveries)
      .where(
        eq(
          commerceAlertDeliveries.idempotencyKey,
          `report-terminal-failure:${conflictFailureToken}`,
        ),
      );
    expect(conflictAlertRows).toHaveLength(0);

    const [unmodifiedRes] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.reportVersionId, conflictFixture.reportVersionId));
    expect(unmodifiedRes?.status).toBe("generating");

    // 10. Verify no commerce orders or payments were mutated
    const [orderAfter] = await database.select().from(commerceOrders).where(eq(commerceOrders.id, fixture.orderId));
    const [paymentAfter] = await database.select().from(commercePaymentEvents).where(eq(commercePaymentEvents.orderId, fixture.orderId));
    expect(orderAfter).toEqual(orderBefore);
    expect(paymentAfter).toEqual(paymentBefore);

    await database.$client.end();
  });

  it("rolls back job and reservation transitions when alert idempotency key collides with pre-existing row", async () => {
    const database = createDatabase(databaseUrl);
    const reportService = createReportService(database);
    const fixture = await seedFullOrchestrationFixture(database, "terminal-alert-key-collision", {
      jobLeaseStatus: "leased",
      reservationStatus: "generating",
      leasedBy: "collision-worker-1",
      leasedUntil: new Date(Date.now() + 120_000),
    });

    const [orderBefore] = await database
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.id, fixture.orderId));
    const [paymentBefore] = await database
      .select()
      .from(commercePaymentEvents)
      .where(eq(commercePaymentEvents.orderId, fixture.orderId));

    // 2. Compute exact future terminal-alert idempotency key
    const failureToken = createHash("sha256")
      .update(`${fixture.reportVersionId}::${fixture.jobId}::generation`)
      .digest("hex");
    const collisionIdempotencyKey = `report-terminal-failure:${failureToken}`;

    // 3. Pre-seed commerce_alert_deliveries with that key and wrong kind/malformed payload
    const preSeededCreatedAt = new Date("2026-09-08T10:00:00.000Z");
    await database.insert(commerceAlertDeliveries).values({
      idempotencyKey: collisionIdempotencyKey,
      alertKind: "wrong_kind_collision",
      payload: { corrupted: true, reason: "pre_seeded_collision" },
      status: "pending",
      createdAt: preSeededCreatedAt,
      updatedAt: preSeededCreatedAt,
    });

    // 4 & 5. Call recordTerminalFailure and assert it rejects/throws
    await expect(
      reportService.recordTerminalFailure({
        reportVersionId: fixture.reportVersionId,
        jobId: fixture.jobId,
        workerId: "collision-worker-1",
        errorCode: "JOB_RETRY_EXHAUSTED",
        failureStage: "generation",
      }),
    ).rejects.toThrow();

    // 6. Assert the job remains leased and not terminal
    const [unmodifiedJob] = await database
      .select()
      .from(reportQueueJobs)
      .where(eq(reportQueueJobs.id, fixture.jobId));
    expect(unmodifiedJob?.status).toBe("leased");
    expect(unmodifiedJob?.leasedBy).toBe("collision-worker-1");
    expect(unmodifiedJob?.lastErrorCode).toBeNull();

    // 7. Assert the reservation remains generating with its prior state version and error state
    const [unmodifiedReservation] = await database
      .select()
      .from(reportReservations)
      .where(eq(reportReservations.reportVersionId, fixture.reportVersionId));
    expect(unmodifiedReservation?.status).toBe("generating");
    expect(unmodifiedReservation?.stateVersion).toBe(1);
    expect(unmodifiedReservation?.lastErrorCode).toBeNull();

    // 8. Assert pre-seeded collision row is unchanged and no second alert exists
    const collisionAlertRows = await database
      .select()
      .from(commerceAlertDeliveries)
      .where(eq(commerceAlertDeliveries.idempotencyKey, collisionIdempotencyKey));
    expect(collisionAlertRows).toHaveLength(1);
    expect(collisionAlertRows[0].alertKind).toBe("wrong_kind_collision");
    expect(collisionAlertRows[0].payload).toEqual({
      corrupted: true,
      reason: "pre_seeded_collision",
    });

    // 9. Assert no commerce order or payment event changes
    const [orderAfter] = await database
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.id, fixture.orderId));
    const [paymentAfter] = await database
      .select()
      .from(commercePaymentEvents)
      .where(eq(commercePaymentEvents.orderId, fixture.orderId));
    expect(orderAfter).toEqual(orderBefore);
    expect(paymentAfter).toEqual(paymentBefore);

    await database.$client.end();
  });
});
