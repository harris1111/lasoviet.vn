import { randomUUID } from "node:crypto";

import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { CurrentActor } from "@lasoviet/contracts";
import {
  birthProfiles,
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

import { PRODUCT_CATALOG } from "./order.service.js";

type Sku = keyof typeof PRODUCT_CATALOG;
type OrderRecord = typeof commerceOrders.$inferSelect;

function ownerId(actor: CurrentActor): string {
  return actor.kind === "account" ? actor.userId : actor.anonymousActorId;
}

function ownerFilter(actor: CurrentActor, now: Date) {
  return actor.kind === "account"
    ? eq(birthProfiles.userId, actor.userId)
    : and(eq(birthProfiles.anonymousActorId, actor.anonymousActorId), gt(birthProfiles.anonymousExpiresAt, now));
}

export function createDatabaseCommerceRepository(database: Database) {
  return {
    async createOrder(actor: CurrentActor, chartId: string, sku: string) {
      if (!(sku in PRODUCT_CATALOG)) return { ok: false as const, code: "SKU_UNSUPPORTED" };
      const product = PRODUCT_CATALOG[sku as Sku];
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
        ownerId: ownerId(actor),
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
      const [order] = await database.select().from(commerceOrders)
        .where(and(eq(commerceOrders.id, orderId), eq(commerceOrders.ownerId, ownerId(actor)))).limit(1);
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
        if (order.status !== "pending") return { ok: false as const, code: "PAYMENT_STATE_CONFLICT" };
        const [event] = await transaction.insert(commercePaymentEvents).values({
          orderId: order.id, providerEventId: input.providerEventId, amount: input.amount, currency: input.currency, status: "ORDER_PAID",
        }).onConflictDoNothing().returning();
        if (event === undefined) {
          const [replayed] = await transaction.select().from(commercePaymentEvents)
            .where(eq(commercePaymentEvents.providerEventId, input.providerEventId)).limit(1);
          if (replayed?.orderId === order.id) return { ok: true as const, replayed: true };
          throw new Error("PAYMENT_EVENT_CONFLICT");
        }
        await transaction.update(commerceOrders).set({ status: "paid", paidAt: new Date() })
          .where(eq(commerceOrders.id, order.id));
        const [entitlement] = await transaction.insert(commerceEntitlements).values({
          orderId: order.id, chartId: order.chartId, sku: order.sku, ownerId: order.ownerId,
        }).returning();
        if (entitlement === undefined) throw new Error("ENTITLEMENT_CREATE_FAILED");
        const [reservation] = await transaction.insert(reportReservations).values({
          reportId: randomUUID(), reportVersionId: randomUUID(), entitlementId: entitlement.id, chartVersionId: order.chartVersionId,
        }).returning();
        if (reservation === undefined) throw new Error("REPORT_RESERVATION_CREATE_FAILED");
        await enqueueOutbox(transaction, {
          schemaVersion: 1, type: "report.generation.requested.v1", eventId: randomUUID(),
          occurredAt: new Date().toISOString(), traceId: input.traceId, actorId: order.ownerId,
          aggregateType: "order", aggregateId: order.id,
          idempotencyKey: `report-request:${reservation.reportVersionId}`,
          payload: { reportReservationId: reservation.id, reportId: reservation.reportId, reportVersionId: reservation.reportVersionId, entitlementId: entitlement.id, chartVersionId: order.chartVersionId },
        });
        return { ok: true as const, replayed: false };
      });
    },
  };
}
