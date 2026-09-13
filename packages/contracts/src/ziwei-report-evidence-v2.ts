import { z } from "zod";

export const ZIWEI_REPORT_EVIDENCE_DIMENSIONS_V2 = [
  "natal",
  "decadal",
  "annual",
  "sensitivity_stable",
  "sensitivity_sensitive",
] as const;
export type ZiweiReportEvidenceDimensionV2 =
  (typeof ZIWEI_REPORT_EVIDENCE_DIMENSIONS_V2)[number];

export const ZiweiReportEvidenceDimensionV2Schema = z.enum(
  ZIWEI_REPORT_EVIDENCE_DIMENSIONS_V2,
);

export const ZIWEI_REPORT_EVIDENCE_CONFIDENCES_V2 = [
  "high",
  "moderate",
  "conditional",
] as const;
export type ZiweiReportEvidenceConfidenceV2 =
  (typeof ZIWEI_REPORT_EVIDENCE_CONFIDENCES_V2)[number];

export const ZiweiReportEvidenceConfidenceV2Schema = z.enum(
  ZIWEI_REPORT_EVIDENCE_CONFIDENCES_V2,
);

const EVIDENCE_PREFIX_BY_DIMENSION: Record<
  ZiweiReportEvidenceDimensionV2,
  { prefix: string; regex: RegExp }
> = {
  natal: { prefix: "natal.", regex: /^natal\.[a-z0-9_.-]+$/ },
  decadal: { prefix: "decadal.", regex: /^decadal\.[a-z0-9_.-]+$/ },
  annual: { prefix: "annual.", regex: /^annual\.[a-z0-9_.-]+$/ },
  sensitivity_stable: {
    prefix: "sensitivity.stable.",
    regex: /^sensitivity\.stable\.[a-z0-9_.-]+$/,
  },
  sensitivity_sensitive: {
    prefix: "sensitivity.sensitive.",
    regex: /^sensitivity\.sensitive\.[a-z0-9_.-]+$/,
  },
};

export const ZiweiReportEvidenceItemV2Schema = z
  .object({
    key: z.string().trim().min(1),
    dimension: ZiweiReportEvidenceDimensionV2Schema,
    confidence: ZiweiReportEvidenceConfidenceV2Schema,
    sourceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict()
  .superRefine((item, ctx) => {
    const config = EVIDENCE_PREFIX_BY_DIMENSION[item.dimension];
    if (!config.regex.test(item.key)) {
      ctx.addIssue({
        code: "custom",
        path: ["key"],
        message: `Evidence key '${item.key}' must be a lowercase identifier starting with '${config.prefix}' for dimension '${item.dimension}'`,
      });
    }

    const uniqueSourceKeys = new Set(item.sourceKeys);
    if (uniqueSourceKeys.size !== item.sourceKeys.length) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceKeys"],
        message: `sourceKeys must be unique for evidence item '${item.key}'`,
      });
    }
  });

export type ZiweiReportEvidenceItemV2 = z.infer<
  typeof ZiweiReportEvidenceItemV2Schema
>;

export const ZiweiReportEvidenceSetV2Schema = z
  .object({
    version: z.literal(2),
    capabilityId: z.literal("ziwei.identity.p0"),
    chartVersionId: z.string().trim().min(1),
    reportVersionId: z.string().trim().min(1),
    snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
    ruleVersion: z.literal("ziwei.comprehensive.v4"),
    items: z.array(ZiweiReportEvidenceItemV2Schema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seenKeys = new Set<string>();
    let hasNatal = false;
    let hasDecadal = false;
    let hasAnnual = false;
    let hasSensitivity = false;

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i]!;
      if (seenKeys.has(item.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", i, "key"],
          message: `Duplicate evidence item key: '${item.key}'`,
        });
      }
      seenKeys.add(item.key);

      if (item.dimension === "natal") {
        hasNatal = true;
      } else if (item.dimension === "decadal") {
        hasDecadal = true;
      } else if (item.dimension === "annual") {
        hasAnnual = true;
      } else if (
        item.dimension === "sensitivity_stable" ||
        item.dimension === "sensitivity_sensitive"
      ) {
        hasSensitivity = true;
      }
    }

    if (!hasNatal) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Evidence set must contain at least one natal item",
      });
    }
    if (!hasDecadal) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Evidence set must contain at least one decadal item",
      });
    }
    if (!hasAnnual) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Evidence set must contain at least one annual item",
      });
    }
    if (!hasSensitivity) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Evidence set must contain at least one sensitivity item",
      });
    }
  });

export type ZiweiReportEvidenceSetV2 = z.infer<
  typeof ZiweiReportEvidenceSetV2Schema
>;
