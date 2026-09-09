import { createHmac } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  TIER_2_ENTITLEMENT_SCOPE,
} from "../packages/contracts/dist/index.js";
import {
  authSessions,
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  calculationRuns,
  commerceEntitlements,
  commerceOrders,
  createDatabase,
  evidenceItems,
  evidenceSets,
  reportReservations,
  reportVersions,
  runMigrations,
  ziweiChartVersions,
  ziweiCharts,
} from "../packages/database/dist/index.js";

function validateEnvironment() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new Error("DATABASE_URL is required");
  }

  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
  if (!betterAuthSecret || betterAuthSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }

  const isLoopback =
    parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost";
  const isWp13Port = parsedUrl.port === "55435";
  const isWp13Db = parsedUrl.pathname === "/lasoviet_wp13";

  if (!isLoopback || !isWp13Port || !isWp13Db) {
    throw new Error(
      `Refusing non-loopback/non-WP-13 database URL: ${parsedUrl.hostname}:${parsedUrl.port}${parsedUrl.pathname}`,
    );
  }

  return { databaseUrl, betterAuthSecret };
}

function signSessionToken(token, secret) {
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  return `${token}.${signature}`;
}

export async function seedAuthenticatedFixture() {
  const { databaseUrl, betterAuthSecret } = validateEnvironment();

  const origLog = console.log;
  console.log = () => {};
  try {
    await runMigrations(databaseUrl);
  } finally {
    console.log = origLog;
  }
  const database = createDatabase(databaseUrl);
  try {

  const USER_ID = "10000000-0000-4000-8000-000000000001";
  const USER_EMAIL = "nguyenvanan@example.test";
  const USER_NAME = "Nguyễn Văn An";

  const SESSION_ID = "20000000-0000-4000-8000-000000000001";
  const SESSION_TOKEN = "wp13-session-token-live-seed-001";
  const SESSION_EXPIRES_AT = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const signedCookieValue = signSessionToken(SESSION_TOKEN, betterAuthSecret);

  // Profile 1: Self profile (Nguyễn Văn An)
  const PROFILE_1_ID = "30000000-0000-4000-8000-000000000001";
  // Revisions and Charts for Profile 1:
  const REVISION_1_ID = "31000000-0000-4000-8000-000000000001";
  const RUN_1_ID = "32000000-0000-4000-8000-000000000001";
  const CHART_1_ID = "chart-30000000-0000-4000-8000-000000000001";
  const CHART_VERSION_1_ID = "cver-30000000-0000-4000-8000-000000000001";
  const EVIDENCE_SET_1_ID = "evset-30000000-0000-4000-8000-000000000001";

  const REVISION_8_ID = "31000000-0000-4000-8000-000000000008";
  const RUN_8_ID = "32000000-0000-4000-8000-000000000008";
  const CHART_8_ID = "chart-30000000-0000-4000-8000-000000000008";
  const CHART_VERSION_8_ID = "cver-30000000-0000-4000-8000-000000000008";
  const EVIDENCE_SET_8_ID = "evset-30000000-0000-4000-8000-000000000008";

  const REVISION_9_ID = "31000000-0000-4000-8000-000000000009";
  const RUN_9_ID = "32000000-0000-4000-8000-000000000009";
  const CHART_9_ID = "chart-30000000-0000-4000-8000-000000000009";
  const CHART_VERSION_9_ID = "cver-30000000-0000-4000-8000-000000000009";
  const EVIDENCE_SET_9_ID = "evset-30000000-0000-4000-8000-000000000009";

  // Profile 2: Family profile (Nguyễn Minh Châu) for report library grouping
  const PROFILE_2_ID = "30000000-0000-4000-8000-000000000002";
  const REVISION_2_ID = "31000000-0000-4000-8000-000000000002";
  const RUN_2_ID = "32000000-0000-4000-8000-000000000002";
  const CHART_2_ID = "chart-30000000-0000-4000-8000-000000000002";
  const CHART_VERSION_2_ID = "cver-30000000-0000-4000-8000-000000000002";
  const EVIDENCE_SET_2_ID = "evset-30000000-0000-4000-8000-000000000002";

  // Profile 3: Single order without report (Lê Hoàng Nam) for checkout paid without reportId
  const PROFILE_3_ID = "30000000-0000-4000-8000-000000000003";
  const REVISION_3_ID = "31000000-0000-4000-8000-000000000003";
  const RUN_3_ID = "32000000-0000-4000-8000-000000000003";
  const CHART_3_ID = "chart-30000000-0000-4000-8000-000000000003";
  const CHART_VERSION_3_ID = "cver-30000000-0000-4000-8000-000000000003";
  const EVIDENCE_SET_3_ID = "evset-30000000-0000-4000-8000-000000000003";

  // Clean previous fixture rows if any
  await database.delete(reportVersions);
  await database.delete(reportReservations);
  await database.delete(commerceEntitlements);
  await database.delete(commerceOrders);
  await database.delete(evidenceItems);
  await database.delete(evidenceSets);
  await database.delete(ziweiChartVersions);
  await database.delete(ziweiCharts);
  await database.delete(calculationRuns);
  await database.delete(birthProfileRevisions);
  await database.delete(birthProfiles);
  await database.delete(authSessions);
  await database.delete(authUsers);

  // 1. Insert User
  await database.insert(authUsers).values({
    id: USER_ID,
    name: USER_NAME,
    email: USER_EMAIL,
    emailVerified: true,
    isAnonymous: false,
  });

  // 2. Insert Session
  await database.insert(authSessions).values({
    id: SESSION_ID,
    userId: USER_ID,
    token: SESSION_TOKEN,
    expiresAt: SESSION_EXPIRES_AT,
  });

  // Insert Profiles
  await database.insert(birthProfiles).values([
    { id: PROFILE_1_ID, userId: USER_ID },
    { id: PROFILE_2_ID, userId: USER_ID },
    { id: PROFILE_3_ID, userId: USER_ID },
  ]);

  // Helper to insert revision, run, chart, chartVersion, evidenceSet
  async function seedChartLineage({
    profileId,
    revisionNumber,
    revisionId,
    runId,
    chartId,
    chartVersionId,
    evidenceSetId,
    displayName,
    birth,
  }) {
    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber,
      originalInput: {
        displayName,
        birthDate: birth.date,
        birthTime: birth.time,
        gender: birth.gender,
      },
      normalizedInput: {},
      consentVersion: "privacy.v1",
    });

    await database.insert(calculationRuns).values({
      id: runId,
      profileId,
      profileRevisionId: revisionId,
      idempotencyKey: "run-" + runId,
      engineId: "ziwei.iztro",
      engineVersion: "1.0",
      adapterId: "iztro",
      adapterVersion: "1.0",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
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
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });

    await database.insert(evidenceSets).values({
      id: evidenceSetId,
      chartVersionId,
      capabilityId: "ziwei.identity.p0",
      ruleVersion: "ziwei.identity.v1",
    });

    await database.insert(evidenceItems).values({
      id: "evitem-" + evidenceSetId,
      evidenceSetId,
      evidenceKey: "ziwei.identity.life-palace",
      payload: {
        id: "ziwei.identity.life-palace",
        factReferences: ["palace.life.main-star"],
        confidence: "high",
        interpretationBounds: ["Reflective identity only"],
        interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Time accuracy needed"],
        riskTags: ["identity"],
        allowedActionCategories: ["reflect"],
      },
    });
  }

  // Profile 1: Revision 1, 2, 3
  await seedChartLineage({
    profileId: PROFILE_1_ID,
    revisionNumber: 1,
    revisionId: REVISION_1_ID,
    runId: RUN_1_ID,
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    evidenceSetId: EVIDENCE_SET_1_ID,
    displayName: "Nguyễn Văn An",
    birth: { date: "1990-01-01", time: "09:30", gender: "male" },
  });

  await seedChartLineage({
    profileId: PROFILE_1_ID,
    revisionNumber: 2,
    revisionId: REVISION_8_ID,
    runId: RUN_8_ID,
    chartId: CHART_8_ID,
    chartVersionId: CHART_VERSION_8_ID,
    evidenceSetId: EVIDENCE_SET_8_ID,
    displayName: "Nguyễn Văn An",
    birth: { date: "1990-01-01", time: "09:30", gender: "male" },
  });

  await seedChartLineage({
    profileId: PROFILE_1_ID,
    revisionNumber: 3,
    revisionId: REVISION_9_ID,
    runId: RUN_9_ID,
    chartId: CHART_9_ID,
    chartVersionId: CHART_VERSION_9_ID,
    evidenceSetId: EVIDENCE_SET_9_ID,
    displayName: "Nguyễn Văn An",
    birth: { date: "1990-01-01", time: "09:30", gender: "male" },
  });

  // Profile 2: Revision 1
  await seedChartLineage({
    profileId: PROFILE_2_ID,
    revisionNumber: 1,
    revisionId: REVISION_2_ID,
    runId: RUN_2_ID,
    chartId: CHART_2_ID,
    chartVersionId: CHART_VERSION_2_ID,
    evidenceSetId: EVIDENCE_SET_2_ID,
    displayName: "Nguyễn Minh Châu",
    birth: { date: "1995-05-15", time: "14:15", gender: "female" },
  });

  // Profile 3: Revision 1
  await seedChartLineage({
    profileId: PROFILE_3_ID,
    revisionNumber: 1,
    revisionId: REVISION_3_ID,
    runId: RUN_3_ID,
    chartId: CHART_3_ID,
    chartVersionId: CHART_VERSION_3_ID,
    evidenceSetId: EVIDENCE_SET_3_ID,
    displayName: "Lê Hoàng Nam",
    birth: { date: "1992-10-20", time: "10:00", gender: "male" },
  });

  // Helper for structured report content
  function buildReportContent(chartVerId, title) {
    return {
      version: 1,
      sku: "ZIWEI-IDENTITY-P0",
      capabilityId: "ziwei.identity.p0",
      locale: "vi",
      provenance: {
        chartVersionId: chartVerId,
        ruleVersion: "ziwei.identity.v1",
        evidenceVersion: 1,
        knowledgeVersion: "ziwei.identity.knowledge.v2",
        providerId: "openai",
        modelId: "gpt-4o",
        promptVersion: "ziwei.identity.prompt.v2",
        templateVersion: "identity-report-template.v1",
      },
      sections: [
        {
          id: "personal_summary",
          title,
          narrative: "Tổng quan bản mệnh và hướng phát triển.",
          claims: [],
        },
      ],
      reflectionQuestions: [
        "Giá trị cốt lõi nào bạn hướng tới?",
        "Điều gì mang lại động lực bền vững?",
        "Hành động cụ thể hôm nay là gì?",
      ],
      summaryActions: ["Lập kế hoạch hành động từng giai đoạn"],
      professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    };
  }

  // Order 1: Paid + Ready report for Profile 1 (Library Group 1)
  const ORDER_1_ID = "40000000-0000-4000-8000-000000000001";
  const ENTITLEMENT_1_ID = "50000000-0000-4000-8000-000000000001";
  const RESERVATION_1_ID = "60000000-0000-4000-8000-000000000001";
  const REPORT_1_ID = "70000000-0000-4000-8000-000000000001";
  const REPORT_VERSION_1_ID = "71000000-0000-4000-8000-000000000001";
  const REPORT_ROW_1_ID = "80000000-0000-4000-8000-000000000001";
  const PDF_ASSET_1_ID = "90000000-0000-4000-8000-000000000001";

  await database.insert(commerceOrders).values({
    id: ORDER_1_ID,
    paymentCode: "LSV901000001",
    invoiceNumber: "LSV-20260909-001",
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    paidAt: new Date("2026-09-09T08:00:00.000Z"),
    createdAt: new Date("2026-09-09T07:50:00.000Z"),
  });

  await database.insert(commerceEntitlements).values({
    id: ENTITLEMENT_1_ID,
    orderId: ORDER_1_ID,
    chartId: CHART_1_ID,
    sku: "ZIWEI-IDENTITY-P0",
    ownerId: USER_ID,
    scope: TIER_2_ENTITLEMENT_SCOPE,
    createdAt: new Date("2026-09-09T08:00:00.000Z"),
  });

  await database.insert(reportReservations).values({
    id: RESERVATION_1_ID,
    reportId: REPORT_1_ID,
    reportVersionId: REPORT_VERSION_1_ID,
    entitlementId: ENTITLEMENT_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    evidenceVersionId: EVIDENCE_SET_1_ID,
    knowledgeVersionId: "ziwei.identity.knowledge.v2",
    promptVersion: "ziwei.identity.prompt.v2",
    reportConfigVersion: "ziwei.identity.report.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    status: "complete",
    createdAt: new Date("2026-09-09T08:01:00.000Z"),
    updatedAt: new Date("2026-09-09T08:05:00.000Z"),
  });

  await database.insert(reportVersions).values({
    id: REPORT_ROW_1_ID,
    reportId: REPORT_1_ID,
    reportVersionId: REPORT_VERSION_1_ID,
    entitlementId: ENTITLEMENT_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    evidenceVersionId: EVIDENCE_SET_1_ID,
    knowledgeVersionId: "ziwei.identity.knowledge.v2",
    promptVersion: "ziwei.identity.prompt.v2",
    reportConfigVersion: "ziwei.identity.report.v1",
    templateVersion: "1.0",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    providerId: "openai",
    modelId: "gpt-4o",
    structuredContent: buildReportContent(CHART_VERSION_1_ID, "Bản Luận Giải Tử Vi - Nguyễn Văn An"),
    htmlContent: "<p>Báo cáo Tử Vi bản mệnh - Nguyễn Văn An</p>",
    contentHash: "1".repeat(64),
    pdfAssetId: PDF_ASSET_1_ID,
    renderVersion: "1.0",
    createdAt: new Date("2026-09-09T08:05:00.000Z"),
  });

  // Order 2: Paid + Ready report for Profile 2 (Account Overview latest report & Library Group 2)
  const ORDER_2_ID = "40000000-0000-4000-8000-000000000002";
  const ENTITLEMENT_2_ID = "50000000-0000-4000-8000-000000000002";
  const RESERVATION_2_ID = "60000000-0000-4000-8000-000000000002";
  const REPORT_2_ID = "70000000-0000-4000-8000-000000000002";
  const REPORT_VERSION_2_ID = "71000000-0000-4000-8000-000000000002";
  const REPORT_ROW_2_ID = "80000000-0000-4000-8000-000000000002";
  const PDF_ASSET_2_ID = "90000000-0000-4000-8000-000000000002";

  await database.insert(commerceOrders).values({
    id: ORDER_2_ID,
    paymentCode: "LSV901000002",
    invoiceNumber: "LSV-20260909-002",
    chartId: CHART_2_ID,
    chartVersionId: CHART_VERSION_2_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    paidAt: new Date("2026-09-09T08:30:00.000Z"),
    createdAt: new Date("2026-09-09T08:20:00.000Z"),
  });

  await database.insert(commerceEntitlements).values({
    id: ENTITLEMENT_2_ID,
    orderId: ORDER_2_ID,
    chartId: CHART_2_ID,
    sku: "ZIWEI-IDENTITY-P0",
    ownerId: USER_ID,
    scope: TIER_2_ENTITLEMENT_SCOPE,
    createdAt: new Date("2026-09-09T08:30:00.000Z"),
  });

  await database.insert(reportReservations).values({
    id: RESERVATION_2_ID,
    reportId: REPORT_2_ID,
    reportVersionId: REPORT_VERSION_2_ID,
    entitlementId: ENTITLEMENT_2_ID,
    chartVersionId: CHART_VERSION_2_ID,
    evidenceVersionId: EVIDENCE_SET_2_ID,
    knowledgeVersionId: "ziwei.identity.knowledge.v2",
    promptVersion: "ziwei.identity.prompt.v2",
    reportConfigVersion: "ziwei.identity.report.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    status: "complete",
    createdAt: new Date("2026-09-09T08:31:00.000Z"),
    updatedAt: new Date("2026-09-09T08:35:00.000Z"),
  });

  await database.insert(reportVersions).values({
    id: REPORT_ROW_2_ID,
    reportId: REPORT_2_ID,
    reportVersionId: REPORT_VERSION_2_ID,
    entitlementId: ENTITLEMENT_2_ID,
    chartVersionId: CHART_VERSION_2_ID,
    evidenceVersionId: EVIDENCE_SET_2_ID,
    knowledgeVersionId: "ziwei.identity.knowledge.v2",
    promptVersion: "ziwei.identity.prompt.v2",
    reportConfigVersion: "ziwei.identity.report.v1",
    templateVersion: "1.0",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    providerId: "openai",
    modelId: "gpt-4o",
    structuredContent: buildReportContent(CHART_VERSION_2_ID, "Bản Luận Giải Tử Vi - Nguyễn Minh Châu"),
    htmlContent: "<p>Báo cáo Tử Vi bản mệnh - Nguyễn Minh Châu</p>",
    contentHash: "2".repeat(64),
    pdfAssetId: PDF_ASSET_2_ID,
    renderVersion: "1.0",
    createdAt: new Date("2026-09-09T08:35:00.000Z"),
  });

  // Order 3: Checkout pending state
  const ORDER_3_ID = "40000000-0000-4000-8000-000000000003";
  await database.insert(commerceOrders).values({
    id: ORDER_3_ID,
    paymentCode: "LSV901000003",
    invoiceNumber: "LSV-20260909-003",
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "pending",
    createdAt: new Date("2026-09-09T08:40:00.000Z"),
  });

  // Order 4: Checkout paid with no report ID (Chart 3 has no reservation)
  const ORDER_4_ID = "40000000-0000-4000-8000-000000000004";
  await database.insert(commerceOrders).values({
    id: ORDER_4_ID,
    paymentCode: "LSV901000004",
    invoiceNumber: "LSV-20260909-004",
    chartId: CHART_3_ID,
    chartVersionId: CHART_VERSION_3_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    paidAt: new Date("2026-09-09T08:45:00.000Z"),
    createdAt: new Date("2026-09-09T08:41:00.000Z"),
  });

  // Order 5: Checkout expired state
  const ORDER_5_ID = "40000000-0000-4000-8000-000000000005";
  await database.insert(commerceOrders).values({
    id: ORDER_5_ID,
    paymentCode: "LSV901000005",
    invoiceNumber: "LSV-20260909-005",
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "expired",
    createdAt: new Date("2026-09-01T08:00:00.000Z"),
  });

  // Order 6: Checkout failed state
  const ORDER_6_ID = "40000000-0000-4000-8000-000000000006";
  await database.insert(commerceOrders).values({
    id: ORDER_6_ID,
    paymentCode: "LSV901000006",
    invoiceNumber: "LSV-20260909-006",
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "failed",
    createdAt: new Date("2026-09-02T08:00:00.000Z"),
  });

  // Order 7: Checkout refunded state
  const ORDER_7_ID = "40000000-0000-4000-8000-000000000007";
  await database.insert(commerceOrders).values({
    id: ORDER_7_ID,
    paymentCode: "LSV901000007",
    invoiceNumber: "LSV-20260909-007",
    chartId: CHART_1_ID,
    chartVersionId: CHART_VERSION_1_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "refunded",
    createdAt: new Date("2026-09-03T08:00:00.000Z"),
  });

  // Order 8: Report pending state (real generating reservation)
  const ORDER_8_ID = "40000000-0000-4000-8000-000000000008";
  const ENTITLEMENT_8_ID = "50000000-0000-4000-8000-000000000008";
  const RESERVATION_8_ID = "60000000-0000-4000-8000-000000000008";
  const REPORT_8_ID = "70000000-0000-4000-8000-000000000008";
  const REPORT_VERSION_8_ID = "71000000-0000-4000-8000-000000000008";

  await database.insert(commerceOrders).values({
    id: ORDER_8_ID,
    paymentCode: "LSV901000008",
    invoiceNumber: "LSV-20260909-008",
    chartId: CHART_8_ID,
    chartVersionId: CHART_VERSION_8_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    paidAt: new Date("2026-09-09T08:50:00.000Z"),
    createdAt: new Date("2026-09-09T08:48:00.000Z"),
  });

  await database.insert(commerceEntitlements).values({
    id: ENTITLEMENT_8_ID,
    orderId: ORDER_8_ID,
    chartId: CHART_8_ID,
    sku: "ZIWEI-IDENTITY-P0",
    ownerId: USER_ID,
    scope: TIER_2_ENTITLEMENT_SCOPE,
    createdAt: new Date("2026-09-09T08:50:00.000Z"),
  });

  await database.insert(reportReservations).values({
    id: RESERVATION_8_ID,
    reportId: REPORT_8_ID,
    reportVersionId: REPORT_VERSION_8_ID,
    entitlementId: ENTITLEMENT_8_ID,
    chartVersionId: CHART_VERSION_8_ID,
    evidenceVersionId: EVIDENCE_SET_8_ID,
    knowledgeVersionId: "ziwei.identity.knowledge.v2",
    promptVersion: "ziwei.identity.prompt.v2",
    reportConfigVersion: "ziwei.identity.report.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    status: "generating",
    createdAt: new Date("2026-09-09T08:50:00.000Z"),
    updatedAt: new Date("2026-09-09T08:50:00.000Z"),
  });

  // Order 9: Report terminal_failure state (paid order with terminal_failure reservation)
  const ORDER_9_ID = "40000000-0000-4000-8000-000000000009";
  const ENTITLEMENT_9_ID = "50000000-0000-4000-8000-000000000009";
  const RESERVATION_9_ID = "60000000-0000-4000-8000-000000000009";
  const REPORT_9_ID = "70000000-0000-4000-8000-000000000009";
  const REPORT_VERSION_9_ID = "71000000-0000-4000-8000-000000000009";

  await database.insert(commerceOrders).values({
    id: ORDER_9_ID,
    paymentCode: "LSV901000009",
    invoiceNumber: "LSV-20260909-009",
    chartId: CHART_9_ID,
    chartVersionId: CHART_VERSION_9_ID,
    ownerId: USER_ID,
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    paidAt: new Date("2026-09-09T08:55:00.000Z"),
    createdAt: new Date("2026-09-09T08:52:00.000Z"),
  });

  await database.insert(commerceEntitlements).values({
    id: ENTITLEMENT_9_ID,
    orderId: ORDER_9_ID,
    chartId: CHART_9_ID,
    sku: "ZIWEI-IDENTITY-P0",
    ownerId: USER_ID,
    scope: TIER_2_ENTITLEMENT_SCOPE,
    createdAt: new Date("2026-09-09T08:55:00.000Z"),
  });

  await database.insert(reportReservations).values({
    id: RESERVATION_9_ID,
    reportId: REPORT_9_ID,
    reportVersionId: REPORT_VERSION_9_ID,
    entitlementId: ENTITLEMENT_9_ID,
    chartVersionId: CHART_VERSION_9_ID,
    evidenceVersionId: EVIDENCE_SET_9_ID,
    knowledgeVersionId: "ziwei.identity.knowledge.v2",
    promptVersion: "ziwei.identity.prompt.v2",
    reportConfigVersion: "ziwei.identity.report.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    status: "terminal_failure",
    lastErrorCode: "AI_PROVIDER_ERROR",
    createdAt: new Date("2026-09-09T08:55:00.000Z"),
    updatedAt: new Date("2026-09-09T08:56:00.000Z"),
  });

  const manifest = {
    user: {
      id: USER_ID,
      email: USER_EMAIL,
      name: USER_NAME,
    },
    session: {
      cookieName: "better-auth.session_token",
      cookieValue: signedCookieValue,
    },
    routes: {
      account: "/tai-khoan",
      reports: "/tai-khoan/bao-cao",
      orders: "/tai-khoan/don-hang",
      checkoutPending: `/thanh-toan/${ORDER_3_ID}`,
      checkoutPaid: `/thanh-toan/${ORDER_4_ID}`,
      checkoutExpired: `/thanh-toan/${ORDER_5_ID}`,
      checkoutFailed: `/thanh-toan/${ORDER_6_ID}`,
      checkoutRefunded: `/thanh-toan/${ORDER_7_ID}`,
      reportPending: `/bao-cao/${REPORT_8_ID}`,
      reportTerminalFailure: `/bao-cao/${REPORT_9_ID}`,
    },
    ids: {
      orderPendingId: ORDER_3_ID,
      orderPaidNoReportId: ORDER_4_ID,
      orderExpiredId: ORDER_5_ID,
      orderFailedId: ORDER_6_ID,
      orderRefundedId: ORDER_7_ID,
      reportPendingId: REPORT_8_ID,
      reportTerminalFailureId: REPORT_9_ID,
    },
  };

  // Write manifest to artifacts directory for tests to consume
  const artifactDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.superpowers/sdd/2026-09-08-product-ladder-and-post-purchase-experience/artifacts/wp13",
  );
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(
      path.join(artifactDir, "fixture-manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
  }

  return manifest;
  } finally {
    if (database?.$client?.end) {
      await database.$client.end({ timeout: 5 });
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedAuthenticatedFixture()
    .then((manifest) => {
      // Output only JSON fixture manifest with no secrets or database URL
      console.log(JSON.stringify(manifest, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error(error?.message || error);
      process.exit(1);
    });
}
