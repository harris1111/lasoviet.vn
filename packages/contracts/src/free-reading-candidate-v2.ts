import { z } from "zod";
import { FreeReadingContentV2Schema } from "./free-reading-v2.js";

const status = z.enum(["ai", "rule_v2"]);
export const FreeReadingCandidateV2Schema = z.object({
  version: z.literal(2), status: z.literal("draft"), manualAccepted: z.literal(false),
  locale: z.enum(["vi", "en"]), content: FreeReadingContentV2Schema,
  sections: z.object({
    overview: status, focusPalace: status,
    teasers: z.array(z.object({ targetKey: z.string(), status }).strict()).min(1).max(13),
    yearHook: status,
  }).strict(),
  versions: z.object({ prompt: z.string().min(1), schema: z.string().min(1),
    cards: z.string().min(1), quality: z.string().min(1), rules: z.string().min(1) }).strict(),
}).strict().superRefine((value, ctx) => {
  if (value.sections.teasers.length !== value.content.teasers.length ||
      value.sections.teasers.some((item, i) => item.targetKey !== value.content.teasers[i]!.targetKey) ||
      new Set(value.sections.teasers.map(item => item.targetKey)).size !== value.sections.teasers.length) {
    ctx.addIssue({ code: "custom", message: "Section status must bind the exact content target sequence" });
  }
});
export type FreeReadingCandidateV2 = z.infer<typeof FreeReadingCandidateV2Schema>;
