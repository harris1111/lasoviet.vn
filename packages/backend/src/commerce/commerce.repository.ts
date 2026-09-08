import { randomUUID } from "node:crypto";

import { and, desc, eq, gt, isNull, lte, ne, or, sql } from "drizzle-orm";
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
import { currentReportVersions } from "../reports/identity-report-config.js";

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
  const orderTtlSeconds = options.orderTtlSeconds ?? 86400;
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

      return database.transaction(async (transaction) => {
        const lockKey = `commerce:${chartId}:${product.sku}`;
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

        const currentNow = getNow();
        const cutoff = new Date(currentNow.getTime() - orderTtlSeconds * 1000);

        const [chart] = await transaction.select({
          chartId: ziweiCharts.id, chartVersionId: ziweiChartVersions.id,
        }).from(ziweiCharts)
          .innerJoin(birthProfiles, eq(birthProfiles.id, ziweiCharts.profileId))
          .innerJoin(ziweiChartVersions, eq(ziweiChartVersions.chartId, ziweiCharts.id))
          .where(and(eq(ziweiCharts.id, chartId), ownerFilter(actor, currentNow), isNull(birthProfiles.deletedAt)))
          .orderBy(desc(ziweiChartVersions.createdAt))
          .limit(1);
        if (chart === undefined) return { ok: false as const, code: "CHART_NOT_FOUND" };

        const existingOrders = await transaction.select().from(commerceOrders)
          .where(and(
            eq(commerceOrders.chartId, chartId),
            eq(commerceOrders.sku, product.sku),
          ))
          .orderBy(desc(commerceOrders.createdAt))
          .for("update");

        const paidOrder = existingOrders.find((o) => o.status === "paid");
        if (paidOrder !== undefined) {
          return { ok: true as const, value: paidOrder, reused: true };
        }

        const refundedOrder = existingOrders.find((o) => o.status === "refunded");
        if (refundedOrder !== undefined) {
          return { ok: true as const, value: refundedOrder, reused: true };
        }

        const pendingOrder = existingOrders.find((o) => o.status === "pending");
        if (pendingOrder !== undefined) {
          if (pendingOrder.createdAt.getTime() > cutoff.getTime()) {
            return { ok: true as const, value: pendingOrder, reused: true };
          }
          await transaction.update(commerceOrders)
            .set({ status: "expired" })
            .where(eq(commerceOrders.id, pendingOrder.id));
        }

        const id = randomUUID();
        const [created] = await transaction.insert(commerceOrders).values({
          id,
          invoiceNumber: "LSV-" + id,
          chartId,
          chartVersionId: chart.chartVersionId,
          ownerId: actor.userId,
          sku: product.sku,
          amount: product.amount,
          currency: product.currency,
          locale: selectedLocale,
          status: "pending",
          createdAt: currentNow,
        }).onConflictDoNothing().returning();

        if (created !== undefined) {
          return { ok: true as const, value: created, reused: false };
        }

        const [concurrentPending] = await transaction.select().from(commerceOrders)
          .where(and(
            eq(commerceOrders.chartId, chartId),
            eq(commerceOrders.sku, product.sku),
            eq(commerceOrders.status, "pending"),
          ))
          .orderBy(desc(commerceOrders.createdAt))
          .limit(1);

        if (concurrentPending !== undefined) {
          return { ok: true as const, value: concurrentPending, reused: true };
        }

        throw new Error("COMMERCE_ORDER_CREATE_FAILED");
      });
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
      try {
        return await database.transaction(async (transaction) => {
          const currentNow = getNow();

          const [target] = await transaction.select({
            chartId: commerceOrders.chartId,
            sku: commerceOrders.sku,
          }).from(commerceOrders)
            .where(eq(commerceOrders.invoiceNumber, input.invoiceNumber))
            .limit(1);
          if (target === undefined) return { ok: false as const, code: "ORDER_NOT_FOUND" };

          const lockKey = `commerce:${target.chartId}:${target.sku}`;
          await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

          const [order] = await transaction.select().from(commerceOrders)
            .where(eq(commerceOrders.invoiceNumber, input.invoiceNumber))
            .limit(1)
            .for("update");
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

        if (order.status === "paid" || order.status === "refunded") {
          return { ok: false as const, code: "PAYMENT_STATE_CONFLICT" };
        }

        const [existingEntitlement] = await transaction.select({ id: commerceEntitlements.id })
          .from(commerceEntitlements)
          .where(and(
            eq(commerceEntitlements.chartId, order.chartId),
            eq(commerceEntitlements.sku, order.sku),
          ))
          .limit(1);
        if (existingEntitlement !== undefined) {
          return { ok: false as const, code: "PAYMENT_STATE_CONFLICT" };
        }

        if (order.status !== "pending" && order.status !== "expired") {
          return { ok: false as const, code: "PAYMENT_STATE_CONFLICT" };
        }

        // Cancel/expire any replacement pending order for the same chart+sku
        await transaction.update(commerceOrders)
          .set({ status: "expired" })
          .where(and(
            eq(commerceOrders.chartId, order.chartId),
            eq(commerceOrders.sku, order.sku),
            eq(commerceOrders.status, "pending"),
            ne(commerceOrders.id, order.id),
          ));

        const [paidOrder] = await transaction.update(commerceOrders)
          .set({ status: "paid", paidAt: currentNow })
          .where(and(
            eq(commerceOrders.id, order.id),
            or(eq(commerceOrders.status, "pending"), eq(commerceOrders.status, "expired")),
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
        const reportVersions = currentReportVersions(paidOrder.locale);
        const [reservation] = await transaction.insert(reportReservations).values({
          reportId: randomUUID(), reportVersionId: randomUUID(), entitlementId: entitlement.id, chartVersionId: paidOrder.chartVersionId,
          evidenceVersionId: evidence.id, knowledgeVersionId: reportVersions.knowledgeVersion,
          promptVersion: reportVersions.promptVersion, reportConfigVersion: reportVersions.reportConfigVersion,
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
    } catch (error: unknown) {
      const pgError = error as { code?: string; message?: string };
      if (
        pgError?.code === "23505" ||
        pgError?.message?.includes("commerce_entitlements") ||
        pgError?.message?.includes("PAYMENT_STATE_CONFLICT")
      ) {
        return { ok: false as const, code: "PAYMENT_STATE_CONFLICT" };
      }
      throw error;
    }
  },
  };
}
