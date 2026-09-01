import { z } from "zod";

import rawProductCatalog from "../../../config/product-catalog.json" with { type: "json" };

const productSchema = z.object({
  sku: z.string().regex(/^ZIWEI-[A-Z]+-P0$/),
  name: z.string().trim().min(1),
  method: z.literal("ziwei"),
  price: z.number().int().positive(),
  phase: z.string().trim().min(1),
  availability: z.enum(["first_paid_flow", "reserved"]),
  sections: z.array(z.string().trim().min(1)).min(1),
}).strict();

const productCatalogSchema = z.object({
  currency: z.literal("VND"),
  pricing_status: z.string().trim().min(1),
  products: z.array(productSchema).min(1),
}).strict();

export type ProductCatalogProduct = z.infer<typeof productSchema> & {
  currency: "VND";
};

export type ProductCatalog = {
  firstPaidOffers(): readonly ProductCatalogProduct[];
  findSelectableOffer(sku: string): ProductCatalogProduct | undefined;
};

export function validateProductCatalog(source: unknown): ProductCatalog {
  const parsed = productCatalogSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("PRODUCT_CATALOG_INVALID");
  }
  const { currency, products } = parsed.data;
  const skus = products.map((product) => product.sku);
  if (new Set(skus).size !== skus.length) {
    throw new Error("PRODUCT_CATALOG_INVALID");
  }
  const firstPaid = products.filter((product) => product.availability === "first_paid_flow");
  if (
    firstPaid.length !== 1 ||
    firstPaid[0]?.sku !== "ZIWEI-IDENTITY-P0" ||
    firstPaid[0]?.price !== 79000
  ) {
    throw new Error("PRODUCT_CATALOG_INVALID");
  }
  const catalogProducts = products.map((product) => ({ ...product, currency })) as ProductCatalogProduct[];

  return {
    firstPaidOffers: () => catalogProducts.filter(
      (product) => product.availability === "first_paid_flow",
    ),
    findSelectableOffer: (sku) => catalogProducts.find(
      (product) => product.sku === sku && product.availability === "first_paid_flow",
    ),
  };
}

export const productCatalog = validateProductCatalog(rawProductCatalog);
