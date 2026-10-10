import { z } from "zod";
import { CANONICAL_PALACE_SKU_MAP, findLaProduct } from "./la-catalog.js";
import { PalaceIdSchema } from "./normalized-ziwei-chart-v1.js";

const opaqueId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);

/** A transport shape only. Parsing never proves that a chart was publicly displayed. */
export const FreeChartRecoverySourceV1Schema = z.object({
  version: z.literal(1),
  kind: z.literal("displayed-free-chart"),
  userId: opaqueId,
  chartId: opaqueId,
  chartVersionId: opaqueId,
  locale: z.enum(["vi", "en"]),
  contentSha256: sha256,
  rendererVersion: z.string().min(1).max(128),
  rendererSha256: sha256,
  teaserText: z.string().min(1).max(4000),
  teaserSha256: sha256,
  viewReceiptSha256: sha256,
  firstViewedAt: z.iso.datetime(),
  offerKey: z.enum(["ziwei-palace", "ziwei-comprehensive"]),
  productSku: z.string().min(1).max(128),
  palaceId: PalaceIdSchema,
  anchor: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/),
}).strict().superRefine((source, context) => {
  const product = findLaProduct(source.productSku);
  const sku = source.offerKey === "ziwei-palace"
    ? CANONICAL_PALACE_SKU_MAP[source.palaceId] : "ZIWEI-IDENTITY-P0";
  if (source.productSku !== sku || !product || product.availability !== "active" ||
      !product.locales.includes(source.locale)) {
    context.addIssue({ code: "custom", path: ["productSku"], message: "Unsupported recovery offer" });
  }
});

export type FreeChartRecoverySourceV1 = z.infer<typeof FreeChartRecoverySourceV1Schema>;
