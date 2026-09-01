import { z } from "zod";

import {
  EvidenceItemV1Schema,
  type EvidenceItemV1,
} from "./evidence.js";
import {
  NormalizedZiweiChartV1Schema,
  type NormalizedZiweiChartV1,
} from "./normalized-ziwei-chart-v1.js";

const evidenceItemIdsSchema = z
  .array(EvidenceItemV1Schema.shape.id)
  .length(3)
  .superRefine((itemIds, context) => {
    if (new Set(itemIds).size !== itemIds.length) {
      context.addIssue({
        code: "custom",
        message: "Evidence item IDs must be unique",
      });
    }
  });

export type ZiweiChartViewV1 = {
  version: 1;
  chartId: string;
  chartVersionId: string;
  chart: NormalizedZiweiChartV1;
  evidenceIndex: {
    version: 1;
    evidenceSetId: string;
    capabilityId: "ziwei.identity.p0";
    chartVersionId: string;
    ruleVersion: "ziwei.identity.v1";
    itemIds: EvidenceItemV1["id"][];
  };
};

export type ZiweiEvidenceViewV1 = {
  version: 1;
  chartId: string;
  chartVersionId: string;
  evidence: EvidenceItemV1;
};

export const ZiweiChartViewV1Schema: z.ZodType<ZiweiChartViewV1> = z
  .object({
    version: z.literal(1),
    chartId: z.string().trim().min(1),
    chartVersionId: z.string().trim().min(1),
    chart: NormalizedZiweiChartV1Schema,
    evidenceIndex: z
      .object({
        version: z.literal(1),
        evidenceSetId: z.string().trim().min(1),
        capabilityId: z.literal("ziwei.identity.p0"),
        chartVersionId: z.string().trim().min(1),
        ruleVersion: z.literal("ziwei.identity.v1"),
        itemIds: evidenceItemIdsSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((view, context) => {
    if (view.chartVersionId !== view.evidenceIndex.chartVersionId) {
      context.addIssue({
        code: "custom",
        path: ["evidenceIndex", "chartVersionId"],
        message: "Evidence index must belong to the selected chart version",
      });
    }
  });

export const ZiweiEvidenceViewV1Schema: z.ZodType<ZiweiEvidenceViewV1> = z
  .object({
    version: z.literal(1),
    chartId: z.string().trim().min(1),
    chartVersionId: z.string().trim().min(1),
    evidence: EvidenceItemV1Schema,
  })
  .strict();
