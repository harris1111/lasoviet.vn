import { z } from "zod";
import {
  ZiweiReportSnapshotV1Schema,
  type ZiweiReportSnapshotV1,
} from "./ziwei-report-snapshot-v1.js";

export const ReportSourceSnapshotV1Schema = z
  .object({
    version: z.literal(1),
    reportId: z.string().uuid(),
    reportVersionId: z.string().uuid(),
    chartVersionId: z.string().trim().min(1),
    asOfDate: z.iso.date(),
    targetYear: z.number().int(),
    timingRuleVersion: z.string().trim().min(1),
    sensitivityRuleVersion: z.string().trim().min(1),
    snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
    snapshot: ZiweiReportSnapshotV1Schema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const asOfDateYear = parseInt(data.asOfDate.slice(0, 4), 10);
    if (data.targetYear !== asOfDateYear) {
      ctx.addIssue({
        code: "custom",
        path: ["targetYear"],
        message: `targetYear (${data.targetYear}) must match asOfDate year (${asOfDateYear})`,
      });
    }

    if (data.chartVersionId !== data.snapshot.chartVersionId) {
      ctx.addIssue({
        code: "custom",
        path: ["chartVersionId"],
        message: `chartVersionId '${data.chartVersionId}' must match snapshot chartVersionId '${data.snapshot.chartVersionId}'`,
      });
    }

    if (data.chartVersionId !== data.snapshot.provenance.chartVersionId) {
      ctx.addIssue({
        code: "custom",
        path: ["chartVersionId"],
        message: `chartVersionId '${data.chartVersionId}' must match snapshot provenance chartVersionId '${data.snapshot.provenance.chartVersionId}'`,
      });
    }

    if (data.asOfDate !== data.snapshot.asOfDate) {
      ctx.addIssue({
        code: "custom",
        path: ["asOfDate"],
        message: `asOfDate '${data.asOfDate}' must match snapshot asOfDate '${data.snapshot.asOfDate}'`,
      });
    }

    if (data.targetYear !== data.snapshot.timing.annual.targetYear) {
      ctx.addIssue({
        code: "custom",
        path: ["targetYear"],
        message: `targetYear (${data.targetYear}) must match snapshot timing annual targetYear (${data.snapshot.timing.annual.targetYear})`,
      });
    }

    if (data.timingRuleVersion !== data.snapshot.timingRuleVersion) {
      ctx.addIssue({
        code: "custom",
        path: ["timingRuleVersion"],
        message: `timingRuleVersion '${data.timingRuleVersion}' must match snapshot timingRuleVersion '${data.snapshot.timingRuleVersion}'`,
      });
    }

    if (data.timingRuleVersion !== data.snapshot.provenance.timingRuleVersion) {
      ctx.addIssue({
        code: "custom",
        path: ["timingRuleVersion"],
        message: `timingRuleVersion '${data.timingRuleVersion}' must match snapshot provenance timingRuleVersion '${data.snapshot.provenance.timingRuleVersion}'`,
      });
    }

    if (data.sensitivityRuleVersion !== data.snapshot.sensitivityRuleVersion) {
      ctx.addIssue({
        code: "custom",
        path: ["sensitivityRuleVersion"],
        message: `sensitivityRuleVersion '${data.sensitivityRuleVersion}' must match snapshot sensitivityRuleVersion '${data.snapshot.sensitivityRuleVersion}'`,
      });
    }

    if (data.sensitivityRuleVersion !== data.snapshot.provenance.sensitivityRuleVersion) {
      ctx.addIssue({
        code: "custom",
        path: ["sensitivityRuleVersion"],
        message: `sensitivityRuleVersion '${data.sensitivityRuleVersion}' must match snapshot provenance sensitivityRuleVersion '${data.snapshot.provenance.sensitivityRuleVersion}'`,
      });
    }

    if (data.snapshotHash !== data.snapshot.provenance.snapshotHash) {
      ctx.addIssue({
        code: "custom",
        path: ["snapshotHash"],
        message: `snapshotHash '${data.snapshotHash}' must match snapshot provenance snapshotHash '${data.snapshot.provenance.snapshotHash}'`,
      });
    }
  });

export type ReportSourceSnapshotV1 = z.infer<typeof ReportSourceSnapshotV1Schema>;
export type { ZiweiReportSnapshotV1 };
