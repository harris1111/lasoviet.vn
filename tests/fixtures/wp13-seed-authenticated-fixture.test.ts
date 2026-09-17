import {
  EvidenceSetV1Schema,
  NormalizedBirthProfileV1Schema,
  NormalizedZiweiChartV1Schema,
  ReportSourceSnapshotV1Schema,
  TIER_2_V4_ENTITLEMENT_SCOPE,
  ZiweiComprehensiveReportContentV2Schema,
} from "@lasoviet/contracts";
import { describe, expect, it, vi } from "vitest";

import { buildComprehensiveZiweiFactsV4 } from "../../packages/backend/src/reports/comprehensive-ziwei-facts-v4.js";
import { validateComprehensiveReportSectionQualityV4 } from "../../packages/backend/src/reports/comprehensive-report-quality-v4.js";
import { validateComprehensiveZiweiReportV4 } from "../../packages/backend/src/reports/comprehensive-report-validator-v4.js";
import { createReportQueryService } from "../../packages/backend/src/reports/report-query.service.js";
import {
  WP13_V4_REPORT_EVIDENCE_KEYS,
  buildBirthProfileRevisionFixture,
  buildFixtureTemporalValues,
  buildIdentityEvidenceItems,
  buildNormalizedZiweiChart,
  buildReportSourceSnapshot,
  buildV4ReportContent,
} from "../../scripts/wp13-seed-authenticated-fixture.mjs";

const REPORT_ID = "70000000-0000-4000-8000-000000000001";
const REPORT_VERSION_ID = "71000000-0000-4000-8000-000000000001";
const CHART_VERSION_ID = "cver-30000000-0000-4000-8000-000000000001";
const EVIDENCE_SET_ID = "evset-30000000-0000-4000-8000-000000000001";

describe("WP-13 authenticated fixture", () => {
  it("derives live timestamps from one captured clock", () => {
    const fixtureNow = new Date("2026-09-16T12:00:00.000Z");
    const values = buildFixtureTemporalValues(fixtureNow);

    expect(values.pendingOrderCreatedAt.getTime()).toBe(fixtureNow.getTime());
    expect(values.sessionExpiresAt.getTime()).toBe(
      fixtureNow.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
  });

  it.each([
    {
      displayName: "Nguyễn Văn An",
      birth: { date: "1990-01-01", time: "09:30", gender: "male" },
    },
    {
      displayName: "Nguyễn Minh Châu",
      birth: { date: "1995-05-15", time: "14:15", gender: "female" },
    },
  ])("reconstructs the persisted profile row for $displayName", ({ displayName, birth }) => {
    const revision = buildBirthProfileRevisionFixture({ displayName, birth });
    const reconstructed = {
      ...revision.normalizedInput,
      originalInput: revision.originalInput,
    };

    const parsed = NormalizedBirthProfileV1Schema.parse(reconstructed);
    expect(parsed.originalInput).toEqual(revision.originalInput);
    expect(parsed.originalInput.calendar.date).toBe(birth.date);
    expect(parsed.originalInput.time).toEqual({
      precision: "exact_minute",
      localTime: birth.time,
    });
    expect(parsed.originalInput.gender).toBe(birth.gender);
    expect(parsed.timezoneProvenance).toEqual({
      source: "iana",
      ianaZone: "Asia/Ho_Chi_Minh",
      runtime: "Intl",
    });
  });

  it("builds coherent V4 source/evidence lineage and returns a ready report", async () => {
    const chart = NormalizedZiweiChartV1Schema.parse(buildNormalizedZiweiChart());
    const evidenceItems = buildIdentityEvidenceItems(EVIDENCE_SET_ID);
    const evidenceSet = EvidenceSetV1Schema.parse({
      version: 1,
      capabilityId: "ziwei.identity.p0",
      chartVersionId: CHART_VERSION_ID,
      ruleVersion: "ziwei.identity.v1",
      items: evidenceItems.map((item) => item.payload),
    });
    expect(evidenceSet.items).toHaveLength(3);

    const sourceSnapshot = ReportSourceSnapshotV1Schema.parse(
      buildReportSourceSnapshot({
        reportId: REPORT_ID,
        reportVersionId: REPORT_VERSION_ID,
        chartVersionId: CHART_VERSION_ID,
        snapshotHash: "d".repeat(64),
        selectedFrame: {
          vendorTimeIndex: 5,
          previousFrameId: "ziwei.time-frame.dragon",
          frameId: "ziwei.time-frame.snake",
          nextFrameId: "ziwei.time-frame.horse",
        },
      }),
    );
    const facts = buildComprehensiveZiweiFactsV4(chart, sourceSnapshot);
    const content = ZiweiComprehensiveReportContentV2Schema.parse(
      buildV4ReportContent(),
    );
    const validation = validateComprehensiveZiweiReportV4(content, facts);

    expect(validation.ok).toBe(true);
    expect(facts.evidenceKeys).toEqual(
      expect.arrayContaining(Object.values(WP13_V4_REPORT_EVIDENCE_KEYS)),
    );
    const qualityInputs = [
      {
        key: "overview",
        kind: "overview",
        text: `${content.overview.title} ${content.overview.narrative}`,
        evidenceKeys: content.overview.evidenceKeys,
      },
      {
        key: "coreAxis",
        kind: "coreAxis",
        text: `${content.coreAxis.title} ${content.coreAxis.narrative}`,
        evidenceKeys: content.coreAxis.evidenceKeys,
      },
      ...content.keyConfigurations.map((section, index) => ({
        key: `keyConfigurations:${index}`,
        kind: "keyConfigurations",
        text: `${section.title} ${section.narrative}`,
        evidenceKeys: section.evidenceKeys,
      })),
      ...content.palaceReadings.map((section) => ({
        key: `palace:${section.palaceId}`,
        kind: "palace",
        palaceId: section.palaceId,
        text: `${section.title} ${section.narrative}`,
        evidenceKeys: section.evidenceKeys,
      })),
      ...content.thematicSynthesis.map((section) => ({
        key: `thematic:${section.id}`,
        kind: "thematic",
        text: `${section.title} ${section.narrative}`,
        evidenceKeys: section.evidenceKeys,
      })),
      {
        key: "strengthsAndTensions",
        kind: "strengthsAndTensions",
        text: `${content.strengthsAndTensions.title} ${content.strengthsAndTensions.narrative}`,
        evidenceKeys: content.strengthsAndTensions.evidenceKeys,
      },
      {
        key: "currentDecadal",
        kind: "currentDecadal",
        text: `${content.currentDecadal.title} ${content.currentDecadal.narrative}`,
        evidenceKeys: content.currentDecadal.evidenceKeys,
      },
      {
        key: "annualSnapshot",
        kind: "annualSnapshot",
        text: `${content.annualSnapshot.title} ${content.annualSnapshot.narrative}`,
        evidenceKeys: content.annualSnapshot.evidenceKeys,
      },
      ...content.practicalDirection.map((action, index) => ({
        key: `practicalDirection:${index}`,
        kind: "practicalAction",
        text: `${action.recommendation} ${action.rationale} ${action.avoid}`,
        evidenceKeys: action.evidenceKeys,
      })),
    ];
    for (const qualityInput of qualityInputs) {
      expect(
        validateComprehensiveReportSectionQualityV4(
          qualityInput as Parameters<
            typeof validateComprehensiveReportSectionQualityV4
          >[0],
          facts,
        ),
        qualityInput.key,
      ).toEqual({ ok: true, findings: [] });
    }

    const reservation = {
      id: "60000000-0000-4000-8000-000000000001",
      reportId: REPORT_ID,
      reportVersionId: REPORT_VERSION_ID,
      entitlementId: "50000000-0000-4000-8000-000000000001",
      chartVersionId: CHART_VERSION_ID,
      evidenceVersionId: EVIDENCE_SET_ID,
      knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
      promptVersion: "ziwei.comprehensive.prompt.v4",
      reportConfigVersion: "ziwei.comprehensive.report.v4",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "complete",
      stateVersion: 1,
      attemptCount: 0,
      activeJobId: null,
      lastErrorCode: null,
      nextAttemptAt: null,
      rewriteConsumedAt: null,
      createdAt: new Date("2026-09-09T08:01:00.000Z"),
      updatedAt: new Date("2026-09-09T08:05:00.000Z"),
      asOfDate: sourceSnapshot.asOfDate,
      targetYear: sourceSnapshot.targetYear,
      timingRuleVersion: sourceSnapshot.timingRuleVersion,
      sensitivityRuleVersion: sourceSnapshot.sensitivityRuleVersion,
    };
    const order = {
      id: "40000000-0000-4000-8000-000000000001",
      paymentCode: "LSV901000001",
      invoiceNumber: "LSV-20260909-001",
      chartId: "chart-30000000-0000-4000-8000-000000000001",
      chartVersionId: CHART_VERSION_ID,
      ownerId: "10000000-0000-4000-8000-000000000001",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      priceVariant: null,
      creditApplied: 0,
      creditedFromOrderId: null,
      creditExpiresAt: null,
      createdAt: new Date("2026-09-09T07:50:00.000Z"),
      paidAt: new Date("2026-09-09T08:00:00.000Z"),
    };
    const version = {
      id: "80000000-0000-4000-8000-000000000001",
      reportId: REPORT_ID,
      reportVersionId: REPORT_VERSION_ID,
      entitlementId: reservation.entitlementId,
      chartVersionId: CHART_VERSION_ID,
      evidenceVersionId: EVIDENCE_SET_ID,
      knowledgeVersionId: reservation.knowledgeVersionId,
      promptVersion: reservation.promptVersion,
      reportConfigVersion: reservation.reportConfigVersion,
      templateVersion: "ziwei-comprehensive-html.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "openai",
      modelId: "gpt-4o",
      structuredContent: content,
      htmlContent: "<p>Báo cáo fixture tổng hợp.</p>",
      contentHash: "1".repeat(64),
      pdfAssetId: "90000000-0000-4000-8000-000000000001",
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
      createdAt: new Date("2026-09-09T08:05:00.000Z"),
    };
    const readAuthorizedReport = vi.fn().mockResolvedValue({
      source: "order",
      reservation,
      order,
      version,
      evidenceItems: evidenceItems.map((item) => ({
        ...item,
        createdAt: new Date("2026-09-09T08:00:00.000Z"),
      })),
      entitlements: [{
        id: reservation.entitlementId,
        chartId: order.chartId,
        sku: order.sku,
        scope: TIER_2_V4_ENTITLEMENT_SCOPE,
        active: true,
        source: "order",
      }],
    });
    const service = createReportQueryService({
      repository: { readAuthorizedReport },
    });

    const result = await service.getReport({
      kind: "account",
      userId: order.ownerId,
      role: "authenticated",
      permissions: [],
    }, REPORT_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state).toBe("ready");
      expect(result.value.contentVersion).toBe("ziwei-comprehensive.v2");
    }
    expect(readAuthorizedReport).toHaveBeenCalledWith(order.ownerId, REPORT_ID);
  });
});
