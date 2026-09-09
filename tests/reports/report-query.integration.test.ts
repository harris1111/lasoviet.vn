import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "../../packages/backend/node_modules/drizzle-orm/index.js";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  IDENTITY_REPORT_SECTION_IDS,
  TIER_1_ENTITLEMENT_SCOPE,
  TIER_2_ENTITLEMENT_SCOPE,
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
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_PROMPT_VERSION_V1,
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
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId: entitlement1Id,
      chartVersionId: "chart-ver-1",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
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
        knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V1,
        providerId: "open-router",
        modelId: "model-1",
        promptVersion: REPORT_PROMPT_VERSION_V1,
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
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
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
      scope: TIER_2_ENTITLEMENT_SCOPE,
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
        knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V1,
        providerId: "open-router",
        modelId: "model-1",
        promptVersion: REPORT_PROMPT_VERSION_V1,
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
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
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
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
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
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
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

  it("calls the actual report service read path 20 times for the same purchased report and proves every read succeeds with zero commerce/report/outbox mutations", async () => {
    const ownerId = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    const entitlementId = randomUUID();
    const orderId = randomUUID();
    const profileId = randomUUID();
    const revisionId = randomUUID();
    const runId = randomUUID();
    const chartId = "chart-20reads-" + randomUUID();
    const chartVersionId = "chart-ver-20reads-" + randomUUID();
    const evidenceSetId = "ev-set-20reads-" + randomUUID();

    await database.insert(authUsers).values({
      id: ownerId,
      name: "Owner 20 Reads",
      email: `owner-20reads-${ownerId}@example.com`,
      role: "user",
    });

    await database.insert(birthProfiles).values({
      id: profileId,
      userId: ownerId,
    });

    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      consentVersion: "2026-09-01",
      originalInput: { displayName: "Owner 20 Reads" },
      normalizedInput: { tzOffset: 420 },
      rawInput: {},
      normalizedOutput: {},
      privateRawSnapshot: { raw: true },
      warnings: [],
      provenance: { version: 1 },
    });

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
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: new Date("2026-09-05T00:00:00+07:00"),
    });

    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId,
      profileRevisionId: revisionId,
    });

    await database.insert(ziweiChartVersions).values({
      id: chartVersionId,
      chartId,
      calculationRunId: runId,
      normalizedOutput: {},
      privateRawSnapshot: { raw: true },
      warnings: [],
      provenance: { version: 1 },
    });

    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: "INV-20READS-" + randomUUID().slice(0, 8),
      chartId,
      chartVersionId,
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
      chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId,
      evidenceVersionId: evidenceSetId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    await database.insert(evidenceSets).values({
      id: evidenceSetId,
      chartVersionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    await database.insert(evidenceItems).values({
      id: "ev-item-20reads-" + randomUUID(),
      evidenceSetId,
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

    const structuredContent = {
      version: 1,
      sku: "ZIWEI-IDENTITY-P0" as const,
      capabilityId: "ziwei.identity.p0",
      locale: "vi" as const,
      provenance: {
        chartVersionId,
        ruleVersion: "ziwei.identity.v1",
        evidenceVersion: 1,
        knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V1,
        providerId: "open-router",
        modelId: "model-1",
        promptVersion: REPORT_PROMPT_VERSION_V1,
        templateVersion: "template.v1",
      },
      sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
        id,
        title: `Mục ${index + 1}`,
        narrative: "Narrative text for 20 reads.",
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
    };

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId,
      evidenceVersionId: evidenceSetId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "model-1",
      structuredContent,
      htmlContent: "<html><body>Content for 20 reads</body></html>",
      contentHash: "1".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
    });

    const repository = createDatabaseReportQueryRepository(database);
    const service = createReportQueryService({ repository });
    const ownerActor: CurrentActor = {
      kind: "account",
      userId: ownerId,
      role: "authenticated",
      permissions: [],
    };

    // Capture state snapshots of commerce, report, and outbox tables before reads
    const ordersBefore = await database.select().from(commerceOrders);
    const entitlementsBefore = await database.select().from(commerceEntitlements);
    const reservationsBefore = await database.select().from(reportReservations);
    const versionsBefore = await database.select().from(reportVersions);
    const outboxBefore = await database.select().from(outbox);

    let firstReadValue: unknown = null;

    // Call actual report service/read path 20 times for the same purchased report
    for (let i = 0; i < 20; i++) {
      const result = await service.getReport(ownerActor, reportId);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(`Read iteration ${i} failed unexpectedly`);

      expect(result.value.state).toBe("ready");
      expect(result.value.reportId).toBe(reportId);
      expect(result.value.reportVersionId).toBe(reportVersionId);

      if (i === 0) {
        firstReadValue = result.value;
      } else {
        expect(result.value).toEqual(firstReadValue);
      }
    }

    // Capture state snapshots after all 20 reads and verify ZERO mutations
    const ordersAfter = await database.select().from(commerceOrders);
    const entitlementsAfter = await database.select().from(commerceEntitlements);
    const reservationsAfter = await database.select().from(reportReservations);
    const versionsAfter = await database.select().from(reportVersions);
    const outboxAfter = await database.select().from(outbox);

    expect(ordersAfter).toEqual(ordersBefore);
    expect(entitlementsAfter).toEqual(entitlementsBefore);
    expect(reservationsAfter).toEqual(reservationsBefore);
    expect(versionsAfter).toEqual(versionsBefore);
    expect(outboxAfter).toEqual(outboxBefore);
  }, containerTimeoutMs);

  it("denies report read and returns null when lineage is corrupted or cross-owner tampered", async () => {
    const ownerAId = randomUUID();
    const ownerBId = randomUUID();
    const reportBId = randomUUID();
    const reportVersionBId = randomUUID();
    const entitlementBId = randomUUID();
    const orderBId = randomUUID();
    const profileBId = randomUUID();
    const revisionBId = randomUUID();
    const runBId = randomUUID();
    const chartBId = "chart-b-" + randomUUID();
    const chartVersionBId = "chart-ver-b-" + randomUUID();
    const evidenceSetBId = "ev-set-b-" + randomUUID();

    await database.insert(authUsers).values([
      { id: ownerAId, name: "Attacker A", email: `attacker-a-${ownerAId}@example.com`, role: "user" },
      { id: ownerBId, name: "Victim B", email: `victim-b-${ownerBId}@example.com`, role: "user" },
    ]);

    await database.insert(birthProfiles).values({
      id: profileBId,
      userId: ownerBId,
    });

    await database.insert(birthProfileRevisions).values({
      id: revisionBId,
      profileId: profileBId,
      revisionNumber: 1,
      consentVersion: "2026-09-01",
      originalInput: { displayName: "Victim B" },
      normalizedInput: { tzOffset: 420 },
      rawInput: {},
      normalizedOutput: {},
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });

    await database.insert(calculationRuns).values({
      id: runBId,
      profileId: profileBId,
      idempotencyKey: "idem-b-" + runBId,
      profileRevisionId: revisionBId,
      engineId: "iztro",
      engineVersion: "1.0.0",
      adapterId: "iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart.v1",
      ruleSetId: "ziwei-default",
      inputHash: "b".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "b".repeat(64),
    });

    await database.insert(ziweiCharts).values({
      id: chartBId,
      profileId: profileBId,
      profileRevisionId: revisionBId,
    });

    await database.insert(ziweiChartVersions).values({
      id: chartVersionBId,
      chartId: chartBId,
      calculationRunId: runBId,
      normalizedOutput: {},
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });

    await database.insert(commerceOrders).values({
      id: orderBId,
      invoiceNumber: "INV-B-" + randomUUID().slice(0, 8),
      chartId: chartBId,
      chartVersionId: chartVersionBId,
      ownerId: ownerBId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entitlementBId,
      orderId: orderBId,
      chartId: chartBId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: ownerBId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: reportBId,
      reportVersionId: reportVersionBId,
      entitlementId: entitlementBId,
      chartVersionId: chartVersionBId,
      evidenceVersionId: evidenceSetBId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    await database.insert(evidenceSets).values({
      id: evidenceSetBId,
      chartVersionId: chartVersionBId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    await database.insert(evidenceItems).values({
      id: "ev-item-b-" + randomUUID(),
      evidenceSetId: evidenceSetBId,
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
      sku: "ZIWEI-IDENTITY-P0" as const,
      capabilityId: "ziwei.identity.p0",
      locale: "vi" as const,
      provenance: {
        chartVersionId: chartVersionBId,
        ruleVersion: "ziwei.identity.v1",
        evidenceVersion: 1,
        knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V1,
        providerId: "open-router",
        modelId: "model-1",
        promptVersion: REPORT_PROMPT_VERSION_V1,
        templateVersion: "template.v1",
      },
      sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
        id,
        title: `Mục ${index + 1}`,
        narrative: "Narrative text.",
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
    };

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reportBId,
      reportVersionId: reportVersionBId,
      entitlementId: entitlementBId,
      chartVersionId: chartVersionBId,
      evidenceVersionId: evidenceSetBId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "model-1",
      structuredContent,
      htmlContent: "<html><body>Bao cao bi mat cua B</body></html>",
      contentHash: "2".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
    });

    const repository = createDatabaseReportQueryRepository(database);
    const service = createReportQueryService({ repository });
    const actorA: CurrentActor = { kind: "account", userId: ownerAId, role: "authenticated", permissions: [] };
    const actorB: CurrentActor = { kind: "account", userId: ownerBId, role: "authenticated", permissions: [] };

    // Baseline: Owner B can read their report
    const validBResult = await service.getReport(actorB, reportBId);
    expect(validBResult.ok).toBe(true);

    // Baseline: Owner A cannot read Owner B report
    const attack1Result = await service.getReport(actorA, reportBId);
    expect(attack1Result.ok).toBe(false);
    expect(attack1Result.error?.code).toBe("REPORT_NOT_FOUND");

    // Case 2: Entitlement for Owner A with chartId pointing to another owner (Victim B2) chart
    const ownerB2Id = randomUUID();
    const profileB2Id = randomUUID();
    const revisionB2Id = randomUUID();
    const chartB2Id = "chart-b2-" + randomUUID();
    const chartVersionB2Id = "chart-ver-b2-" + randomUUID();
    const runB2Id = randomUUID();
    const orderA2Id = randomUUID();
    const entitlementA2Id = randomUUID();
    const reportA2Id = randomUUID();

    await database.insert(authUsers).values({ id: ownerB2Id, name: "Victim B2", email: `victim-b2-${ownerB2Id}@example.com`, role: "user" });
    await database.insert(birthProfiles).values({ id: profileB2Id, userId: ownerB2Id });
    await database.insert(birthProfileRevisions).values({
      id: revisionB2Id, profileId: profileB2Id, revisionNumber: 1, consentVersion: "2026-09-01",
      originalInput: { displayName: "Victim B2" }, normalizedInput: {}, rawInput: {}, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(calculationRuns).values({
      id: runB2Id, profileId: profileB2Id, profileRevisionId: revisionB2Id, idempotencyKey: "run-b2-" + runB2Id,
      engineId: "iztro", engineVersion: "1.0", adapterId: "iztro", adapterVersion: "1.0",
      schemaId: "normalized-ziwei-chart.v1", ruleSetId: "ziwei-default", inputHash: "5".repeat(64), configHash: "5".repeat(64), rawSnapshotHash: "5".repeat(64),
    });
    await database.insert(ziweiCharts).values({ id: chartB2Id, profileId: profileB2Id, profileRevisionId: revisionB2Id });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionB2Id, chartId: chartB2Id, calculationRunId: runB2Id, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });

    // Attacker A creates order pointing to Victim B2 chart
    await database.insert(commerceOrders).values({
      id: orderA2Id, invoiceNumber: "INV-A2-" + randomUUID().slice(0, 8), chartId: chartB2Id, chartVersionId: chartVersionB2Id, ownerId: ownerAId,
      sku: "ZIWEI-IDENTITY-P0", amount: 100000, currency: "VND", locale: "vi", status: "paid",
    });
    // Entitlement also has chartId: chartB2Id (no prior entitlement existed for chartB2Id)
    await database.insert(commerceEntitlements).values({
      id: entitlementA2Id, orderId: orderA2Id, chartId: chartB2Id, sku: "ZIWEI-IDENTITY-P0", ownerId: ownerAId, scope: TIER_2_ENTITLEMENT_SCOPE,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(), reportId: reportA2Id, reportVersionId: randomUUID(), entitlementId: entitlementA2Id,
      chartVersionId: chartVersionB2Id, evidenceVersionId: evidenceSetBId, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1, reportConfigVersion: "config.v1", locale: "vi", sku: "ZIWEI-IDENTITY-P0", status: "complete",
    });

    const attack2Repo = await repository.readAuthorizedReport(ownerAId, reportA2Id);
    expect(attack2Repo).toBeNull();
    const attack2Result = await service.getReport(actorA, reportA2Id);
    expect(attack2Result.ok).toBe(false);
    expect(attack2Result.error?.code).toBe("REPORT_NOT_FOUND");

    // Case 3: Owner A has valid chart, but reservation has tampered chartVersionId pointing to Owner B chartVersion
    const profileA3Id = randomUUID();
    const revisionA3Id = randomUUID();
    const chartA3Id = "chart-a3-" + randomUUID();
    const chartVersionA3Id = "chart-ver-a3-" + randomUUID();
    const orderA3Id = randomUUID();
    const entitlementA3Id = randomUUID();
    const reportA3Id = randomUUID();
    const runA3Id = randomUUID();

    await database.insert(birthProfiles).values({ id: profileA3Id, userId: ownerAId });
    await database.insert(birthProfileRevisions).values({
      id: revisionA3Id, profileId: profileA3Id, revisionNumber: 1, consentVersion: "2026-09-01",
      originalInput: { displayName: "Attacker A3" }, normalizedInput: {}, rawInput: {}, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(calculationRuns).values({
      id: runA3Id, profileId: profileA3Id, profileRevisionId: revisionA3Id, idempotencyKey: "run-a3-" + runA3Id,
      engineId: "iztro", engineVersion: "1.0", adapterId: "iztro", adapterVersion: "1.0",
      schemaId: "normalized-ziwei-chart.v1", ruleSetId: "ziwei-default", inputHash: "6".repeat(64), configHash: "6".repeat(64), rawSnapshotHash: "6".repeat(64),
    });
    await database.insert(ziweiCharts).values({ id: chartA3Id, profileId: profileA3Id, profileRevisionId: revisionA3Id });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionA3Id, chartId: chartA3Id, calculationRunId: runA3Id, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(commerceOrders).values({
      id: orderA3Id, invoiceNumber: "INV-A3-" + randomUUID().slice(0, 8), chartId: chartA3Id, chartVersionId: chartVersionA3Id, ownerId: ownerAId,
      sku: "ZIWEI-IDENTITY-P0", amount: 100000, currency: "VND", locale: "vi", status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementA3Id, orderId: orderA3Id, chartId: chartA3Id, sku: "ZIWEI-IDENTITY-P0", ownerId: ownerAId, scope: TIER_2_ENTITLEMENT_SCOPE,
    });
    // Reservation with tampered chartVersionId pointing to Owner B chartVersion
    await database.insert(reportReservations).values({
      id: randomUUID(), reportId: reportA3Id, reportVersionId: randomUUID(), entitlementId: entitlementA3Id,
      chartVersionId: chartVersionBId, // tampered!
      evidenceVersionId: evidenceSetBId, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1, promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1", locale: "vi", sku: "ZIWEI-IDENTITY-P0", status: "complete",
    });

    const attack3Repo = await repository.readAuthorizedReport(ownerAId, reportA3Id);
    expect(attack3Repo).toBeNull();
    const attack3Result = await service.getReport(actorA, reportA3Id);
    expect(attack3Result.ok).toBe(false);
    expect(attack3Result.error?.code).toBe("REPORT_NOT_FOUND");

    // Case 4: Owner A has valid reservation, but report_versions row has tampered chartVersionId
    const profileA4Id = randomUUID();
    const revisionA4Id = randomUUID();
    const chartA4Id = "chart-a4-" + randomUUID();
    const chartVersionA4Id = "chart-ver-a4-" + randomUUID();
    const runA4Id = randomUUID();
    const orderA4Id = randomUUID();
    const entitlementA4Id = randomUUID();
    const reportA4Id = randomUUID();
    const reportVersionA4Id = randomUUID();
    const evidenceSetA4Id = "ev-set-a4-" + randomUUID();

    await database.insert(birthProfiles).values({ id: profileA4Id, userId: ownerAId });
    await database.insert(birthProfileRevisions).values({
      id: revisionA4Id, profileId: profileA4Id, revisionNumber: 1, consentVersion: "2026-09-01",
      originalInput: { displayName: "Attacker A4" }, normalizedInput: {}, rawInput: {}, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(calculationRuns).values({
      id: runA4Id, profileId: profileA4Id, profileRevisionId: revisionA4Id, idempotencyKey: "run-a4-" + runA4Id,
      engineId: "iztro", engineVersion: "1.0", adapterId: "iztro", adapterVersion: "1.0",
      schemaId: "normalized-ziwei-chart.v1", ruleSetId: "ziwei-default", inputHash: "7".repeat(64), configHash: "7".repeat(64), rawSnapshotHash: "7".repeat(64),
    });
    await database.insert(ziweiCharts).values({ id: chartA4Id, profileId: profileA4Id, profileRevisionId: revisionA4Id });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionA4Id, chartId: chartA4Id, calculationRunId: runA4Id, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(evidenceSets).values({
      id: evidenceSetA4Id, chartVersionId: chartVersionA4Id, capabilityId: "ziwei.identity.p0", ruleVersion: "ziwei.identity.v1",
    });
    await database.insert(commerceOrders).values({
      id: orderA4Id, invoiceNumber: "INV-A4-" + randomUUID().slice(0, 8), chartId: chartA4Id, chartVersionId: chartVersionA4Id, ownerId: ownerAId,
      sku: "ZIWEI-IDENTITY-P0", amount: 100000, currency: "VND", locale: "vi", status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementA4Id, orderId: orderA4Id, chartId: chartA4Id, sku: "ZIWEI-IDENTITY-P0", ownerId: ownerAId, scope: TIER_2_ENTITLEMENT_SCOPE,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(), reportId: reportA4Id, reportVersionId: reportVersionA4Id, entitlementId: entitlementA4Id,
      chartVersionId: chartVersionA4Id, evidenceVersionId: evidenceSetA4Id, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1, reportConfigVersion: "config.v1", locale: "vi", sku: "ZIWEI-IDENTITY-P0", status: "complete",
    });
    // Report version inserted with tampered chartVersionId pointing to Owner B chartVersion
    await database.insert(reportVersions).values({
      id: randomUUID(), reportId: reportA4Id, reportVersionId: reportVersionA4Id, entitlementId: entitlementA4Id,
      chartVersionId: chartVersionBId, // tampered!
      evidenceVersionId: evidenceSetA4Id, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1, promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1", templateVersion: "template.v1", locale: "vi", sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router", modelId: "model-1", structuredContent, htmlContent: "<html>test</html>", contentHash: "7".repeat(64),
      pdfAssetId: randomUUID(), renderVersion: "identity-report-pdf.v1", supersedesReportVersionId: null,
    });

    const attack4Repo = await repository.readAuthorizedReport(ownerAId, reportA4Id);
    expect(attack4Repo).toBeNull();
    const attack4Result = await service.getReport(actorA, reportA4Id);
    expect(attack4Result.ok).toBe(false);
    expect(attack4Result.error?.code).toBe("REPORT_NOT_FOUND");

    // Case 5: Soft-deleted birth profile
    const ownerDId = randomUUID();
    const profileDId = randomUUID();
    const revisionDId = randomUUID();
    const chartDId = "chart-d-" + randomUUID();
    const chartVersionDId = "chart-ver-d-" + randomUUID();
    const orderDId = randomUUID();
    const entitlementDId = randomUUID();
    const reportDId = randomUUID();
    const reportVersionDId = randomUUID();
    const evidenceSetDId = "ev-set-d-" + randomUUID();
    const runDId = randomUUID();

    await database.insert(authUsers).values({ id: ownerDId, name: "Deleted Owner", email: `deleted-${ownerDId}@example.com`, role: "user" });
    // Birth profile with deletedAt set!
    await database.insert(birthProfiles).values({ id: profileDId, userId: ownerDId, deletedAt: new Date("2026-09-08T10:00:00.000Z") });
    await database.insert(birthProfileRevisions).values({
      id: revisionDId, profileId: profileDId, revisionNumber: 1, consentVersion: "2026-09-01",
      originalInput: { displayName: "Deleted Profile" }, normalizedInput: {}, rawInput: {}, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(calculationRuns).values({
      id: runDId, profileId: profileDId, profileRevisionId: revisionDId, idempotencyKey: "run-d-" + runDId,
      engineId: "iztro", engineVersion: "1.0", adapterId: "iztro", adapterVersion: "1.0",
      schemaId: "normalized-ziwei-chart.v1", ruleSetId: "ziwei-default", inputHash: "8".repeat(64), configHash: "8".repeat(64), rawSnapshotHash: "8".repeat(64),
    });
    await database.insert(ziweiCharts).values({ id: chartDId, profileId: profileDId, profileRevisionId: revisionDId });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionDId, chartId: chartDId, calculationRunId: runDId, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(commerceOrders).values({
      id: orderDId, invoiceNumber: "INV-D-" + randomUUID().slice(0, 8), chartId: chartDId, chartVersionId: chartVersionDId, ownerId: ownerDId,
      sku: "ZIWEI-IDENTITY-P0", amount: 100000, currency: "VND", locale: "vi", status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementDId, orderId: orderDId, chartId: chartDId, sku: "ZIWEI-IDENTITY-P0", ownerId: ownerDId, scope: TIER_2_ENTITLEMENT_SCOPE,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(), reportId: reportDId, reportVersionId: reportVersionDId, entitlementId: entitlementDId,
      chartVersionId: chartVersionDId, evidenceVersionId: evidenceSetDId, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1, reportConfigVersion: "config.v1", locale: "vi", sku: "ZIWEI-IDENTITY-P0", status: "complete",
    });
    await database.insert(evidenceSets).values({
      id: evidenceSetDId, chartVersionId: chartVersionDId, capabilityId: "ziwei.identity.p0", ruleVersion: "ziwei.identity.v1",
    });
    await database.insert(evidenceItems).values({
      id: "ev-item-d-" + randomUUID(), evidenceSetId: evidenceSetDId, evidenceKey: "ziwei.identity.life-palace",
      payload: {
        id: "ziwei.identity.life-palace", factReferences: ["fact"], confidence: "high",
        interpretationBounds: ["Reflective bound"], interpretationBoundCodes: ["reflective_identity_only"], limitations: ["Hours offset"], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      },
    });
    await database.insert(reportVersions).values({
      id: randomUUID(), reportId: reportDId, reportVersionId: reportVersionDId, entitlementId: entitlementDId,
      chartVersionId: chartVersionDId, evidenceVersionId: evidenceSetDId, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1, reportConfigVersion: "config.v1", templateVersion: "template.v1",
      locale: "vi", sku: "ZIWEI-IDENTITY-P0", providerId: "open-router", modelId: "model-1",
      structuredContent, htmlContent: "<html>deleted</html>", contentHash: "8".repeat(64),
      pdfAssetId: randomUUID(), renderVersion: "identity-report-pdf.v1", supersedesReportVersionId: null,
    });

    const actorD: CurrentActor = { kind: "account", userId: ownerDId, role: "authenticated", permissions: [] };
    const deletedRepo = await repository.readAuthorizedReport(ownerDId, reportDId);
    expect(deletedRepo).toBeNull();
    const deletedResult = await service.getReport(actorD, reportDId);
    expect(deletedResult.ok).toBe(false);
    expect(deletedResult.error?.code).toBe("REPORT_NOT_FOUND");

    // Case 6: Valid pending report (no report_versions row yet) preserves pending state for legitimate owner
    const ownerCId = randomUUID();
    const profileCId = randomUUID();
    const revisionCId = randomUUID();
    const chartCId = "chart-c-" + randomUUID();
    const chartVersionCId = "chart-ver-c-" + randomUUID();
    const orderCId = randomUUID();
    const entitlementCId = randomUUID();
    const reportCId = randomUUID();
    const reportVersionCId = randomUUID();
    const runCId = randomUUID();

    await database.insert(authUsers).values({ id: ownerCId, name: "Owner C", email: `c-${ownerCId}@example.com`, role: "user" });
    await database.insert(birthProfiles).values({ id: profileCId, userId: ownerCId });
    await database.insert(birthProfileRevisions).values({
      id: revisionCId, profileId: profileCId, revisionNumber: 1, consentVersion: "2026-09-01",
      originalInput: { displayName: "Owner C" }, normalizedInput: {}, rawInput: {}, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(calculationRuns).values({
      id: runCId, profileId: profileCId, profileRevisionId: revisionCId, idempotencyKey: "run-c-" + runCId,
      engineId: "iztro", engineVersion: "1.0", adapterId: "iztro", adapterVersion: "1.0",
      schemaId: "normalized-ziwei-chart.v1", ruleSetId: "ziwei-default", inputHash: "4".repeat(64), configHash: "4".repeat(64), rawSnapshotHash: "4".repeat(64),
    });
    await database.insert(ziweiCharts).values({ id: chartCId, profileId: profileCId, profileRevisionId: revisionCId });
    await database.insert(ziweiChartVersions).values({
      id: chartVersionCId, chartId: chartCId, calculationRunId: runCId, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {},
    });
    await database.insert(commerceOrders).values({
      id: orderCId, invoiceNumber: "INV-C-" + randomUUID().slice(0, 8), chartId: chartCId, chartVersionId: chartVersionCId, ownerId: ownerCId,
      sku: "ZIWEI-IDENTITY-P0", amount: 100000, currency: "VND", locale: "vi", status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementCId, orderId: orderCId, chartId: chartCId, sku: "ZIWEI-IDENTITY-P0", ownerId: ownerCId, scope: TIER_2_ENTITLEMENT_SCOPE,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(), reportId: reportCId, reportVersionId: reportVersionCId, entitlementId: entitlementCId,
      chartVersionId: chartVersionCId, evidenceVersionId: "ev-placeholder", knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1, reportConfigVersion: "config.v1", locale: "vi", sku: "ZIWEI-IDENTITY-P0", status: "generating",
    });

    const actorC: CurrentActor = { kind: "account", userId: ownerCId, role: "authenticated", permissions: [] };
    const pendingResult = await service.getReport(actorC, reportCId);
    expect(pendingResult.ok).toBe(true);
    if (pendingResult.ok) {
      expect(pendingResult.value.state).toBe("pending");
    }
  }, containerTimeoutMs);

  function buildStructuredContent(chartVersionId: string) {
    return {
      version: 1,
      sku: "ZIWEI-IDENTITY-P0" as const,
      capabilityId: "ziwei.identity.p0",
      locale: "vi" as const,
      provenance: {
        chartVersionId,
        ruleVersion: "ziwei.identity.v1",
        evidenceVersion: 1,
        knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V1,
        providerId: "open-router",
        modelId: "model-1",
        promptVersion: REPORT_PROMPT_VERSION_V1,
        templateVersion: "template.v1",
      },
      sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
        id,
        title: "Mục " + (index + 1),
        narrative: "Narrative text.",
        claims:
          id === "data_and_method" ||
          id === "reflection_questions" ||
          id === "action_summary" ||
          id === "limitations_and_disclaimer"
            ? []
            : [
                {
                  id: "claim-" + (index + 1),
                  text: "Claim text",
                  evidenceIds: ["ziwei.identity.life-palace"],
                  interpretationBoundCode: "reflective_identity_only" as const,
                  confidence: "moderate" as const,
                  limitations: ["Limitations"],
                  suggestedActions: [{ category: "reflect" as const, text: "Reflect" }],
                },
              ],
      })),
      reflectionQuestions: ["Q1", "Q2", "Q3"],
      summaryActions: ["A1"],
      professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    };
  }

  async function createReportOwnerFixture(options: { name?: string; secretEvidence?: string } = {}) {
    const ownerId = randomUUID();
    const profileId = randomUUID();
    const revisionId = randomUUID();
    const runId = randomUUID();
    const chartId = "chart-" + randomUUID();
    const chartVersionId = "chart-ver-" + randomUUID();
    const evidenceSetId = "ev-set-" + randomUUID();
    const evidenceItemId = "ev-item-" + randomUUID();

    await database.insert(authUsers).values({
      id: ownerId,
      name: options.name ?? "Owner " + ownerId.slice(0, 6),
      email: ownerId + "@example.com",
      role: "user",
    });

    await database.insert(birthProfiles).values({
      id: profileId,
      userId: ownerId,
    });

    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      consentVersion: "2026-09-01",
      originalInput: { displayName: options.name ?? "Owner " + ownerId.slice(0, 6) },
      normalizedInput: { tzOffset: 420 },
      rawInput: {},
      normalizedOutput: {},
      privateRawSnapshot: { raw: true },
      warnings: [],
      provenance: { version: 1 },
    });

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
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: new Date("2026-09-05T00:00:00+07:00"),
    });

    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId,
      profileRevisionId: revisionId,
    });

    await database.insert(ziweiChartVersions).values({
      id: chartVersionId,
      chartId,
      calculationRunId: runId,
      normalizedOutput: {},
      privateRawSnapshot: { raw: true },
      warnings: [],
      provenance: { version: 1 },
    });

    await database.insert(evidenceSets).values({
      id: evidenceSetId,
      chartVersionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    await database.insert(evidenceItems).values({
      id: evidenceItemId,
      evidenceSetId,
      evidenceKey: "ziwei.identity.life-palace",
      payload: {
        id: "ziwei.identity.life-palace",
        factReferences: ["soulPalaceId"],
        confidence: "high",
        interpretationBounds: [options.secretEvidence ?? "Reflective bound"],
        interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Hours offset"],
        riskTags: ["identity"],
        allowedActionCategories: ["reflect"],
      },
    });

    const actor: CurrentActor = {
      kind: "account",
      userId: ownerId,
      role: "authenticated",
      permissions: [],
    };

    return {
      ownerId,
      actor,
      profileId,
      chartId,
      chartVersionId,
      evidenceSetId,
      evidenceItemId,
    };
  }

  it("proves report query rejects foreign or missing evidence set lineage without exposing foreign evidence, and preserves pending/terminal-failure pre-version states (Finding 1)", async () => {
    const victimB = await createReportOwnerFixture({ name: "Victim B", secretEvidence: "CONFIDENTIAL_VICTIM_B_EVIDENCE_9999" });
    const attackerA1 = await createReportOwnerFixture({ name: "Attacker A1" });

    const repository = createDatabaseReportQueryRepository(database);
    const service = createReportQueryService({ repository });

    // 1. Adversarial chain: Attacker A1 report chain points to Victim B evidence set
    const reportA1Id = randomUUID();
    const reportVersionA1Id = randomUUID();
    const orderA1Id = randomUUID();
    const entitlementA1Id = randomUUID();

    await database.insert(commerceOrders).values({
      id: orderA1Id,
      invoiceNumber: "INV-ATK-1-" + randomUUID().slice(0, 8),
      chartId: attackerA1.chartId,
      chartVersionId: attackerA1.chartVersionId,
      ownerId: attackerA1.ownerId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entitlementA1Id,
      orderId: orderA1Id,
      chartId: attackerA1.chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: attackerA1.ownerId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: reportA1Id,
      reportVersionId: reportVersionA1Id,
      entitlementId: entitlementA1Id,
      chartVersionId: attackerA1.chartVersionId,
      evidenceVersionId: victimB.evidenceSetId, // points to Victim B evidence set!
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reportA1Id,
      reportVersionId: reportVersionA1Id,
      entitlementId: entitlementA1Id,
      chartVersionId: attackerA1.chartVersionId,
      evidenceVersionId: victimB.evidenceSetId, // points to Victim B evidence set!
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "model-1",
      structuredContent: buildStructuredContent(attackerA1.chartVersionId),
      htmlContent: "<html><body>Attacker report with foreign evidence</body></html>",
      contentHash: "1".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
    });

    // Repository returns null
    const repoResult1 = await repository.readAuthorizedReport(attackerA1.ownerId, reportA1Id);
    expect(repoResult1).toBeNull();

    // Service returns REPORT_NOT_FOUND without exposing Victim B evidence
    const serviceResult1 = await service.getReport(attackerA1.actor, reportA1Id);
    expect(serviceResult1.ok).toBe(false);
    expect(serviceResult1.error?.code).toBe("REPORT_NOT_FOUND");
    expect(JSON.stringify(serviceResult1)).not.toContain("CONFIDENTIAL_VICTIM_B_EVIDENCE_9999");

    // 2. Missing evidence set: evidenceVersionId does not exist in evidence_sets
    const attackerA2 = await createReportOwnerFixture({ name: "Attacker A2" });
    const reportA2Id = randomUUID();
    const reportVersionA2Id = randomUUID();
    const orderA2Id = randomUUID();
    const entitlementA2Id = randomUUID();
    const nonExistentEvId = "missing-ev-" + randomUUID();

    await database.insert(commerceOrders).values({
      id: orderA2Id,
      invoiceNumber: "INV-ATK-2-" + randomUUID().slice(0, 8),
      chartId: attackerA2.chartId,
      chartVersionId: attackerA2.chartVersionId,
      ownerId: attackerA2.ownerId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entitlementA2Id,
      orderId: orderA2Id,
      chartId: attackerA2.chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: attackerA2.ownerId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: reportA2Id,
      reportVersionId: reportVersionA2Id,
      entitlementId: entitlementA2Id,
      chartVersionId: attackerA2.chartVersionId,
      evidenceVersionId: nonExistentEvId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: reportA2Id,
      reportVersionId: reportVersionA2Id,
      entitlementId: entitlementA2Id,
      chartVersionId: attackerA2.chartVersionId,
      evidenceVersionId: nonExistentEvId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "model-1",
      structuredContent: buildStructuredContent(attackerA2.chartVersionId),
      htmlContent: "<html><body>Missing evidence report</body></html>",
      contentHash: "2".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
    });

    const repoResult2 = await repository.readAuthorizedReport(attackerA2.ownerId, reportA2Id);
    expect(repoResult2).toBeNull();

    const serviceResult2 = await service.getReport(attackerA2.actor, reportA2Id);
    expect(serviceResult2.ok).toBe(false);
    expect(serviceResult2.error?.code).toBe("REPORT_NOT_FOUND");

    // 3. Preserve valid pre-version pending state: NO report_versions row, status generating
    const ownerC = await createReportOwnerFixture({ name: "Owner C" });
    const reportCId = randomUUID();
    const reportVersionCId = randomUUID();
    const orderCId = randomUUID();
    const entitlementCId = randomUUID();

    await database.insert(commerceOrders).values({
      id: orderCId,
      invoiceNumber: "INV-C-PENDING-" + randomUUID().slice(0, 8),
      chartId: ownerC.chartId,
      chartVersionId: ownerC.chartVersionId,
      ownerId: ownerC.ownerId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entitlementCId,
      orderId: orderCId,
      chartId: ownerC.chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: ownerC.ownerId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: reportCId,
      reportVersionId: reportVersionCId,
      entitlementId: entitlementCId,
      chartVersionId: ownerC.chartVersionId,
      evidenceVersionId: "ev-placeholder-pending",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "generating",
    });

    const repoResult3 = await repository.readAuthorizedReport(ownerC.ownerId, reportCId);
    expect(repoResult3).not.toBeNull();
    expect(repoResult3?.version).toBeNull();
    expect(repoResult3?.evidenceItems).toEqual([]);

    const serviceResult3 = await service.getReport(ownerC.actor, reportCId);
    expect(serviceResult3.ok).toBe(true);
    if (serviceResult3.ok) {
      expect(serviceResult3.value.state).toBe("pending");
      expect(serviceResult3.value.reportId).toBe(reportCId);
    }

    // 4. Preserve valid pre-version terminal_failure state: NO report_versions row, status terminal_failure
    const ownerD = await createReportOwnerFixture({ name: "Owner D" });
    const reportDId = randomUUID();
    const reportVersionDId = randomUUID();
    const orderDId = randomUUID();
    const entitlementDId = randomUUID();
    const invoiceNumberD = "INV-D-FAILED-" + randomUUID().slice(0, 8);
    const paidAtD = new Date("2026-09-08T12:00:00.000Z");
    const reportUpdatedAtD = new Date("2026-09-08T12:05:00.000Z");

    await database.insert(commerceOrders).values({
      id: orderDId,
      invoiceNumber: invoiceNumberD,
      chartId: ownerD.chartId,
      chartVersionId: ownerD.chartVersionId,
      ownerId: ownerD.ownerId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: paidAtD,
    });

    await database.insert(commerceEntitlements).values({
      id: entitlementDId,
      orderId: orderDId,
      chartId: ownerD.chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: ownerD.ownerId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: reportDId,
      reportVersionId: reportVersionDId,
      entitlementId: entitlementDId,
      chartVersionId: ownerD.chartVersionId,
      evidenceVersionId: "ev-placeholder-failed",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "terminal_failure",
      updatedAt: reportUpdatedAtD,
    });

    const repoResult4 = await repository.readAuthorizedReport(ownerD.ownerId, reportDId);
    expect(repoResult4).not.toBeNull();
    expect(repoResult4?.version).toBeNull();
    expect(repoResult4?.evidenceItems).toEqual([]);

    const serviceResult4 = await service.getReport(ownerD.actor, reportDId);
    expect(serviceResult4.ok).toBe(true);
    if (serviceResult4.ok) {
      expect(serviceResult4.value.state).toBe("failed");
      expect(serviceResult4.value.reportId).toBe(reportDId);
      expect((serviceResult4.value as any).invoiceNumber).toBe(invoiceNumberD);
      expect((serviceResult4.value as any).supportEmail).toBe("support@lasoviet.vn");
      expect((serviceResult4.value as any).supportSubject).toBe(`[Lá Số Việt] Hỗ trợ báo cáo đơn hàng ${invoiceNumberD}`);
      expect((serviceResult4.value as any).supportReference).toBe(invoiceNumberD);
      expect((serviceResult4.value as any).paymentReceivedAt).toBe(paidAtD.toISOString());
      expect((serviceResult4.value as any).reportStatusUpdatedAt).toBe(reportUpdatedAtD.toISOString());
      expect((serviceResult4.value as any).lastErrorCode).toBeUndefined();
      expect((serviceResult4.value as any).paidAt).toBeUndefined();
      expect((serviceResult4.value as any).statusUpdatedAt).toBeUndefined();
    }

    await database
      .update(commerceOrders)
      .set({ paidAt: null })
      .where(eq(commerceOrders.id, orderDId));
    await expect(service.getReport(ownerD.actor, reportDId)).rejects.toThrow(
      "REPORT_QUERY_DATA_INVALID",
    );
  }, containerTimeoutMs);

  it("proves report query rejects order/entitlement and reservation/version SKU mismatches while preserving valid flows (Finding 2)", async () => {
    const repository = createDatabaseReportQueryRepository(database);
    const service = createReportQueryService({ repository });

    // 1. Order / Entitlement SKU mismatch: order has ZIWEI-IDENTITY-P0, entitlement has ZIWEI-CAREER-P0
    const owner1 = await createReportOwnerFixture({ name: "Owner SKU 1" });
    const report1Id = randomUUID();
    const reportVersion1Id = randomUUID();
    const order1Id = randomUUID();
    const entitlement1Id = randomUUID();

    await database.insert(commerceOrders).values({
      id: order1Id,
      invoiceNumber: "INV-SKU-1-" + randomUUID().slice(0, 8),
      chartId: owner1.chartId,
      chartVersionId: owner1.chartVersionId,
      ownerId: owner1.ownerId,
      sku: "ZIWEI-IDENTITY-P0", // order SKU
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entitlement1Id,
      orderId: order1Id,
      chartId: owner1.chartId,
      sku: "ZIWEI-CAREER-P0", // mismatched entitlement SKU!
      ownerId: owner1.ownerId,
      scope: TIER_1_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: report1Id,
      reportVersionId: reportVersion1Id,
      entitlementId: entitlement1Id,
      chartVersionId: owner1.chartVersionId,
      evidenceVersionId: owner1.evidenceSetId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: report1Id,
      reportVersionId: reportVersion1Id,
      entitlementId: entitlement1Id,
      chartVersionId: owner1.chartVersionId,
      evidenceVersionId: owner1.evidenceSetId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "model-1",
      structuredContent: buildStructuredContent(owner1.chartVersionId),
      htmlContent: "<html><body>Order/entitlement SKU mismatch</body></html>",
      contentHash: "3".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
    });

    const repo1 = await repository.readAuthorizedReport(owner1.ownerId, report1Id);
    expect(repo1).toBeNull();

    const result1 = await service.getReport(owner1.actor, report1Id);
    expect(result1.ok).toBe(false);
    expect(result1.error?.code).toBe("REPORT_NOT_FOUND");

    // 2. Reservation / Version SKU mismatch: reservation has ZIWEI-IDENTITY-P0, version has ZIWEI-CAREER-P0
    const owner2 = await createReportOwnerFixture({ name: "Owner SKU 2" });
    const report2Id = randomUUID();
    const reportVersion2Id = randomUUID();
    const order2Id = randomUUID();
    const entitlement2Id = randomUUID();

    await database.insert(commerceOrders).values({
      id: order2Id,
      invoiceNumber: "INV-SKU-2-" + randomUUID().slice(0, 8),
      chartId: owner2.chartId,
      chartVersionId: owner2.chartVersionId,
      ownerId: owner2.ownerId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entitlement2Id,
      orderId: order2Id,
      chartId: owner2.chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: owner2.ownerId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: report2Id,
      reportVersionId: reportVersion2Id,
      entitlementId: entitlement2Id,
      chartVersionId: owner2.chartVersionId,
      evidenceVersionId: owner2.evidenceSetId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0", // reservation SKU
      status: "complete",
    });

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: report2Id,
      reportVersionId: reportVersion2Id,
      entitlementId: entitlement2Id,
      chartVersionId: owner2.chartVersionId,
      evidenceVersionId: owner2.evidenceSetId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-CAREER-P0", // mismatched version SKU!
      providerId: "open-router",
      modelId: "model-1",
      structuredContent: buildStructuredContent(owner2.chartVersionId),
      htmlContent: "<html><body>Version SKU mismatch</body></html>",
      contentHash: "4".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
    });

    const repo2 = await repository.readAuthorizedReport(owner2.ownerId, report2Id);
    expect(repo2).toBeNull();

    const result2 = await service.getReport(owner2.actor, report2Id);
    expect(result2.ok).toBe(false);
    expect(result2.error?.code).toBe("REPORT_NOT_FOUND");

    // 3. Entitlement / Reservation SKU mismatch: entitlement has ZIWEI-IDENTITY-P0, reservation has ZIWEI-CAREER-P0
    const owner3 = await createReportOwnerFixture({ name: "Owner SKU 3" });
    const report3Id = randomUUID();
    const reportVersion3Id = randomUUID();
    const order3Id = randomUUID();
    const entitlement3Id = randomUUID();

    await database.insert(commerceOrders).values({
      id: order3Id,
      invoiceNumber: "INV-SKU-3-" + randomUUID().slice(0, 8),
      chartId: owner3.chartId,
      chartVersionId: owner3.chartVersionId,
      ownerId: owner3.ownerId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entitlement3Id,
      orderId: order3Id,
      chartId: owner3.chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: owner3.ownerId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: report3Id,
      reportVersionId: reportVersion3Id,
      entitlementId: entitlement3Id,
      chartVersionId: owner3.chartVersionId,
      evidenceVersionId: owner3.evidenceSetId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-CAREER-P0", // mismatched reservation SKU!
      status: "complete",
    });

    const repo3 = await repository.readAuthorizedReport(owner3.ownerId, report3Id);
    expect(repo3).toBeNull();

    const result3 = await service.getReport(owner3.actor, report3Id);
    expect(result3.ok).toBe(false);
    expect(result3.error?.code).toBe("REPORT_NOT_FOUND");

    // 4. Valid flow: entire SKU chain matches and evidence lineage is anchored to owner chartVersionId
    const owner4 = await createReportOwnerFixture({ name: "Owner SKU 4" });
    const report4Id = randomUUID();
    const reportVersion4Id = randomUUID();
    const order4Id = randomUUID();
    const entitlement4Id = randomUUID();

    await database.insert(commerceOrders).values({
      id: order4Id,
      invoiceNumber: "INV-SKU-4-" + randomUUID().slice(0, 8),
      chartId: owner4.chartId,
      chartVersionId: owner4.chartVersionId,
      ownerId: owner4.ownerId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 100000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entitlement4Id,
      orderId: order4Id,
      chartId: owner4.chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: owner4.ownerId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: report4Id,
      reportVersionId: reportVersion4Id,
      entitlementId: entitlement4Id,
      chartVersionId: owner4.chartVersionId,
      evidenceVersionId: owner4.evidenceSetId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: report4Id,
      reportVersionId: reportVersion4Id,
      entitlementId: entitlement4Id,
      chartVersionId: owner4.chartVersionId,
      evidenceVersionId: owner4.evidenceSetId,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "config.v1",
      templateVersion: "template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "model-1",
      structuredContent: buildStructuredContent(owner4.chartVersionId),
      htmlContent: "<html><body>Matching SKU valid report</body></html>",
      contentHash: "5".repeat(64),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
    });

    const repo4 = await repository.readAuthorizedReport(owner4.ownerId, report4Id);
    expect(repo4).not.toBeNull();
    expect(repo4?.reservation.reportId).toBe(report4Id);
    expect(repo4?.version?.reportId).toBe(report4Id);
    expect(repo4?.evidenceItems.length).toBeGreaterThan(0);

    const result4 = await service.getReport(owner4.actor, report4Id);
    expect(result4.ok).toBe(true);
    if (result4.ok) {
      expect(result4.value.state).toBe("ready");
      expect(result4.value.reportId).toBe(report4Id);
    }
  }, containerTimeoutMs);

});
