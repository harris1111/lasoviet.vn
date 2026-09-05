import { z } from "zod";

export const routeStateSchema = z.enum([
  "reserved",
  "preview_noindex",
  "live_noindex",
  "live_indexable",
  "archived",
]);

export const RouteStateSchema = routeStateSchema;
export type RouteState = z.infer<typeof routeStateSchema>;

const localeSchema = z.enum(["vi", "en"]);

export const RouteDefinitionV1Schema = z
  .object({
    id: z.string().trim().min(1),
    path: z.string().trim().startsWith("/"),
    intent: z.string().trim().min(1),
    template: z.string().trim().min(1),
    discipline: z.string().trim().min(1).optional(),
    localeBehavior: z.string().trim().min(1),
    localeOwners: z.array(localeSchema).min(1),
    owner: z.string().trim().min(1),
    indexing: z.enum(["index_follow", "noindex_follow", "noindex_nofollow", "redirect"]),
    canonical: z.union([z.literal("self"), z.string().trim().min(1)]),
    robots: z.string().trim().min(1),
    schemaTypes: z.array(z.string().trim().min(1)),
    redirect: z
      .object({
        disposition: z.enum(["none", "301", "404", "410"]),
        target: z.string().trim().startsWith("/").optional(),
      })
      .strict(),
    priority: z.enum(["p0", "p1", "p2"]).optional(),
    status: routeStateSchema,
    sitemap: z.boolean(),
    private: z.boolean(),
    purchasable: z.boolean(),
    sku: z.string().trim().min(1).optional(),
    content: z.string().trim().min(1).optional(),
    reviewer: z.string().trim().min(1).optional(),
  })
  .strict();

export type RouteDefinitionV1 = z.infer<typeof RouteDefinitionV1Schema>;
