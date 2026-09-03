import type { CurrentActor } from "@lasoviet/contracts";

export const PRODUCT_CATALOG = {
  "ZIWEI-IDENTITY-P0": {
    sku: "ZIWEI-IDENTITY-P0",
    amount: 79_000,
    currency: "VND" as const,
    capabilityId: "ziwei.identity.p0",
  },
} as const;

type ProductSku = keyof typeof PRODUCT_CATALOG;
type Chart = { id: string; ownerId: string; eligible: boolean };
type Order = {
  id: string;
  invoiceNumber: string;
  chartId: string;
  sku: ProductSku;
  amount: number;
  currency: "VND";
  status: "pending";
};

export type OrderServiceDependencies = {
  findChart(chartId: string): Promise<Chart | null>;
  findReusableEntitlement(chartId: string, sku: ProductSku): Promise<{ id: string } | null>;
  save(order: Order): Promise<Order>;
  createId(): string;
};

function actorId(actor: CurrentActor): string {
  return actor.kind === "account" ? actor.userId : actor.anonymousActorId;
}

export function createOrderService(dependencies: OrderServiceDependencies) {
  return {
    async create(actor: CurrentActor, chartId: string, sku: string) {
      if (!(sku in PRODUCT_CATALOG)) return { ok: false as const, error: { code: "SKU_UNSUPPORTED" } };
      const product = PRODUCT_CATALOG[sku as ProductSku];
      const chart = await dependencies.findChart(chartId);
      if (chart === null || chart.ownerId !== actorId(actor)) {
        return { ok: false as const, error: { code: "CHART_NOT_FOUND" } };
      }
      if (!chart.eligible) return { ok: false as const, error: { code: "CHART_INELIGIBLE" } };
      if (await dependencies.findReusableEntitlement(chartId, product.sku)) {
        return { ok: false as const, error: { code: "ENTITLEMENT_EXISTS" } };
      }
      const id = dependencies.createId();
      const value = await dependencies.save({
        id,
        invoiceNumber: `LSV-${id}`,
        chartId,
        sku: product.sku,
        amount: product.amount,
        currency: product.currency,
        status: "pending",
      });
      return { ok: true as const, value };
    },
  };
}
