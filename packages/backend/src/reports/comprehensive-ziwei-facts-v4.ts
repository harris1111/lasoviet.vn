import {
  NormalizedZiweiChartV1Schema,
  ReportSourceSnapshotV1Schema,
  type NormalizedZiweiChartV1,
  type ReportSourceSnapshotV1,
  type ZiweiReportEvidenceSetV2,
  type ZiweiSensitivitySnapshotV1,
  type ZiweiTimingSnapshotV1,
} from "@lasoviet/contracts";

import {
  buildZiweiV4Evidence,
  ZiweiV4EvidenceError,
} from "../evidence/ziwei-v4-evidence.js";
import {
  buildComprehensiveZiweiFacts,
  type ComprehensiveZiweiFacts,
} from "./comprehensive-ziwei-facts.js";

export type ComprehensiveZiweiFactsV4Lineage = {
  reportVersionId: string;
  chartVersionId: string;
  asOfDate: string;
  targetYear: number;
  timingRuleVersion: string;
  sensitivityRuleVersion: string;
  snapshotHash: string;
};

export type ComprehensiveZiweiFactsV4 = {
  version: 4;
  natal: ComprehensiveZiweiFacts;
  timing: ZiweiTimingSnapshotV1;
  sensitivity: ZiweiSensitivitySnapshotV1;
  sourceSnapshot: ComprehensiveZiweiFactsV4Lineage;
  evidence: ZiweiReportEvidenceSetV2;
  evidenceKeys: string[];
};

export class ComprehensiveZiweiFactsV4Error extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "ComprehensiveZiweiFactsV4Error";
    this.code = code;
    this.retryable = retryable;
  }
}

export function buildComprehensiveZiweiFactsV4(
  chart: NormalizedZiweiChartV1,
  sourceSnapshot: ReportSourceSnapshotV1,
): ComprehensiveZiweiFactsV4 {
  const parsedSnapshot = ReportSourceSnapshotV1Schema.safeParse(sourceSnapshot);
  if (!parsedSnapshot.success) {
    throw new ComprehensiveZiweiFactsV4Error(
      "V4_FACTS_SNAPSHOT_INVALID",
      `Invalid source snapshot: ${parsedSnapshot.error.message}`,
      false,
    );
  }
  const validSnapshot = parsedSnapshot.data;

  const parsedChart = NormalizedZiweiChartV1Schema.safeParse(chart);
  if (!parsedChart.success) {
    throw new ComprehensiveZiweiFactsV4Error(
      "V4_FACTS_CHART_INVALID",
      `Invalid normalized ziwei chart: ${parsedChart.error.message}`,
      false,
    );
  }
  const validChart = parsedChart.data;

  // Verify chart and snapshot consistency against sensitivity selected frame facts
  const sensitivity = validSnapshot.snapshot.sensitivity;

  const sensitiveSoulPalace = sensitivity.sensitiveFacts.find(
    (f) => f.factKey === "ziwei.fact.soul-palace",
  );
  if (sensitiveSoulPalace) {
    const selectedVariant = sensitiveSoulPalace.variants.find(
      (v) => v.position === "selected",
    );
    if (
      selectedVariant &&
      selectedVariant.valueIds[0] &&
      selectedVariant.valueIds[0] !== validChart.soulPalaceId
    ) {
      throw new ComprehensiveZiweiFactsV4Error(
        "V4_FACTS_CHART_SNAPSHOT_MISMATCH",
        `Soul palace in chart (${validChart.soulPalaceId}) does not match snapshot selected frame (${selectedVariant.valueIds[0]})`,
        false,
      );
    }
  }

  const sensitiveBodyPalace = sensitivity.sensitiveFacts.find(
    (f) => f.factKey === "ziwei.fact.body-palace",
  );
  if (sensitiveBodyPalace) {
    const selectedVariant = sensitiveBodyPalace.variants.find(
      (v) => v.position === "selected",
    );
    if (
      selectedVariant &&
      selectedVariant.valueIds[0] &&
      selectedVariant.valueIds[0] !== validChart.bodyPalaceId
    ) {
      throw new ComprehensiveZiweiFactsV4Error(
        "V4_FACTS_CHART_SNAPSHOT_MISMATCH",
        `Body palace in chart (${validChart.bodyPalaceId}) does not match snapshot selected frame (${selectedVariant.valueIds[0]})`,
        false,
      );
    }
  }

  // Build existing V3 natal facts without mutation
  const natal = buildComprehensiveZiweiFacts(validChart);

  // Build V4 evidence set
  let evidence: ZiweiReportEvidenceSetV2;
  try {
    evidence = buildZiweiV4Evidence(natal, validSnapshot);
  } catch (error) {
    if (error instanceof ZiweiV4EvidenceError) {
      throw new ComprehensiveZiweiFactsV4Error(
        error.code,
        error.message,
        error.retryable,
      );
    }
    throw error;
  }

  const evidenceKeys = evidence.items.map((item) => item.key);

  const sourceSnapshotLineage: ComprehensiveZiweiFactsV4Lineage = {
    reportVersionId: validSnapshot.reportVersionId,
    chartVersionId: validSnapshot.chartVersionId,
    asOfDate: validSnapshot.asOfDate,
    targetYear: validSnapshot.targetYear,
    timingRuleVersion: validSnapshot.timingRuleVersion,
    sensitivityRuleVersion: validSnapshot.sensitivityRuleVersion,
    snapshotHash: validSnapshot.snapshotHash,
  };

  return {
    version: 4,
    natal,
    timing: validSnapshot.snapshot.timing,
    sensitivity: validSnapshot.snapshot.sensitivity,
    sourceSnapshot: sourceSnapshotLineage,
    evidence,
    evidenceKeys,
  };
}
