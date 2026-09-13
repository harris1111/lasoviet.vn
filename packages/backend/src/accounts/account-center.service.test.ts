import { createHash, randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  TIER_2_ENTITLEMENT_SCOPE,
} from "@lasoviet/contracts";

import {
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceOrders,
  consents,
  createDatabase,
  deletionRequests,
  reportReservations,
  reportVersions,
  runMigrations,
  ziweiChartVersions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";

import { createAccountCenterService } from "./account-center.service.js";

describe("account-center service with PostgreSQL Testcontainers", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  let database: Database;

  const owner1 = "user-owner-1";
  const owner2 = "user-owner-2";

  const orderOwner1Id = randomUUID();
  const orderOwner2Id = randomUUID();
  const entOwner1Id = randomUUID();
  const entOwner2Id = randomUUID();
  const repOwner1Id = randomUUID();
  const verOwner1Id = randomUUID();
  const assetOwner1Id = randomUUID();

  const validCalendar = { kind: "solar" as const, date: "1990-01-01" };
  const validTime = { precision: "exact_minute" as const, localTime: "09:30" };
  const validTimezone = { ianaZone: "Asia/Ho_Chi_Minh" };

  const validOriginalInput = {
    version: 1 as const,
    calendar: validCalendar,
    time: validTime,
    timezone: validTimezone,
    consentVersion: "2026-09-01",
    gender: "male",
  };

  // Exact persisted normalized shape as produced by serializedNormalized() in birth-profile.repository.ts
  const validPersistedNormalizedInput = {
    version: 1 as const,
    normalizedCalendar: validCalendar,
    normalizedTime: validTime,
    timezoneProvenance: { source: "iana" as const, ianaZone: "Asia/Ho_Chi_Minh", runtime: "Intl" as const },
    normalizationWarnings: [],
    limitations: [],
  };

  const sectionIds = [
    "personal_summary",
    "data_and_method",
    "primary_evidence",
    "strengths_and_resources",
    "tensions_and_blind_spots",
    "identity_analysis",
    "cycles_and_timing",
    "within_control",
    "reflection_questions",
    "action_summary",
    "limitations_and_disclaimer",
  ];

  const validStructuredReportContent = {
    version: 1 as const,
    sku: "ZIWEI-IDENTITY-P0" as const,
    capabilityId: "ziwei.identity.p0" as const,
    locale: "vi" as const,
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    sections: sectionIds.map((id, index) => ({
      id,
      title: `Mục ${index + 1}`,
      narrative: "Bạn cần quan sát và điều chỉnh theo cách phù hợp.",
      claims: id === "data_and_method" || id === "reflection_questions" || id === "action_summary" || id === "limitations_and_disclaimer"
        ? []
        : [{
          id: `claim-${index + 1}`,
          text: "Bạn có thể xem đây là một gợi ý để tự phản chiếu.",
          evidenceIds: ["ziwei.identity.life-palace"],
          interpretationBoundCode: "reflective_identity_only" as const,
          confidence: "moderate" as const,
          limitations: ["Phụ thuộc vào giờ sinh và phạm vi bằng chứng."],
          suggestedActions: [{
            category: "reflect" as const,
            text: "Ghi lại quan sát của bạn trong một vài tuần.",
          }],
        }],
    })),
    reflectionQuestions: [
      "Điều gì đang giúp bạn duy trì sự cân bằng?",
      "Môi trường nào giúp bạn phát huy thế mạnh?",
      "Bạn muốn điều chỉnh điều gì trong tháng tới?",
    ],
    summaryActions: ["Chọn một bước nhỏ và theo dõi kết quả."],
    provenance: {
      chartVersionId: "cv-owner-1",
      ruleVersion: "1.0",
      evidenceVersion: 1,
      knowledgeVersion: "kn-1",
      providerId: "test-ai",
      modelId: "test-model",
      promptVersion: "p-1",
      templateVersion: "t-1",
    },
  };

  const hash64 = "a".repeat(64);
  const palaceIds = [
    "ziwei.palace.life", "ziwei.palace.siblings", "ziwei.palace.spouse",
    "ziwei.palace.children", "ziwei.palace.wealth", "ziwei.palace.health",
    "ziwei.palace.travel", "ziwei.palace.friends", "ziwei.palace.career",
    "ziwei.palace.property", "ziwei.palace.fortune", "ziwei.palace.parents",
  ];
  const branches = [
    "ziwei.branch.rat", "ziwei.branch.ox", "ziwei.branch.tiger",
    "ziwei.branch.rabbit", "ziwei.branch.dragon", "ziwei.branch.snake",
    "ziwei.branch.horse", "ziwei.branch.goat", "ziwei.branch.monkey",
    "ziwei.branch.rooster", "ziwei.branch.dog", "ziwei.branch.pig",
  ];

  const validChartOutput = {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id, index) => ({
      id,
      earthlyBranchId: branches[index],
      stars: index === 0
        ? [{
            id: "ziwei.star.purple-emperor",
            brightness: "ziwei.brightness.exalted",
          }]
        : [],
    })),
    transformations: [
      {
        starId: "ziwei.star.purple-emperor",
        id: "ziwei.transformation.prosperity",
      },
    ],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [
      { id: "ziwei.horoscope.decadal", supported: true },
      { id: "ziwei.horoscope.annual", supported: true },
    ],
    warnings: [{ code: "ziwei.warning.time-range", severity: "limitation" }],
    provenance: {
      version: 1,
      engineId: "iztro",
      engineVersion: "1.0.0",
      adapterId: "default",
      adapterVersion: "1.0.0",
      schemaId: "s-1",
      ruleSetId: "ziwei.default",
      inputHash: hash64,
      configHash: hash64,
      rawSnapshotHash: hash64,
      calculatedAt: "2026-09-01T00:00:00+07:00",
      limitations: ["None"],
    },
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_account_center_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
    database = createDatabase(databaseUrl);

    // Seed Owner 1 and Owner 2
    await database.insert(authUsers).values([
      { id: owner1, name: "Owner One", email: "owner1@example.test", emailVerified: true },
      { id: owner2, name: "Owner Two", email: "owner2@example.test", emailVerified: true },
    ]);

    // Owner 1 profile & revisions (revision 1 and 2, proving export handles multiple revisions)
    await database.insert(birthProfiles).values({ id: "p-owner-1", userId: owner1 });
    await database.insert(birthProfileRevisions).values([
      {
        id: "rev-owner-1",
        profileId: "p-owner-1",
        revisionNumber: 1,
        originalInput: validOriginalInput,
        normalizedInput: validPersistedNormalizedInput,
        consentVersion: "2026-09-01",
      },
      {
        id: "rev-owner-1-b",
        profileId: "p-owner-1",
        revisionNumber: 2,
        originalInput: {
          ...validOriginalInput,
          gender: "female",
        },
        normalizedInput: validPersistedNormalizedInput,
        consentVersion: "2026-09-01",
      },
    ]);

    // Owner 1 calculation run & chart
    await database.insert(calculationRuns).values({
      id: "calc-1",
      profileId: "p-owner-1",
      profileRevisionId: "rev-owner-1",
      idempotencyKey: "calc-key-1",
      engineId: "iztro",
      engineVersion: "1.0",
      adapterId: "default",
      adapterVersion: "1.0",
      schemaId: "s-1",
      ruleSetId: "r-1",
      inputHash: createHash("sha256").update("in").digest("hex"),
      configHash: createHash("sha256").update("cfg").digest("hex"),
      rawSnapshotHash: createHash("sha256").update("raw").digest("hex"),
    });

    await database.insert(ziweiCharts).values({
      id: "chart-owner-1",
      profileId: "p-owner-1",
      profileRevisionId: "rev-owner-1",
    });

    await database.insert(ziweiChartVersions).values({
      id: "cv-owner-1",
      chartId: "chart-owner-1",
      calculationRunId: "calc-1",
      normalizedOutput: validChartOutput,
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });

    // Owner 1 orders & entitlements
    await database.insert(commerceOrders).values({
      id: orderOwner1Id,
      ownerId: owner1,
      invoiceNumber: "INV-101",
      chartId: "chart-owner-1",
      chartVersionId: "cv-owner-1",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: new Date(),
    });

    await database.insert(commerceEntitlements).values({
      id: entOwner1Id,
      orderId: orderOwner1Id,
      chartId: "chart-owner-1",
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: owner1,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    // Owner 1 report reservation & CONGRUENT report version
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: repOwner1Id,
      reportVersionId: verOwner1Id,
      entitlementId: entOwner1Id,
      chartVersionId: "cv-owner-1",
      evidenceVersionId: "ev-1",
      knowledgeVersionId: "kn-1",
      promptVersion: "p-1",
      reportConfigVersion: "c-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: repOwner1Id,
      reportVersionId: verOwner1Id,
      entitlementId: entOwner1Id, // CONGRUENT with reservation entitlementId!
      chartVersionId: "cv-owner-1",
      evidenceVersionId: "ev-1",
      knowledgeVersionId: "kn-1",
      promptVersion: "p-1",
      reportConfigVersion: "c-1",
      templateVersion: "t-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "test-ai",
      modelId: "test-model",
      structuredContent: validStructuredReportContent,
      htmlContent: "<p>Report</p>",
      contentHash: createHash("sha256").update("content").digest("hex"),
      pdfAssetId: assetOwner1Id,
      renderVersion: "identity-report-pdf.v1",
    });

    // Owner 1 consents: 1 active, 1 revoked
    await database.insert(consents).values([
      {
        id: "c-active",
        userId: owner1,
        documentKey: "privacy",
        documentVersion: "2026-09-01",
        purpose: "birth_profile",
        grantedAt: new Date(),
        revokedAt: null,
      },
      {
        id: "c-revoked",
        userId: owner1,
        documentKey: "terms",
        documentVersion: "2026-09-01",
        purpose: "marketing",
        grantedAt: new Date(Date.now() - 86400000),
        revokedAt: new Date(),
      },
    ]);

    // Owner 2 records (to prove owner isolation)
    await database.insert(birthProfiles).values({ id: "p-owner-2", userId: owner2 });
    await database.insert(birthProfileRevisions).values({
      id: "rev-owner-2",
      profileId: "p-owner-2",
      revisionNumber: 1,
      originalInput: validOriginalInput,
      normalizedInput: validPersistedNormalizedInput,
      consentVersion: "2026-09-01",
    });

    await database.insert(commerceOrders).values({
      id: orderOwner2Id,
      ownerId: owner2,
      invoiceNumber: "INV-202",
      chartId: "chart-owner-2",
      chartVersionId: "cv-owner-2",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "en",
      status: "paid",
    });

    await database.insert(commerceEntitlements).values({
      id: entOwner2Id,
      orderId: orderOwner2Id,
      chartId: "chart-owner-2",
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: owner2,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });
  }, 120_000);

  afterAll(async () => {
    if (database) {
      await database.$client.end();
    }
    if (container) {
      await container.stop();
    }
  }, 30_000);

  it("getOverview proves owner filtering, real consent counts, and no cross-owner leak", async () => {
    const service = createAccountCenterService(database);
    const result = await service.getOverview(owner1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.account.email).toBe("owner1@example.test");
      expect(result.value.counts.profileCount).toBe(1);
      expect(result.value.counts.reportCount).toBe(1);
      expect(result.value.counts.orderCount).toBe(1);
      // Real consent count: 1 active, 2 total!
      expect(result.value.counts.consentActiveCount).toBe(1);
      expect(result.value.counts.consentTotalCount).toBe(2);
      // Recent activities use neutral identifiers
      for (const act of result.value.recentActivity) {
        expect(["profile_created", "report_purchased", "order_created"]).toContain(act.type);
        expect(act.targetId).toBeDefined();
      }
    }
  });

  it("getProfiles parses structured birth data without name and filters by owner", async () => {
    const service = createAccountCenterService(database);
    const result = await service.getProfiles(owner1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.profiles).toHaveLength(1);
      const prof = result.value.profiles[0]!;
      expect(prof.id).toBe("p-owner-1");
      expect(prof.calendar).toEqual(validCalendar);
      expect(prof.time).toEqual(validTime);
      expect(prof.timezone).toEqual(validTimezone);
      expect(prof.gender).toBe("female");
      expect(prof.chartId).toBe("chart-owner-1");
      expect(prof.hasPurchasedReport).toBe(true);
    }
  });

  it("fails closed with ACCOUNT_RESOURCE_NOT_FOUND if persisted birth input is invalid", async () => {
    const corruptUser = "user-corrupt";
    await database.insert(authUsers).values({
      id: corruptUser,
      name: "Corrupt",
      email: "corrupt@example.test",
      emailVerified: true,
    });
    await database.insert(birthProfiles).values({ id: "p-corrupt", userId: corruptUser });
    await database.insert(birthProfileRevisions).values({
      id: "rev-corrupt",
      profileId: "p-corrupt",
      revisionNumber: 1,
      originalInput: { not: "a valid BirthProfileV1" },
      consentVersion: "2026-09-01",
    });

    const service = createAccountCenterService(database);
    const result = await service.getProfiles(corruptUser);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ACCOUNT_RESOURCE_NOT_FOUND");
    }
  });

  it("fails export closed when a report reservation references an incongruent or missing version", async () => {
    const userIncongruent = "user-incongruent";
    const orderId = randomUUID();
    const entId = randomUUID();
    const repId = randomUUID();
    const verMissingId = randomUUID();

    await database.insert(authUsers).values({
      id: userIncongruent,
      name: "Incongruent User",
      email: "incongruent@example.test",
      emailVerified: true,
    });

    const profIncId = randomUUID();
    const revIncId = randomUUID();
    const chartIncId = randomUUID();
    const cvIncId = randomUUID();
    const calcIncId = randomUUID();

    await database.insert(birthProfiles).values({ id: profIncId, userId: userIncongruent });
    await database.insert(birthProfileRevisions).values({
      id: revIncId,
      profileId: profIncId,
      revisionNumber: 1,
      originalInput: validOriginalInput,
      normalizedInput: validPersistedNormalizedInput,
      consentVersion: "2026-09-01",
    });

    await database.insert(calculationRuns).values({
      id: calcIncId,
      profileId: profIncId,
      profileRevisionId: revIncId,
      idempotencyKey: randomUUID(),
      engineId: "iztro",
      engineVersion: "1.0",
      adapterId: "default",
      adapterVersion: "1.0",
      schemaId: "s-1",
      ruleSetId: "r-1",
      inputHash: hash64,
      configHash: hash64,
      rawSnapshotHash: hash64,
    });

    await database.insert(ziweiCharts).values({
      id: chartIncId,
      profileId: profIncId,
      profileRevisionId: revIncId,
    });

    await database.insert(ziweiChartVersions).values({
      id: cvIncId,
      chartId: chartIncId,
      calculationRunId: calcIncId,
      normalizedOutput: validChartOutput,
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
      evidenceSet: {},
      chartVersion: "1.0",
      ruleVersion: "1.0",
      capabilityVersion: "1.0",
    });

    await database.insert(commerceOrders).values({
      id: orderId,
      ownerId: userIncongruent,
      invoiceNumber: "INV-INC-1",
      chartId: chartIncId,
      chartVersionId: cvIncId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: new Date(),
    });

    await database.insert(commerceEntitlements).values({
      id: entId,
      orderId,
      chartId: chartIncId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userIncongruent,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    // 1. Missing version: reservation points to non-existent version row
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: repId,
      reportVersionId: verMissingId,
      entitlementId: entId,
      chartVersionId: "cv-owner-1",
      evidenceVersionId: "ev-1",
      knowledgeVersionId: "kn-1",
      promptVersion: "p-1",
      reportConfigVersion: "c-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    const service = createAccountCenterService(database);
    const missingExportResult = await service.getExport(userIncongruent);
    expect(missingExportResult.ok).toBe(false);
    if (!missingExportResult.ok) {
      expect(missingExportResult.error.code).toBe("ACCOUNT_RESOURCE_NOT_FOUND");
    }

    // 2. Incongruent version: version row exists but entitlementId belongs to another owner!
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: repId,
      reportVersionId: verMissingId,
      entitlementId: entOwner2Id, // MISMATCHED ENTITLEMENT
      chartVersionId: "cv-owner-1",
      evidenceVersionId: "ev-1",
      knowledgeVersionId: "kn-1",
      promptVersion: "p-1",
      reportConfigVersion: "c-1",
      templateVersion: "t-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "test",
      modelId: "test",
      structuredContent: validStructuredReportContent,
      htmlContent: "<p>Leak</p>",
      contentHash: createHash("sha256").update("leak").digest("hex"),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
    });

    const incongruentExportResult = await service.getExport(userIncongruent);
    expect(incongruentExportResult.ok).toBe(false);
    if (!incongruentExportResult.ok) {
      expect(incongruentExportResult.error.code).toBe("ACCOUNT_RESOURCE_NOT_FOUND");
    }
  });

  it("fails export closed when reportId mismatches between reservation and version", async () => {
    const userMismatch = "user-rep-id-mismatch";
    const orderId = randomUUID();
    const entId = randomUUID();
    const repResId = randomUUID();
    const repVerId = randomUUID();
    const versionId = randomUUID();

    await database.insert(authUsers).values({
      id: userMismatch,
      name: "ReportId Mismatch User",
      email: "rep-mismatch@example.test",
      emailVerified: true,
    });

    const profId = randomUUID();
    const revId = randomUUID();
    const chartId = randomUUID();
    const cvId = randomUUID();
    const calcId = randomUUID();

    await database.insert(birthProfiles).values({ id: profId, userId: userMismatch });
    await database.insert(birthProfileRevisions).values({
      id: revId,
      profileId: profId,
      revisionNumber: 1,
      originalInput: validOriginalInput,
      normalizedInput: validPersistedNormalizedInput,
      consentVersion: "2026-09-01",
    });

    await database.insert(calculationRuns).values({
      id: calcId,
      profileId: profId,
      profileRevisionId: revId,
      idempotencyKey: randomUUID(),
      engineId: "iztro",
      engineVersion: "1.0",
      adapterId: "default",
      adapterVersion: "1.0",
      schemaId: "s-1",
      ruleSetId: "r-1",
      inputHash: hash64,
      configHash: hash64,
      rawSnapshotHash: hash64,
    });

    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId: profId,
      profileRevisionId: revId,
    });

    await database.insert(ziweiChartVersions).values({
      id: cvId,
      chartId,
      calculationRunId: calcId,
      normalizedOutput: validChartOutput,
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
      evidenceSet: {},
      chartVersion: "1.0",
      ruleVersion: "1.0",
      capabilityVersion: "1.0",
    });

    await database.insert(commerceOrders).values({
      id: orderId,
      ownerId: userMismatch,
      invoiceNumber: "INV-MIS-1",
      chartId,
      chartVersionId: cvId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: new Date(),
    });

    await database.insert(commerceEntitlements).values({
      id: entId,
      orderId,
      chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userMismatch,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    // Reservation has repResId
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId: repResId,
      reportVersionId: versionId,
      entitlementId: entId,
      chartVersionId: cvId,
      evidenceVersionId: "ev-1",
      knowledgeVersionId: "kn-1",
      promptVersion: "p-1",
      reportConfigVersion: "c-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    // Version has repVerId (MISMATCHED from repResId!)
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId: repVerId, // MISMATCHED REPORT ID
      reportVersionId: versionId,
      entitlementId: entId,
      chartVersionId: cvId,
      evidenceVersionId: "ev-1",
      knowledgeVersionId: "kn-1",
      promptVersion: "p-1",
      reportConfigVersion: "c-1",
      templateVersion: "t-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "test",
      modelId: "test",
      structuredContent: validStructuredReportContent,
      htmlContent: "<p>Leak</p>",
      contentHash: createHash("sha256").update("leak").digest("hex"),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
    });

    const service = createAccountCenterService(database);
    const expResult = await service.getExport(userMismatch);
    expect(expResult.ok).toBe(false);
    if (!expResult.ok) {
      expect(expResult.error.code).toBe("ACCOUNT_RESOURCE_NOT_FOUND");
    }
  });

  it("fails export closed when source/version fields mismatch between reservation and version", async () => {
    const userSrcMismatch = "user-src-ver-mismatch";
    const orderId = randomUUID();
    const entId = randomUUID();
    const reportId = randomUUID();
    const versionId = randomUUID();

    await database.insert(authUsers).values({
      id: userSrcMismatch,
      name: "Source Mismatch User",
      email: "src-mismatch@example.test",
      emailVerified: true,
    });

    const profId = randomUUID();
    const revId = randomUUID();
    const chartId = randomUUID();
    const cvId = randomUUID();
    const calcId = randomUUID();

    await database.insert(birthProfiles).values({ id: profId, userId: userSrcMismatch });
    await database.insert(birthProfileRevisions).values({
      id: revId,
      profileId: profId,
      revisionNumber: 1,
      originalInput: validOriginalInput,
      normalizedInput: validPersistedNormalizedInput,
      consentVersion: "2026-09-01",
    });

    await database.insert(calculationRuns).values({
      id: calcId,
      profileId: profId,
      profileRevisionId: revId,
      idempotencyKey: randomUUID(),
      engineId: "iztro",
      engineVersion: "1.0",
      adapterId: "default",
      adapterVersion: "1.0",
      schemaId: "s-1",
      ruleSetId: "r-1",
      inputHash: hash64,
      configHash: hash64,
      rawSnapshotHash: hash64,
    });

    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId: profId,
      profileRevisionId: revId,
    });

    await database.insert(ziweiChartVersions).values({
      id: cvId,
      chartId,
      calculationRunId: calcId,
      normalizedOutput: validChartOutput,
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
      evidenceSet: {},
      chartVersion: "1.0",
      ruleVersion: "1.0",
      capabilityVersion: "1.0",
    });

    await database.insert(commerceOrders).values({
      id: orderId,
      ownerId: userSrcMismatch,
      invoiceNumber: "INV-SRC-1",
      chartId,
      chartVersionId: cvId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: new Date(),
    });

    await database.insert(commerceEntitlements).values({
      id: entId,
      orderId,
      chartId,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userSrcMismatch,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });

    // Reservation has evidenceVersionId: "ev-1"
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId: versionId,
      entitlementId: entId,
      chartVersionId: cvId,
      evidenceVersionId: "ev-1",
      knowledgeVersionId: "kn-1",
      promptVersion: "p-1",
      reportConfigVersion: "c-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
    });

    // Version has evidenceVersionId: "ev-mismatched-999" (MISMATCHED!)
    await database.insert(reportVersions).values({
      id: randomUUID(),
      reportId,
      reportVersionId: versionId,
      entitlementId: entId,
      chartVersionId: cvId,
      evidenceVersionId: "ev-mismatched-999", // MISMATCHED EVIDENCE VERSION
      knowledgeVersionId: "kn-1",
      promptVersion: "p-1",
      reportConfigVersion: "c-1",
      templateVersion: "t-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "test",
      modelId: "test",
      structuredContent: validStructuredReportContent,
      htmlContent: "<p>Leak</p>",
      contentHash: createHash("sha256").update("leak").digest("hex"),
      pdfAssetId: randomUUID(),
      renderVersion: "identity-report-pdf.v1",
    });

    const service = createAccountCenterService(database);
    const expResult = await service.getExport(userSrcMismatch);
    expect(expResult.ok).toBe(false);
    if (!expResult.ok) {
      expect(expResult.error.code).toBe("ACCOUNT_RESOURCE_NOT_FOUND");
    }
  });

  it("getExport accepts a nonnegative 0 VND upgrade-credit order", async () => {
    const zeroOrderUser = "user-zero-order";
    await database.insert(authUsers).values({
      id: zeroOrderUser,
      name: "Zero Order User",
      email: "zero@example.test",
      emailVerified: true,
    });

    const paidZeroOrderId = randomUUID();
    await database.insert(commerceOrders).values({
      id: paidZeroOrderId,
      ownerId: zeroOrderUser,
      invoiceNumber: "INV-ZERO-001",
      chartId: "chart-zero",
      chartVersionId: "cv-zero",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 0,
      currency: "VND",
      locale: "vi",
      status: "paid",
      paidAt: new Date(),
    });

    const service = createAccountCenterService(database);
    const result = await service.getExport(zeroOrderUser);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.orders).toHaveLength(1);
      expect(result.value.orders[0]).toMatchObject({
        id: paidZeroOrderId,
        amount: 0,
        status: "paid",
      });
    }
  });

  it("getPrivacy returns consents and deletion request", async () => {
    const service = createAccountCenterService(database);
    const result = await service.getPrivacy(owner1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.consents).toHaveLength(2);
      expect(result.value.consents.some((c) => c.active === true)).toBe(true);
      expect(result.value.consents.some((c) => c.active === false)).toBe(true);
      expect(result.value.deletionRequest).toBeNull();
    }
  });

  it("getExport proves bounded strict export without secrets, tokens, or cross-owner data", async () => {
    const service = createAccountCenterService(database);
    const result = await service.getExport(owner1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const exp = result.value;
      const str = JSON.stringify(exp);

      expect(exp.account.email).toBe("owner1@example.test");
      expect(exp.profiles).toHaveLength(1);
      expect(exp.profiles[0]!.revisions).toHaveLength(2);
      expect(exp.profiles[0]!.revisions[0]!.revisionNumber).toBe(1);
      expect(exp.profiles[0]!.revisions[0]!.originalInput.gender).toBe("male");
      expect(exp.profiles[0]!.revisions[0]!.normalizedInput?.normalizedCalendar.kind).toBe("solar");
      expect(exp.profiles[0]!.revisions[1]!.revisionNumber).toBe(2);
      expect(exp.profiles[0]!.revisions[1]!.originalInput.gender).toBe("female");
      expect(exp.charts).toHaveLength(1);
      expect(exp.orders.length).toBeGreaterThanOrEqual(1);
      expect(exp.reports).toHaveLength(1);
      expect(exp.reports[0]!.reportId).toBe(repOwner1Id);
      expect(exp.reports[0]!.sku).toBe("ZIWEI-IDENTITY-P0");
      expect(exp.reports[0]!.content.sections).toHaveLength(11);
      expect(exp.reports[0]!.content.reflectionQuestions).toHaveLength(3);
      expect(exp.reports[0]!.content.summaryActions).toHaveLength(1);
      expect((exp.reports[0] as any).provenance).toBeUndefined();
      expect((exp.reports[0] as any).providerId).toBeUndefined();
      expect(exp.consents).toHaveLength(2);

      // Sensitive prohibited tokens/secrets must never appear
      expect(str).not.toContain("password");
      expect(str).not.toContain("secret");
      expect(str).not.toContain("token");
      expect(str).not.toContain("sessionId");
      expect(str).not.toContain("owner2");
      expect(str).not.toContain("INV-202");
    }
  });

  it("getExport detects over-limit collection and returns ACCOUNT_EXPORT_LIMIT_EXCEEDED without truncation", async () => {
    const limitUser = "user-limit-exceeded";
    await database.insert(authUsers).values({
      id: limitUser,
      name: "Limit User",
      email: "limit@example.test",
      emailVerified: true,
    });

    const profileRows = Array.from({ length: 51 }, (_, i) => ({
      id: `p-limit-${i}`,
      userId: limitUser,
    }));
    await database.insert(birthProfiles).values(profileRows);

    const service = createAccountCenterService(database);
    const result = await service.getExport(limitUser);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ACCOUNT_EXPORT_LIMIT_EXCEEDED");
    }
  });
});
