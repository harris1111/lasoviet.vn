import { randomUUID } from "node:crypto";

import { and, desc, eq, gt, isNull } from "drizzle-orm";
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

export function createDatabaseCommerceRepository(database: Database) {
  return {
    async createOrder(actor: CurrentActor, chartId: string, sku: string) {
      if (!(sku in PRODUCT_CATALOG)) return { ok: false as const, code: "SKU_UNSUPPORTED" };
      const product = PRODUCT_CATALOG[sku as Sku];
      const accountError = await checkoutAccount(database, actor);
      if (accountError !== null) return { ok: false as const, code: accountError };
      if (actor.kind !== "account") throw new Error("CHECKOUT_ACTOR_INVALID");
      const [chart] = await database.select({
        chartId: ziweiCharts.id, chartVersionId: ziweiChartVersions.id,
      }).from(ziweiCharts)
        .innerJoin(birthProfiles, eq(birthProfiles.id, ziweiCharts.profileId))
        .innerJoin(ziweiChartVersions, eq(ziweiChartVersions.chartId, ziweiCharts.id))
        .where(and(eq(ziweiCharts.id, chartId), ownerFilter(actor, new Date()), isNull(birthProfiles.deletedAt)))
        .orderBy(desc(ziweiChartVersions.createdAt))
        .limit(1);
      if (chart === undefined) return { ok: false as const, code: "CHART_NOT_FOUND" };
      const [existing] = await database.select().from(commerceOrders)
        .where(and(eq(commerceOrders.chartId, chartId), eq(commerceOrders.sku, product.sku))).limit(1);
      if (existing !== undefined) return { ok: true as const, value: existing, reused: true };
      const id = randomUUID();
      const [created] = await database.insert(commerceOrders).values({
        id,
        invoiceNumber: `LSV-${id}`,
        chartId,
        chartVersionId: chart.chartVersionId,
        ownerId: actor.userId,
        sku: product.sku,
        amount: product.amount,
        currency: product.currency,
      }).onConflictDoNothing().returning();
      if (created !== undefined) return { ok: true as const, value: created, reused: false };
      const [concurrent] = await database.select().from(commerceOrders)
        .where(and(eq(commerceOrders.chartId, chartId), eq(commerceOrders.sku, product.sku))).limit(1);
      if (concurrent === undefined) throw new Error("COMMERCE_ORDER_CREATE_FAILED");
      return { ok: true as const, value: concurrent, reused: true };
    },

    async readOrder(actor: CurrentActor, orderId: string): Promise<OrderRecord | null> {
      if (await checkoutAccount(database, actor) !== null || actor.kind !== "account") {
        return null;
      }
      const [order] = await database.select().from(commerceOrders)
        .where(and(eq(commerceOrders.id, orderId), eq(commerceOrders.ownerId, actor.userId))).limit(1);
      return order ?? null;
    },

    async recordPaid(input: {
      invoiceNumber: string; providerEventId: string; amount: number; currency: string; traceId: string;
    }) {
      return database.transaction(async (transaction) => {
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
        const [paidOrder] = await transaction.update(commerceOrders)
          .set({ status: "paid", paidAt: new Date() })
          .where(and(eq(commerceOrders.id, order.id), eq(commerceOrders.status, "pending")))
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
        }).returning();
        if (entitlement === undefined) throw new Error("ENTITLEMENT_CREATE_FAILED");
        const [reservation] = await transaction.insert(reportReservations).values({
          reportId: randomUUID(), reportVersionId: randomUUID(), entitlementId: entitlement.id, chartVersionId: paidOrder.chartVersionId,
          evidenceVersionId: evidence.id, knowledgeVersionId: "ziwei.identity.knowledge.v1",
          promptVersion: "ziwei.identity.prompt.v1", reportConfigVersion: "ziwei.identity.report.v1",
          locale: "vi", sku: paidOrder.sku,
        }).returning();
        if (reservation === undefined) throw new Error("REPORT_RESERVATION_CREATE_FAILED");
        await enqueueOutbox(transaction, {
          schemaVersion: 1, type: "report.generation.requested.v1", eventId: randomUUID(),
          occurredAt: new Date().toISOString(), traceId: input.traceId, actorId: paidOrder.ownerId,
          aggregateType: "order", aggregateId: paidOrder.id,
          idempotencyKey: `report-request:${reservation.reportVersionId}`,
          payload: {
            reportId: reservation.reportId, reportVersionId: reservation.reportVersionId, entitlementId: entitlement.id,
            chartVersionId: reservation.chartVersionId, evidenceVersionId: reservation.evidenceVersionId,
            knowledgeVersionId: reservation.knowledgeVersionId, promptVersion: reservation.promptVersion,
            reportConfigVersion: reservation.reportConfigVersion, locale: reservation.locale, sku: reservation.sku,
          },
        });
        return { ok: true as const, replayed: false };
      });
    },
  };
}
