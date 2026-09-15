import { z } from "zod";

const forbiddenPlaceholder = /\b(?:TODO|TBD|PLACEHOLDER|LOREM IPSUM)\b/i;

export const PublicContentV1Schema = z
  .object({
    routeId: z.string().trim().min(1),
    locale: z.enum(["vi", "en"]),
    contentType: z.enum([
      "Discipline",
      "ToolLanding",
      "KnowledgeHub",
      "KnowledgeArticle",
      "GlossaryTerm",
      "MethodologyPage",
      "SourceReference",
      "FAQEntry",
      "CommercialPage",
      "SampleReport",
      "AuthorProfile",
      "SeoMetadata",
      "ReusableBlock",
    ]),
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    reviewer: z.string().trim().min(1),
    sourceReferences: z.array(z.string().trim().min(1)).min(1),
    riskTags: z.array(z.string().trim().min(1)),
    status: z.enum(["draft", "reviewed", "published", "archived"]),
    lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    body: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((content, context) => {
    for (const field of ["title", "summary", "body"] as const) {
      const value = content[field];
      if (value !== undefined && forbiddenPlaceholder.test(value)) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "CONTENT_METADATA_INVALID",
        });
      }
    }
  });

export const publicContentSchema = PublicContentV1Schema;
export type PublicContentV1 = z.infer<typeof PublicContentV1Schema>;
