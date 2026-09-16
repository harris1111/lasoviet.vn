import { ZiweiComprehensiveReportBirthTimeSensitivityV2Schema, ZiweiComprehensiveReportContentV2Schema } from "./ziwei-comprehensive-report-v2.js";
import { z } from "zod";

export const ZiweiComprehensiveReportContentV3Schema =
  ZiweiComprehensiveReportContentV2Schema.extend({
    birthTimeSensitivity: ZiweiComprehensiveReportBirthTimeSensitivityV2Schema,
  }).strict();

export type ZiweiComprehensiveReportContentV3 = z.infer<
  typeof ZiweiComprehensiveReportContentV3Schema
>;
