import { z } from "zod";
import { PalaceIdSchema } from "./normalized-ziwei-chart-v1.js";
const prose = z.string().trim().min(1).max(6000);
export const FreeStructuralOverviewDocV1Schema = z.object({
    version: z.literal(1), sourceKind: z.literal("structural"), locale: z.enum(["vi", "en"]),
    sections: z.array(z.object({ id: z.string().regex(/^[a-z-]+$/u), title: prose, paragraphs: z.array(prose).min(1).max(4) }).strict()).min(8).max(12),
}).strict().superRefine((doc, ctx) => {
    const count = doc.sections.flatMap(s => s.paragraphs).join(" ").trim().split(/\s+/u).length;
    if (count < 900 || count > 1800)
        ctx.addIssue({ code: "custom", path: ["sections"], message: "Structural overview must contain 900–1800 words" });
    if (new Set(doc.sections.map(s => s.id)).size !== doc.sections.length)
        ctx.addIssue({ code: "custom", path: ["sections"], message: "Overview section identities must be unique" });
});
export const FreeStructuralPalaceDocV1Schema = z.object({
    version: z.literal(1), sourceKind: z.literal("structural"), palaceId: PalaceIdSchema, locale: z.enum(["vi", "en"]),
    title: prose, conclusion: prose, keyPoints: z.array(prose).min(2).max(4), paragraphs: z.array(prose).min(3).max(6),
    do: z.array(prose).min(2).max(4), avoid: z.array(prose).min(2).max(4),
}).strict();
export type FreeStructuralOverviewDocV1 = z.infer<typeof FreeStructuralOverviewDocV1Schema>;
export type FreeStructuralPalaceDocV1 = z.infer<typeof FreeStructuralPalaceDocV1Schema>;
export const FreeStructuralOverviewCacheV1Schema = z.object({
    version: z.literal(1), rendererVersion: z.string().min(1),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/u), contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
    documents: z.object({ vi: FreeStructuralOverviewDocV1Schema, en: FreeStructuralOverviewDocV1Schema }).strict(),
}).strict().superRefine((cache, ctx) => {
    if (cache.documents.vi.locale !== "vi" || cache.documents.en.locale !== "en")
        ctx.addIssue({ code: "custom", path: ["documents"], message: "Cache locale identities must match" });
});
export type FreeStructuralOverviewCacheV1 = z.infer<typeof FreeStructuralOverviewCacheV1Schema>;
