import { z } from "zod";
import { ZiweiPeriodReadingContentV1Schema, type ZiweiPeriodReadingContentV1 } from "./ziwei-period-reading-v1.js";

export const ZiweiPeriodReadingPublicContentV1Schema = ZiweiPeriodReadingContentV1Schema.extend({
  overview: z.object({ narrative: z.string().min(1) }).strict(),
  periods: z.array(z.object({ title: z.string().min(1), narrative: z.string().min(1), recommendations: z.array(z.string()).min(2).max(5), cautions: z.array(z.string()).min(1).max(5) }).strict()).min(1).max(14),
}).strict();
export type ZiweiPeriodReadingPublicContentV1 = z.infer<typeof ZiweiPeriodReadingPublicContentV1Schema>;
export function projectPeriodReadingPublicContent(content: ZiweiPeriodReadingContentV1): ZiweiPeriodReadingPublicContentV1 {
  return ZiweiPeriodReadingPublicContentV1Schema.parse({ ...content, overview: {narrative:content.overview.narrative}, periods: content.periods.map(({title,narrative,recommendations,cautions})=>({title,narrative,recommendations,cautions})) });
}
