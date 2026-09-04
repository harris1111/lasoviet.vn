import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_VI,
  IDENTITY_REPORT_SECTION_IDS,
  type IdentityReportV1,
  type NormalizedZiweiChartV1,
} from "@lasoviet/contracts";
import {
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceOrders,
  createDatabase,
  evidenceItems,
  evidenceSets,
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
  createDatabaseReportGenerationSourceRepository,
  createDatabaseReportVersionRepository,
  createKnowledgeIngestionService,
  createKnowledgeRetrievalService,
  type KnowledgeManifestV1,
} from "../../packages/backend/src/index.js";

const palaceIds = [
  "life", "siblings", "spouse", "children", "wealth", "health",
  "travel", "friends", "career", "property", "fortune", "parents",
] as const;

function sampleChart(): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id) => ({
      id: `ziwei.palace.${id}` as NormalizedZiweiChartV1["palaces"][number]["id"],
      earthlyBranchId: "ziwei.branch.tiger",
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
  return {
    version: 1,
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    title: "Bản sắc cá nhân Tử Vi Đẩu Số",
    subtitle: "Báo cáo phân tích định vị bản sắc cá nhân",
    metadata: {
      calculatedAt: "2026-09-02T00:00:00+00:00",
      rulesetVersion: "ziwei.identity.v1",
      evidenceCount: 3,
    },
    sections: IDENTITY_REPORT_SECTION_IDS.map((id) => ({
      id,
      title: `Tiêu đề mục ${id}`,
      narrative: `Nội dung diễn giải chi tiết cho phần ${id} mang tính chất phản chiếu và hỗ trợ định hướng cá nhân.`,
      claims: [
        {
          text: `Nhận định cốt lõi cho mục ${id} gắn với các chỉ dấu trong lá số tử vi.`,
          confidence: "moderate",
          evidenceIds: ["ziwei.identity.life-palace"],
          limitations: ["Nhận định mang tính tham khảo và tự chiêm nghiệm."],
          suggestedActions: [
            {
              text: "Xem xét kỹ phản ứng của bản thân trong các bối cảnh quan trọng.",
              category: "reflect",
            },
          ],
        },
      ],
    })),
    reflectionQuestions: [
      "Bạn nhận thấy điều gì phản ánh đúng nhất cách bạn phản ứng trước áp lực?",
    ],
    summaryActions: [
      "Dành thời gian quan sát thói quen ra quyết định trong tuần này.",
    ],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_VI,
  };
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
      promptVersion: "identity-report-prompt.v1",
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
        promptVersion: "identity-report-prompt.v1",
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
    const repository = createDatabaseReportVersionRepository(database);

    const startAttemptResult = await repository.startOrReuseAttempt({
      jobId: fixture.jobId,
      attemptNumber: 1,
      reportVersionId: fixture.reportVersionId,
      providerId: "openai",
      modelId: "gpt-4o",
    });
    expect(startAttemptResult.ok).toBe(true);

    const structuredContent = sampleVietnameseReport();
    const htmlContent = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>${structuredContent.title}</title></head><body><h1>${structuredContent.title}</h1></body></html>`;
    const expectedHash = createHash("sha256").update(Buffer.from(htmlContent, "utf8")).digest("hex").toLowerCase();
    expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);

    const commitResult = await repository.commitImmutableVersion({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "identity-report-prompt.v1",
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

    await database.$client.end();
  });

  it("replays existing immutable version without creating second output, attempt, or outbox event", async () => {
    const database = createDatabase(databaseUrl);
    const fixture = await seedReservationAndJobFixture(database, "replay");
    const repository = createDatabaseReportVersionRepository(database);

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
      promptVersion: "identity-report-prompt.v1",
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

    await database.$client.end();
  });

  it("rolls back with REPORT_VERSION_CONFLICT when queue lease is expired or lost to another worker", async () => {
    const database = createDatabase(databaseUrl);
    const past = new Date("2026-09-03T00:00:00Z");
    const fixture = await seedReservationAndJobFixture(database, "stale-lease", {
      leasedUntil: past,
    });
    const repository = createDatabaseReportVersionRepository(database);

    const structuredContent = sampleVietnameseReport();
    const htmlContent = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Stale</title></head><body><h1>Stale</h1></body></html>`;

    const result = await repository.commitImmutableVersion({
      reportId: fixture.reportId,
      reportVersionId: fixture.reportVersionId,
      entitlementId: fixture.entitlementId,
      chartVersionId: fixture.chartVersionId,
      evidenceVersionId: fixture.evidenceVersionId,
      knowledgeVersionId: fixture.knowledgeVersionId,
      promptVersion: "identity-report-prompt.v1",
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
    const repository = createDatabaseReportVersionRepository(database);

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
      promptVersion: "identity-report-prompt.v1",
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
      promptVersion: "identity-report-prompt.v1",
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
});
