import { randomUUID } from "node:crypto";

import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import type { CurrentActor } from "@lasoviet/contracts";
import {
  birthProfiles,
  authUsers,
  commerceEntitlements,
  commerceOrders,
  commercePaymentEvents,
  enqueueOutbox,
  evidenceSets,
  reportReservations,
  type Database,
  ziweiChartVersions,
  ziweiCharts,
} from "@lasoviet/database";

import { checkoutAccountError, PRODUCT_CATALOG } from "./order.service.js";

type Sku = keyof typeof PRODUCT_CATALOG;
type OrderRecord = typeof commerceOrders.$inferSelect;
type CheckoutLocale = "vi" | "en";

export type CommerceRepositoryOptions = {
  now?: () => Date;
  orderTtlSeconds?: number;
  beforePaymentCommit?: () => Promise<void>;
};

export type OwnedOrderProjection = {
  order: typeof commerceOrders.$inferSelect;
  reportId: string | null;
};

function ownerFilter(actor: CurrentActor, now: Date) {
  return actor.kind === "account"
    ? eq(birthProfiles.userId, actor.userId)
    : and(eq(birthProfiles.anonymousActorId, actor.anonymousActorId), gt(birthProfiles.anonymousExpiresAt, now));
}

async function checkoutAccount(
  database: Database,
  actor: CurrentActor,
) {
  if (actor.kind !== "account") return "CHECKOUT_ACCOUNT_REQUIRED" as const;
  const [account] = await database.select({
    emailVerified: authUsers.emailVerified,
    isAnonymous: authUsers.isAnonymous,
  }).from(authUsers).where(eq(authUsers.id, actor.userId)).limit(1);
  return checkoutAccountError(actor, account ?? null);
}

function checkoutLocale(locale: string): CheckoutLocale | null {
  return locale === "vi" || locale === "en" ? locale : null;
}

export function createDatabaseCommerceRepository(
  database: Database,
  options: CommerceRepositoryOptions = {},
) {
  const orderTtlSeconds = options.orderTtlSeconds ?? 900;
  const getNow = options.now ?? (() => new Date());

  async function getOwnedOrderWithExpiry(actor: CurrentActor, orderId: string): Promise<OrderRecord | null> {
    if (await checkoutAccount(database, actor) !== null || actor.kind !== "account") {
      return null;
    }
    let [order] = await database.select().from(commerceOrders)
      .where(and(eq(commerceOrders.id, orderId), eq(commerceOrders.ownerId, actor.userId))).limit(1);
    if (order === undefined) return null;

    const currentNow = getNow();
    const cutoff = new Date(currentNow.getTime() - orderTtlSeconds * 1000);
    if (order.status === "pending" && order.createdAt.getTime() <= cutoff.getTime()) {
      const [expired] = await database.update(commerceOrders)
        .set({ status: "expired" })
        .where(and(
          eq(commerceOrders.id, order.id),
          eq(commerceOrders.status, "pending"),
          lte(commerceOrders.createdAt, cutoff),
        ))
        .returning();
      if (expired !== undefined) {
        order = expired;
      } else {
        const [fresh] = await database.select().from(commerceOrders)
          .where(eq(commerceOrders.id, order.id)).limit(1);
        if (fresh !== undefined) {
          order = fresh;
        }
      }
    }
    return order;
  }

  return {
    async createOrder(actor: CurrentActor, chartId: string, sku: string, locale: string) {
      if (!(sku in PRODUCT_CATALOG)) return { ok: false as const, code: "SKU_UNSUPPORTED" };
      const selectedLocale = checkoutLocale(locale);
      if (selectedLocale === null) return { ok: false as const, code: "CHECKOUT_LOCALE_INVALID" };
      const product = PRODUCT_CATALOG[sku as Sku];
      const accountError = await checkoutAccount(database, actor);
      if (accountError !== null) return { ok: false as const, code: accountError };
      if (actor.kind !== "account") throw new Error("CHECKOUT_ACTOR_INVALID");

      const currentNow = getNow();
      const cutoff = new Date(currentNow.getTime() - orderTtlSeconds * 1000);

      const [chart] = await database.select({
        chartId: ziweiCharts.id, chartVersionId: ziweiChartVersions.id,
      }).from(ziweiCharts)
        .innerJoin(birthProfiles, eq(birthProfiles.id, ziweiCharts.profileId))
        .innerJoin(ziweiChartVersions, eq(ziweiChartVersions.chartId, ziweiCharts.id))
        .where(and(eq(ziweiCharts.id, chartId), ownerFilter(actor, currentNow), isNull(birthProfiles.deletedAt)))
        .orderBy(desc(ziweiChartVersions.createdAt))
        .limit(1);
      if (chart === undefined) return { ok: false as const, code: "CHART_NOT_FOUND" };

      const [existing] = await database.select().from(commerceOrders)
        .where(and(eq(commerceOrders.chartId, chartId), eq(commerceOrders.sku, product.sku))).limit(1);
      if (existing !== undefined) {
        if (
          existing.status === "expired" ||
          existing.status === "failed" ||
          (existing.status === "pending" && existing.createdAt.getTime() <= cutoff.getTime())
        ) {
          const [reopened] = await database.update(commerceOrders)
            .set({
              status: "pending",
              paidAt: null,
              createdAt: currentNow,
              chartVersionId: chart.chartVersionId,
              locale: selectedLocale,
            })
            .where(and(
              eq(commerceOrders.id, existing.id),
              or(
                inArray(commerceOrders.status, ["expired", "failed"]),
                and(eq(commerceOrders.status, "pending"), lte(commerceOrders.createdAt, cutoff)),
              ),
            ))
            .returning();
          if (reopened !== undefined) {
            return { ok: true as const, value: reopened, reused: true };
          }
          const [current] = await database.select().from(commerceOrders)
            .where(eq(commerceOrders.id, existing.id)).limit(1);
          if (current === undefined) throw new Error("COMMERCE_ORDER_CREATE_FAILED");
          return { ok: true as const, value: current, reused: true };
        }
        return { ok: true as const, value: existing, reused: true };
      }

      const id = randomUUID();
      const [created] = await database.insert(commerceOrders).values({
        id,
        invoiceNumber: "LSV-" + id,
        chartId,
        chartVersionId: chart.chartVersionId,
        ownerId: actor.userId,
        sku: product.sku,
        amount: product.amount,
        currency: product.currency,
        locale: selectedLocale,
        createdAt: currentNow,
      }).onConflictDoNothing().returning();
      if (created !== undefined) return { ok: true as const, value: created, reused: false };

      const [concurrent] = await database.select().from(commerceOrders)
        .where(and(eq(commerceOrders.chartId, chartId), eq(commerceOrders.sku, product.sku))).limit(1);
      if (concurrent === undefined) throw new Error("COMMERCE_ORDER_CREATE_FAILED");
      if (
        concurrent.status === "expired" ||
        concurrent.status === "failed" ||
        (concurrent.status === "pending" && concurrent.createdAt.getTime() <= cutoff.getTime())
      ) {
        const [reopened] = await database.update(commerceOrders)
          .set({
            status: "pending",
            paidAt: null,
            createdAt: currentNow,
            chartVersionId: chart.chartVersionId,
            locale: selectedLocale,
          })
          .where(and(
            eq(commerceOrders.id, concurrent.id),
            or(
              inArray(commerceOrders.status, ["expired", "failed"]),
              and(eq(commerceOrders.status, "pending"), lte(commerceOrders.createdAt, cutoff)),
            ),
          ))
          .returning();
        if (reopened !== undefined) {
          return { ok: true as const, value: reopened, reused: true };
        }
        const [current] = await database.select().from(commerceOrders)
          .where(eq(commerceOrders.id, concurrent.id)).limit(1);
        if (current === undefined) throw new Error("COMMERCE_ORDER_CREATE_FAILED");
        return { ok: true as const, value: current, reused: true };
      }
      return { ok: true as const, value: concurrent, reused: true };
    },

    async readOrder(actor: CurrentActor, orderId: string): Promise<OrderRecord | null> {
      return getOwnedOrderWithExpiry(actor, orderId);
    },

    async readOrderProjection(actor: CurrentActor, orderId: string): Promise<OwnedOrderProjection | null> {
      const order = await getOwnedOrderWithExpiry(actor, orderId);
      if (order === null) return null;

      let reportId: string | null = null;
      if (order.status === "paid") {
        const [reservation] = await database.select({ reportId: reportReservations.reportId })
          .from(commerceEntitlements)
          .innerJoin(reportReservations, eq(reportReservations.entitlementId, commerceEntitlements.id))
          .where(and(eq(commerceEntitlements.orderId, order.id), eq(commerceEntitlements.ownerId, order.ownerId)))
          .limit(1);
        reportId = reservation?.reportId ?? null;
      }

      return { order, reportId };
    },

    async recordPaid(input: {
      invoiceNumber: string; providerEventId: string; amount: number; currency: string; traceId: string;
    }) {
      return database.transaction(async (transaction) => {
        const currentNow = getNow();
        const cutoff = new Date(currentNow.getTime() - orderTtlSeconds * 1000);

        const [order] = await transaction.select().from(commerceOrders)
          .where(eq(commerceOrders.invoiceNumber, input.invoiceNumber)).limit(1);
        if (order === undefined) return { ok: false as const, code: "ORDER_NOT_FOUND" };
        if (order.amount !== input.amount || order.currency !== input.currency) {
          return { ok: false as const, code: "PAYMENT_AMOUNT_MISMATCH" };
        }
        const [prior] = await transaction.select().from(commercePaymentEvents)
          .where(eq(commercePaymentEvents.providerEventId, input.providerEventId)).limit(1);
        if (prior !== undefined) {
          return prior.orderId === order.id
            ? { ok: true as const, replayed: true }
            : { ok: false as const, code: "PAYMENT_EVENT_CONFLICT" };
        }

        if (order.status !== "pending" || order.createdAt.getTime() <= cutoff.getTime()) {
          if (order.status === "pending") {
            await transaction.update(commerceOrders)
              .set({ status: "expired" })
              .where(and(
                eq(commerceOrders.id, order.id),
                eq(commerceOrders.status, "pending"),
                lte(commerceOrders.createdAt, cutoff),
              ));
          }
          return { ok: false as const, code: "PAYMENT_STATE_CONFLICT" };
        }

        const [paidOrder] = await transaction.update(commerceOrders)
          .set({ status: "paid", paidAt: currentNow })
          .where(and(
            eq(commerceOrders.id, order.id),
            eq(commerceOrders.status, "pending"),
            gt(commerceOrders.createdAt, cutoff),
          ))
          .returning();
        if (paidOrder === undefined) {
          const [replayed] = await transaction.select().from(commercePaymentEvents)
            .where(eq(commercePaymentEvents.providerEventId, input.providerEventId)).limit(1);
          return replayed?.orderId === order.id
            ? { ok: true as const, replayed: true }
            : { ok: false as const, code: "PAYMENT_STATE_CONFLICT" };
        }
        const [event] = await transaction.insert(commercePaymentEvents).values({
          orderId: order.id, providerEventId: input.providerEventId, amount: input.amount, currency: input.currency, status: "ORDER_PAID",
          createdAt: currentNow,
        }).onConflictDoNothing().returning();
        if (event === undefined) {
          const [replayed] = await transaction.select().from(commercePaymentEvents)
            .where(eq(commercePaymentEvents.providerEventId, input.providerEventId)).limit(1);
          if (replayed?.orderId === order.id) return { ok: true as const, replayed: true };
          throw new Error("PAYMENT_EVENT_CONFLICT");
        }
        const [evidence] = await transaction.select({ id: evidenceSets.id })
          .from(evidenceSets)
          .where(and(eq(evidenceSets.chartVersionId, paidOrder.chartVersionId), eq(evidenceSets.capabilityId, "ziwei.identity.p0")))
          .limit(1);
        if (evidence === undefined) throw new Error("EVIDENCE_VERSION_MISSING");
        const [entitlement] = await transaction.insert(commerceEntitlements).values({
          orderId: paidOrder.id, chartId: paidOrder.chartId, sku: paidOrder.sku, ownerId: paidOrder.ownerId,
          createdAt: currentNow,
        }).returning();
        if (entitlement === undefined) throw new Error("ENTITLEMENT_CREATE_FAILED");
        const [reservation] = await transaction.insert(reportReservations).values({
          reportId: randomUUID(), reportVersionId: randomUUID(), entitlementId: entitlement.id, chartVersionId: paidOrder.chartVersionId,
          evidenceVersionId: evidence.id, knowledgeVersionId: "ziwei.identity.knowledge.v1",
          promptVersion: "ziwei.identity.prompt.v1", reportConfigVersion: "ziwei.identity.report.v1",
          locale: paidOrder.locale, sku: paidOrder.sku,
          createdAt: currentNow, updatedAt: currentNow,
        }).returning();
        if (reservation === undefined) throw new Error("REPORT_RESERVATION_CREATE_FAILED");
        await enqueueOutbox(transaction, {
          schemaVersion: 1, type: "report.generation.requested.v1", eventId: randomUUID(),
          occurredAt: currentNow.toISOString(), traceId: input.traceId, actorId: paidOrder.ownerId,
          aggregateType: "order", aggregateId: paidOrder.id,
          idempotencyKey: "report-request:" + reservation.reportVersionId,
          payload: {
            reportId: reservation.reportId, reportVersionId: reservation.reportVersionId, entitlementId: entitlement.id,
            chartVersionId: reservation.chartVersionId, evidenceVersionId: reservation.evidenceVersionId,
            knowledgeVersionId: reservation.knowledgeVersionId, promptVersion: reservation.promptVersion,
            reportConfigVersion: reservation.reportConfigVersion, locale: reservation.locale, sku: reservation.sku,
          },
        });
        await options.beforePaymentCommit?.();
        return { ok: true as const, replayed: false };
      });
    },
  };
}
