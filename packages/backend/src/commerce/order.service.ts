import type { CommerceSku, CurrentActor } from "@lasoviet/contracts";
import { productCatalog } from "@lasoviet/config";

export type CatalogOffer = {
  readonly sku: CommerceSku;
  readonly amount: number;
  readonly currency: "VND";
  readonly capabilityId: "ziwei.identity.p0";
};

export type ProductSku = CommerceSku;

function buildProductCatalog(): Readonly<Record<CommerceSku, CatalogOffer>> {
  const offers = productCatalog.firstPaidOffers();
  const catalog: Partial<Record<CommerceSku, CatalogOffer>> = {};
  for (const offer of offers) {
    if (offer.sku === "ZIWEI-IDENTITY-P0" || offer.sku === "ZIWEI-NATAL-EXCERPT-P0") {
      catalog[offer.sku] = Object.freeze({
        sku: offer.sku,
        amount: offer.price,
        currency: offer.currency,
        capabilityId: "ziwei.identity.p0" as const,
      });
    }
  }
  return Object.freeze(catalog as Record<CommerceSku, CatalogOffer>);
}

export const PRODUCT_CATALOG: Readonly<Record<CommerceSku, CatalogOffer>> = buildProductCatalog();
type Chart = { id: string; ownerId: string; eligible: boolean };
export type CheckoutAccount = {
  emailVerified: boolean;
  isAnonymous: boolean;
} | null;

export type UpgradeCredit = {
  credit: number;
  sourceOrderId: string;
  creditExpiresAt: Date;
};

type Order = {
  id: string;
  invoiceNumber: string;
  chartId: string;
  sku: ProductSku;
  amount: number;
  currency: "VND";
  status: "pending";
  creditApplied?: number;
  creditedFromOrderId?: string | null;
  creditExpiresAt?: Date | null;
};

export type OrderServiceDependencies = {
  findCheckoutAccount(userId: string): Promise<CheckoutAccount>;
  findChart(chartId: string): Promise<Chart | null>;
  findReusableEntitlement(chartId: string, sku: ProductSku): Promise<{ id: string } | null>;
  findUpgradeCredit?(chartId: string, userId: string): Promise<UpgradeCredit | null>;
  save(order: Order): Promise<Order>;
  createId(): string;
};

export function checkoutAccountError(
  actor: CurrentActor,
  account: CheckoutAccount,
): "CHECKOUT_ACCOUNT_REQUIRED" | "CHECKOUT_EMAIL_VERIFICATION_REQUIRED" | null {
  if (actor.kind !== "account" || account === null || account.isAnonymous) {
    return "CHECKOUT_ACCOUNT_REQUIRED";
  }
  return account.emailVerified ? null : "CHECKOUT_EMAIL_VERIFICATION_REQUIRED";
}

export type OrderServiceOptions = {
  now?: () => Date;
};

export function createOrderService(
  dependencies: OrderServiceDependencies,
  options?: OrderServiceOptions,
) {
  const getNow = options?.now ?? (() => new Date());

  return {
    async create(actor: CurrentActor, chartId: string, sku: string) {
      if (!(sku in PRODUCT_CATALOG)) return { ok: false as const, error: { code: "SKU_UNSUPPORTED" } };
      const product = PRODUCT_CATALOG[sku as ProductSku];
      if (actor.kind !== "account") {
        return {
          ok: false as const,
          error: { code: "CHECKOUT_ACCOUNT_REQUIRED" },
        };
      }
      const account = await dependencies.findCheckoutAccount(actor.userId);
      const accountError = checkoutAccountError(actor, account);
      if (accountError !== null) return { ok: false as const, error: { code: accountError } };
      const chart = await dependencies.findChart(chartId);
      if (chart === null || chart.ownerId !== actor.userId) {
        return { ok: false as const, error: { code: "CHART_NOT_FOUND" } };
      }
      if (!chart.eligible) return { ok: false as const, error: { code: "CHART_INELIGIBLE" } };
      if (await dependencies.findReusableEntitlement(chartId, product.sku)) {
        return { ok: false as const, error: { code: "ENTITLEMENT_EXISTS" } };
      }
      if (
        product.sku === "ZIWEI-NATAL-EXCERPT-P0" &&
        (await dependencies.findReusableEntitlement(chartId, "ZIWEI-IDENTITY-P0"))
      ) {
        return { ok: false as const, error: { code: "ENTITLEMENT_EXISTS" } };
      }
      let amount = product.amount;
      let creditApplied = 0;
      let creditedFromOrderId: string | null = null;
      let creditExpiresAt: Date | null = null;

      const currentNow = getNow();

      if (product.sku === "ZIWEI-IDENTITY-P0" && dependencies.findUpgradeCredit) {
        const upgrade = await dependencies.findUpgradeCredit(chartId, actor.userId);
        if (
          upgrade &&
          upgrade.creditExpiresAt instanceof Date &&
          !Number.isNaN(upgrade.creditExpiresAt.getTime()) &&
          currentNow.getTime() < upgrade.creditExpiresAt.getTime()
        ) {
          creditApplied = Math.min(upgrade.credit, product.amount);
          creditedFromOrderId = upgrade.sourceOrderId;
          creditExpiresAt = upgrade.creditExpiresAt;
          amount = Math.max(product.amount - creditApplied, 0);
        }
      }

      const id = dependencies.createId();
      const value = await dependencies.save({
        id,
        invoiceNumber: `LSV-${id}`,
        chartId,
        sku: product.sku,
        amount,
        currency: product.currency,
        status: "pending",
        creditApplied,
        creditedFromOrderId,
        creditExpiresAt,
      });
      return { ok: true as const, value };
    },
  };
}
