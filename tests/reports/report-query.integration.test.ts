import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  IDENTITY_REPORT_SECTION_IDS,
  type CurrentActor,
} from "@lasoviet/contracts";
import {
  createDatabase,
  runMigrations,
  authUsers,
  birthProfiles,
  birthProfileRevisions,
  calculationRuns,
  ziweiCharts,
  ziweiChartVersions,
  commerceOrders,
  commerceEntitlements,
  reportReservations,
  reportVersions,
  evidenceSets,
  evidenceItems,
  outbox,
  type Database,
} from "../../packages/database/src/index.js";
import {
  createDatabaseReportQueryRepository,
  createReportQueryService,
} from "../../packages/backend/src/index.js";

const containerTimeoutMs = 120_000;

describe("report query integration test with real database", () => {
  let container: any;
  let databaseUrl: string;
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("test_db")
      .withUsername("postgres")
      .withPassword("postgres")
      .start();

    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
    database = createDatabase(databaseUrl);
  }, containerTimeoutMs);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  });

  it("authorizes owner, returns ready report, isolates other owner, and makes no mutations", async () => {
    const owner1Id = randomUUID();
    const owner2Id = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    const entitlement1Id = randomUUID();
    const order1Id = randomUUID();

    await database.insert(authUsers).values([
      { id: owner1Id, name: "Owner One", email: "owner1@example.com", role: "user" },
      { id: owner2Id, name: "Owner Two", email: "owner2@example.com", role: "user" },
    ]);


    const profileId = randomUUID();
    await database.insert(birthProfiles).values({
      id: profileId,
      userId: owner1Id,
    });

    const revisionId = randomUUID();
    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      consentVersion: "2026-09-01",
      originalInput: {},
      normalizedInput: { tzOffset: 420 },
      rawInput: {},
      normalizedOutput: {},
      privateRawSnapshot: { raw: true },
      warnings: [],
      provenance: { version: 1 },
    });
    await database.insert(ziweiCharts).values({
      id: "chart-1",
      profileId,
      profileRevisionId: revisionId,
    });

    const runId = randomUUID();
    await database.insert(calculationRuns).values({
      id: runId,
      profileId,
      idempotencyKey: "idem-" + runId,
      profileRevisionId: revisionId,
      engineId: "iztro",
      engineVersion: "1.0.0",
      adapterId: "iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart.v1",
      ruleSetId: "ziwei-default",
      inputHash: "c".repeat(64),
      configHash: "d".repeat(64),
      rawSnapshotHash: "e".repeat(64),
      calculatedAt: new Date("2026-09-05T00:00:00+07:00"),
    });
    await database.insert(ziweiChartVersions).values({
      id: "chart-ver-1",
      chartId: "chart-1",
      calculationRunId: runId,
      normalizedOutput: {},
      privateRawSnapshot: { raw: true },
      warnings: [],
      provenance: { version: 1 },
    });

    await database.insert(commerceOrders).values({
      id: order1Id,
      invoiceNumber: "INV-001",
      chartId: "chart-1",
      chartVersionId: "chart-ver-1",
      ownerId: owner1Id,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entitlement1Id,
      orderId: order1Id,
      chartId: "chart-1",
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: owner1Id,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId: entitlement1Id,
      chartVersionId: "chart-ver-1",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: "knowledge.vi.v1",
      promptVersion: "prompt.v1",
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    await database.insert(evidenceSets).values({
      id: "ev-set-1",
      chartVersionId: "chart-ver-1",
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    await database.insert(evidenceItems).values({
      id: "ev-item-1",
      evidenceSetId: "ev-set-1",
      evidenceKey: "ziwei.identity.life-palace",
      payload: {
        id: "ziwei.identity.life-palace",
        factReferences: ["fact"],
        confidence: "high",
        interpretationBounds: ["Reflective bound"],
        interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Hours offset"],
        riskTags: ["identity"],
        allowedActionCategories: ["reflect"],
      },
    });

    const structuredContent = {
      version: 1,
      sku: "ZIWEI-IDENTITY-P0",
      capabilityId: "ziwei.identity.p0",
      locale: "vi",
      provenance: {
        chartVersionId: "chart-ver-1",
        ruleVersion: "ziwei.identity.v1",
        evidenceVersion: 1,
        knowledgeVersion: "knowledge.vi.v1",
        providerId: "open-router",
        modelId: "model-1",
        promptVersion: "prompt.v1",
        templateVersion: "template.v1",
      },
      sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
        id,
        title: "Mục " + (index + 1),
        narrative: "Narrative.",
        claims: id === "data_and_method" || id === "reflection_questions" || id === "action_summary" || id === "limitations_and_disclaimer"
          ? []
          : [{
              id: "claim-" + (index + 1),
              text: "Claim text",
              evidenceIds: ["ziwei.identity.life-palace"],
              interpretationBoundCode: "reflective_identity_only",
              confidence: "moderate",
              limitations: ["Limitations"],
              suggestedActions: [{ category: "reflect", text: "Reflect" }],
            }],
      })),
      reflectionQuestions: ["Q1", "Q2", "Q3"],
      summaryActions: ["A1"],
      professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    };

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId: entitlement1Id,
      chartVersionId: "chart-ver-1",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: "knowledge.vi.v1",
      promptVersion: "prompt.v1",
      reportConfigVersion: "config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "model-1",
      structuredContent,
      htmlContent: "<html><script>sentinel</script></html>",
      contentHash: "b".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
    });

    const repository = createDatabaseReportQueryRepository(database);
    const service = createReportQueryService({ repository });

    const ownerActor: CurrentActor = { kind: "account", userId: owner1Id, role: "authenticated", permissions: [] };
    const otherActor: CurrentActor = { kind: "account", userId: owner2Id, role: "authenticated", permissions: [] };

    const outboxBefore = await database.select().from(outbox);
    const reservationsBefore = await database.select().from(reportReservations);
    const versionsBefore = await database.select().from(reportVersions);

    const ownerResult = await service.getReport(ownerActor, reportId);
    expect(ownerResult.ok).toBe(true);
    if (!ownerResult.ok) return;
    expect(ownerResult.value.state).toBe("ready");

    const otherResult = await service.getReport(otherActor, reportId);
    expect(otherResult.ok).toBe(false);
    expect(otherResult.error?.code).toBe("REPORT_NOT_FOUND");

    const missingResult = await service.getReport(ownerActor, randomUUID());
    expect(missingResult.ok).toBe(false);
    expect(missingResult.error?.code).toBe("REPORT_NOT_FOUND");

    const outboxAfter = await database.select().from(outbox);
    const reservationsAfter = await database.select().from(reportReservations);
    const versionsAfter = await database.select().from(reportVersions);

    expect(outboxAfter).toEqual(outboxBefore);
    expect(reservationsAfter).toEqual(reservationsBefore);
    expect(versionsAfter).toEqual(versionsBefore);
  }, containerTimeoutMs);

  it("exposes immutable lineage pointing to superseded version while keeping old version byte-stable across reads", async () => {
    const ownerId = randomUUID();
    const otherOwnerId = randomUUID();
    const reportId = randomUUID();
    const oldReportVersionId = randomUUID();
    const currentReportVersionId = randomUUID();
    const entitlementId = randomUUID();
    const orderId = randomUUID();

    await database.insert(authUsers).values([
      { id: ownerId, name: "Lineage Owner", email: "lineage-owner@example.com", role: "user" },
      { id: otherOwnerId, name: "Other Owner", email: "other-lineage@example.com", role: "user" },
    ]);

    const profileId = randomUUID();
    await database.insert(birthProfiles).values({
      id: profileId,
      userId: ownerId,
    });

    const revisionId = randomUUID();
    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      consentVersion: "2026-09-01",
      originalInput: {},
      normalizedInput: { tzOffset: 420 },
      rawInput: {},
      normalizedOutput: {},
      privateRawSnapshot: { raw: true },
      warnings: [],
      provenance: { version: 1 },
    });
    await database.insert(ziweiCharts).values({
      id: "chart-lineage-1",
      profileId,
      profileRevisionId: revisionId,
    });

    const runId = randomUUID();
    await database.insert(calculationRuns).values({
      id: runId,
      profileId,
      idempotencyKey: "idem-lineage-" + runId,
      profileRevisionId: revisionId,
      engineId: "iztro",
      engineVersion: "1.0.0",
      adapterId: "iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart.v1",
      ruleSetId: "ziwei-default",
      inputHash: "c".repeat(64),
      configHash: "d".repeat(64),
      rawSnapshotHash: "e".repeat(64),
      calculatedAt: new Date("2026-09-05T00:00:00+07:00"),
    });
    await database.insert(ziweiChartVersions).values({
      id: "chart-ver-lineage-1",
      chartId: "chart-lineage-1",
      calculationRunId: runId,
      normalizedOutput: {},
      privateRawSnapshot: { raw: true },
      warnings: [],
      provenance: { version: 1 },
    });

    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: "INV-LINEAGE-001",
      chartId: "chart-lineage-1",
      chartVersionId: "chart-ver-lineage-1",
      ownerId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId: "chart-lineage-1",
      sku: "ZIWEI-IDENTITY-P0",
      ownerId,
    });

    await database.insert(evidenceSets).values({
      id: "ev-set-lineage-1",
      chartVersionId: "chart-ver-lineage-1",
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    await database.insert(evidenceItems).values({
      id: "ev-item-lineage-1",
      evidenceSetId: "ev-set-lineage-1",
      evidenceKey: "ziwei.identity.life-palace",
      payload: {
        id: "ziwei.identity.life-palace",
        factReferences: ["soulPalaceId"],
        confidence: "high",
        interpretationBounds: ["Reflective bound"],
        interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Hours offset"],
        riskTags: ["identity"],
        allowedActionCategories: ["reflect"],
      },
    });

    const createStructuredContent = (titlePrefix: string) => ({
      version: 1,
      sku: "ZIWEI-IDENTITY-P0" as const,
      capabilityId: "ziwei.identity.p0",
      locale: "vi" as const,
      provenance: {
        chartVersionId: "chart-ver-lineage-1",
        ruleVersion: "ziwei.identity.v1",
        evidenceVersion: 1,
        knowledgeVersion: "knowledge.vi.v1",
        providerId: "open-router",
        modelId: "model-1",
        promptVersion: "prompt.v1",
        templateVersion: "template.v1",
      },
      sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
        id,
        title: `${titlePrefix} Mục ${index + 1}`,
        narrative: "Narrative.",
        claims: id === "data_and_method" || id === "reflection_questions" || id === "action_summary" || id === "limitations_and_disclaimer"
          ? []
          : [{
              id: `claim-${index + 1}`,
              text: "Claim text",
              evidenceIds: ["ziwei.identity.life-palace"],
              interpretationBoundCode: "reflective_identity_only" as const,
              confidence: "moderate" as const,
              limitations: ["Limitations"],
              suggestedActions: [{ category: "reflect" as const, text: "Reflect" }],
            }],
      })),
      reflectionQuestions: ["Q1", "Q2", "Q3"],
      summaryActions: ["A1"],
      professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    });

    const oldStructuredContent = createStructuredContent("Bản cũ");
    const currentStructuredContent = createStructuredContent("Bản mới");

    const oldHtmlContent = "<html><body>Old version</body></html>";
    const oldContentHash = "a".repeat(64);

    // 1. Insert older version
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId,
      reportVersionId: oldReportVersionId,
      entitlementId,
      chartVersionId: "chart-ver-lineage-1",
      evidenceVersionId: "ev-set-lineage-1",
      knowledgeVersionId: "knowledge.vi.v1",
      promptVersion: "prompt.v1",
      reportConfigVersion: "config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "model-1",
      structuredContent: oldStructuredContent,
      htmlContent: oldHtmlContent,
      contentHash: oldContentHash,
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
    });

    // 2. Insert current version pointing to old version via supersedesReportVersionId
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId,
      reportVersionId: currentReportVersionId,
      entitlementId,
      chartVersionId: "chart-ver-lineage-1",
      evidenceVersionId: "ev-set-lineage-1",
      knowledgeVersionId: "knowledge.vi.v1",
      promptVersion: "prompt.v1",
      reportConfigVersion: "config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "model-1",
      structuredContent: currentStructuredContent,
      htmlContent: "<html><body>Current version</body></html>",
      contentHash: "b".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: oldReportVersionId,
    });

    // 3. Reservation points to current version
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId: currentReportVersionId,
      entitlementId,
      chartVersionId: "chart-ver-lineage-1",
      evidenceVersionId: "ev-set-lineage-1",
      knowledgeVersionId: "knowledge.vi.v1",
      promptVersion: "prompt.v1",
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    // Snapshot old version row before any reads
    const versionsBeforeRead = await database.select().from(reportVersions);
    const oldRowBefore = versionsBeforeRead.find(
      (r) => r.reportVersionId === oldReportVersionId,
    );

    expect(oldRowBefore).toBeDefined();

    const repository = createDatabaseReportQueryRepository(database);
    const service = createReportQueryService({ repository });

    const ownerActor: CurrentActor = { kind: "account", userId: ownerId, role: "authenticated", permissions: [] };
    const otherActor: CurrentActor = { kind: "account", userId: otherOwnerId, role: "authenticated", permissions: [] };

    // Read current report
    const ownerResult = await service.getReport(ownerActor, reportId);
    expect(ownerResult.ok).toBe(true);
    if (!ownerResult.ok) return;

    expect(ownerResult.value.state).toBe("ready");
    if (ownerResult.value.state === "ready") {
      expect(ownerResult.value.lineage.supersedesReportVersionId).toBe(oldReportVersionId);
    }

    // Cross-owner read
    const crossOwnerResult = await service.getReport(otherActor, reportId);
    expect(crossOwnerResult.ok).toBe(false);

    // Missing report read
    const missingResult = await service.getReport(ownerActor, randomUUID());
    expect(missingResult.ok).toBe(false);

    // Assert older version row remains byte/value identical
    const versionsAfterRead = await database.select().from(reportVersions);
    const oldRowAfter = versionsAfterRead.find(
      (r) => r.reportVersionId === oldReportVersionId,
    );

    expect(oldRowAfter).toEqual(oldRowBefore);
    expect(oldRowAfter?.structuredContent).toEqual(oldStructuredContent);
    expect(oldRowAfter?.htmlContent).toBe(oldHtmlContent);
    expect(oldRowAfter?.contentHash).toBe(oldContentHash);
  }, containerTimeoutMs);
});
