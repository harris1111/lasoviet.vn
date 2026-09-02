import { z } from "zod";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

function runtimeConfigFile(name: string): string {
  const workingDirectoryFile = resolve(process.cwd(), "config", name);
  if (existsSync(workingDirectoryFile)) {
    return workingDirectoryFile;
  }
  return resolve(process.cwd(), "..", "..", "config", name);
}

export const productCatalog = validateProductCatalog(
  JSON.parse(readFileSync(runtimeConfigFile("product-catalog.json"), "utf8")),
);
