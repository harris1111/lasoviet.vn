import { randomUUID } from "node:crypto";

import { and, desc, eq, gt, gte, inArray, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import type {
  AccountLibraryGroupV1,
  AccountLibraryItemV1,
  AccountLibraryV1,
  CommerceSku,
  CurrentActor,
  OrderHistoryItemV1,
  OrderHistoryV1,
  OrderStatus,
} from "@lasoviet/contracts";
import { resolveProductTitle } from "@lasoviet/contracts";
import {
  auditLogs,
  birthProfiles,
  birthProfileRevisions,
  authUsers,
  commerceEntitlements,
  commerceOrders,
  commercePaymentEvents,
  commerceReconciliationState,
  commerceUnmatchedPayments,
  enqueueOutbox,
  evidenceSets,
  reportReservations,
  reportVersions,
  type Database,
  ziweiChartVersions,
  ziweiCharts,
} from "@lasoviet/database";
import {
  generatePaymentCode,
  isValidPaymentCode,
  normalizePaymentCodeInput,
} from "./payment-code.js";
import {
  getVietnamCalendarDayBounds,
  parseTransferredAtLocal,
  type ParsedClaimTime,
} from "./payment-claim-time.js";

import { checkoutAccountError, PRODUCT_CATALOG } from "./order.service.js";
import { currentReportVersions } from "../reports/identity-report-config.js";

type Sku = keyof typeof PRODUCT_CATALOG;
type OrderRecord = typeof commerceOrders.$inferSelect;
type CheckoutLocale = "vi" | "en";

export type CommerceRepositoryOptions = {
  now?: () => Date;
  orderTtlSeconds?: number;
  beforePaymentCommit?: () => Promise<void>;
  paymentCodeFactory?: () => string;
  beforeClaimLockedRequery?: () => Promise<void>;
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
  const paymentCodeFactory = options.paymentCodeFactory ?? generatePaymentCode;

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

  async function readAccountLibrary(actor: CurrentActor): Promise<AccountLibraryV1> {
    if (actor.kind !== "account") {
      return {
        version: 1,
        groups: [],
        items: [],
        latestReadableReport: null,
        totalCount: 0,
      };
    }

    const rows = await database
      .select({
        entitlement: commerceEntitlements,
        order: commerceOrders,
        chart: ziweiCharts,
        profile: birthProfiles,
        revision: birthProfileRevisions,
        chartVersion: ziweiChartVersions,
        reservation: reportReservations,
      })
      .from(commerceEntitlements)
      .innerJoin(
        commerceOrders,
        and(
          eq(commerceOrders.id, commerceEntitlements.orderId),
          eq(commerceOrders.ownerId, actor.userId),
          eq(commerceOrders.chartId, commerceEntitlements.chartId),
        ),
      )
      .innerJoin(
        ziweiCharts,
        eq(ziweiCharts.id, commerceEntitlements.chartId),
      )
      .innerJoin(
        birthProfiles,
        and(
          eq(birthProfiles.id, ziweiCharts.profileId),
          eq(birthProfiles.userId, actor.userId),
          isNull(birthProfiles.deletedAt),
        ),
      )
      .innerJoin(
        birthProfileRevisions,
        and(
          eq(birthProfileRevisions.id, ziweiCharts.profileRevisionId),
          eq(birthProfileRevisions.profileId, birthProfiles.id),
        ),
      )
      .innerJoin(
        ziweiChartVersions,
        and(
          eq(ziweiChartVersions.id, commerceOrders.chartVersionId),
          eq(ziweiChartVersions.chartId, ziweiCharts.id),
        ),
      )
      .leftJoin(reportReservations, eq(reportReservations.entitlementId, commerceEntitlements.id))
      .where(eq(commerceEntitlements.ownerId, actor.userId))
      .orderBy(desc(commerceEntitlements.createdAt), desc(commerceEntitlements.id));

    if (rows.length === 0) {
      return {
        version: 1,
        groups: [],
        items: [],
        latestReadableReport: null,
        totalCount: 0,
      };
    }

    const activeReportVersionIds = rows
      .map((r) => r.reservation?.reportVersionId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const versionRows = activeReportVersionIds.length > 0
      ? await database
          .select()
          .from(reportVersions)
          .where(inArray(reportVersions.reportVersionId, activeReportVersionIds))
          .orderBy(desc(reportVersions.createdAt), desc(reportVersions.id))
      : [];

    const versionMap = new Map<string, typeof versionRows[number]>();
    for (const v of versionRows) {
      if (!versionMap.has(v.reportVersionId)) {
        versionMap.set(v.reportVersionId, v);
      }
    }

    const evidenceSetIds = Array.from(
      new Set(
        versionRows
          .map((v) => v.evidenceVersionId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    const evidenceSetRows = evidenceSetIds.length > 0
      ? await database
          .select({
            id: evidenceSets.id,
            chartVersionId: evidenceSets.chartVersionId,
          })
          .from(evidenceSets)
          .where(inArray(evidenceSets.id, evidenceSetIds))
      : [];

    const evidenceSetMap = new Map<string, typeof evidenceSetRows[number]>();
    for (const es of evidenceSetRows) {
      evidenceSetMap.set(es.id, es);
    }

    const items: AccountLibraryItemV1[] = rows.map((row) => {
      const entitlement = row.entitlement;
      const order = row.order;
      const profile = row.profile;
      const revision = row.revision;
      const reservation = row.reservation;
      const version = reservation
        ? versionMap.get(reservation.reportVersionId)
        : undefined;

      const isReservationValid =
        reservation !== null &&
        reservation.entitlementId === entitlement.id &&
        reservation.chartVersionId === order.chartVersionId &&
        order.sku === entitlement.sku &&
        reservation.sku === entitlement.sku &&
        reservation.locale === order.locale;

      const isEvidenceValid =
        version !== undefined &&
        evidenceSetMap.get(version.evidenceVersionId)?.chartVersionId === order.chartVersionId;

      const isVersionLineageConsistent =
        isReservationValid &&
        version !== undefined &&
        version.reportId === reservation.reportId &&
        version.reportVersionId === reservation.reportVersionId &&
        version.entitlementId === entitlement.id &&
        version.chartVersionId === order.chartVersionId &&
        version.evidenceVersionId === reservation.evidenceVersionId &&
        version.knowledgeVersionId === reservation.knowledgeVersionId &&
        version.promptVersion === reservation.promptVersion &&
        version.reportConfigVersion === reservation.reportConfigVersion &&
        version.locale === reservation.locale &&
        version.sku === reservation.sku &&
        version.sku === order.sku &&
        isEvidenceValid;

      const isReportReady =
        isVersionLineageConsistent &&
        reservation.status !== "terminal_failure";

      const displayName =
        "displayName" in revision.originalInput &&
        typeof revision.originalInput.displayName === "string" &&
        revision.originalInput.displayName.trim().length > 0
          ? revision.originalInput.displayName.trim()
          : null;

      const sku = entitlement.sku as CommerceSku;
      const locale = order.locale === "en" ? ("en" as const) : ("vi" as const);
      const productTitle = resolveProductTitle(sku, locale);

      const reportId = isReportReady
        ? version.reportId
        : isReservationValid && !version
          ? reservation.reportId
          : null;

      const readUrl = isReportReady && reportId
        ? locale === "en"
          ? `/en/bao-cao/${encodeURIComponent(reportId)}`
          : `/bao-cao/${encodeURIComponent(reportId)}`
        : null;

      const reportStatus = isReportReady
        ? "ready"
        : isReservationValid && (!version || reservation.status === "terminal_failure")
          ? reservation.status ?? null
          : null;

      return {
        id: entitlement.id,
        entitlementId: entitlement.id,
        orderId: order.id,
        chartId: entitlement.chartId,
        profileId: profile.id,
        profileDisplayName: displayName,
        sku,
        productTitle,
        productName: productTitle,
        orderStatus: order.status as OrderStatus,
        entitlementStatus: "active" as const,
        reportId,
        readUrl,
        reportStatus,
        locale,
        createdAt: entitlement.createdAt.toISOString(),
        purchasedAt: order.paidAt ? order.paidAt.toISOString() : order.createdAt.toISOString(),
      };
    });

    items.sort((a, b) => {
      const aReadable = a.readUrl !== null;
      const bReadable = b.readUrl !== null;
      if (aReadable && !bReadable) return -1;
      if (!aReadable && bReadable) return 1;

      const timeA = new Date(a.purchasedAt ?? a.createdAt).getTime();
      const timeB = new Date(b.purchasedAt ?? b.createdAt).getTime();
      if (timeA !== timeB) return timeB - timeA;

      return a.id.localeCompare(b.id);
    });

    const latestReadableReport = items.find((item) => item.readUrl !== null) ?? null;

    const groupMap = new Map<string, AccountLibraryItemV1[]>();
    for (const item of items) {
      const key = item.chartId;
      const existing = groupMap.get(key);
      if (existing) {
        existing.push(item);
      } else {
        groupMap.set(key, [item]);
      }
    }

    const groups: AccountLibraryGroupV1[] = [];
    for (const [chartId, groupItems] of groupMap.entries()) {
      groupItems.sort((a, b) => {
        const timeA = new Date(a.purchasedAt ?? a.createdAt).getTime();
        const timeB = new Date(b.purchasedAt ?? b.createdAt).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return a.id.localeCompare(b.id);
      });

      const firstReadable = groupItems.find((i) => i.readUrl !== null);
      const profileId = groupItems[0]?.profileId ?? null;
      const profileDisplayName = groupItems[0]?.profileDisplayName ?? null;

      groups.push({
        profileId,
        profileDisplayName,
        chartId,
        items: groupItems,
        latestReportId: firstReadable?.reportId ?? null,
        latestReadUrl: firstReadable?.readUrl ?? null,
      });
    }

    groups.sort((a, b) => {
      if (latestReadableReport) {
        if (a.chartId === latestReadableReport.chartId) return -1;
        if (b.chartId === latestReadableReport.chartId) return 1;
      }
      const timeA = new Date(a.items[0]?.purchasedAt ?? a.items[0]?.createdAt ?? 0).getTime();
      const timeB = new Date(b.items[0]?.purchasedAt ?? b.items[0]?.createdAt ?? 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return a.chartId.localeCompare(b.chartId);
    });

    return {
      version: 1,
      groups,
      items,
      latestReadableReport,
      totalCount: items.length,
    };
  }

  async function readOrderHistory(actor: CurrentActor): Promise<OrderHistoryV1> {
    if (actor.kind !== "account") {
      return {
        version: 1,
        orders: [],
        items: [],
        totalCount: 0,
      };
    }

    const currentNow = getNow();
    const cutoff = new Date(currentNow.getTime() - orderTtlSeconds * 1000);

    const rows = await database
      .select({
        order: commerceOrders,
        chart: ziweiCharts,
        profile: birthProfiles,
        revision: birthProfileRevisions,
        chartVersion: ziweiChartVersions,
        entitlement: commerceEntitlements,
        reservation: reportReservations,
      })
      .from(commerceOrders)
      .innerJoin(
        ziweiCharts,
        eq(ziweiCharts.id, commerceOrders.chartId),
      )
      .innerJoin(
        birthProfiles,
        and(
          eq(birthProfiles.id, ziweiCharts.profileId),
          eq(birthProfiles.userId, actor.userId),
          isNull(birthProfiles.deletedAt),
        ),
      )
      .innerJoin(
        birthProfileRevisions,
        and(
          eq(birthProfileRevisions.id, ziweiCharts.profileRevisionId),
          eq(birthProfileRevisions.profileId, birthProfiles.id),
        ),
      )
      .innerJoin(
        ziweiChartVersions,
        and(
          eq(ziweiChartVersions.id, commerceOrders.chartVersionId),
          eq(ziweiChartVersions.chartId, ziweiCharts.id),
        ),
      )
      .leftJoin(
        commerceEntitlements,
        and(
          eq(commerceEntitlements.orderId, commerceOrders.id),
          eq(commerceEntitlements.ownerId, actor.userId),
          eq(commerceEntitlements.chartId, commerceOrders.chartId),
        ),
      )
      .leftJoin(reportReservations, eq(reportReservations.entitlementId, commerceEntitlements.id))
      .where(eq(commerceOrders.ownerId, actor.userId))
      .orderBy(desc(commerceOrders.createdAt), desc(commerceOrders.id));

    if (rows.length === 0) {
      return {
        version: 1,
        orders: [],
        items: [],
        totalCount: 0,
      };
    }

    const activeReportVersionIds = rows
      .map((r) => r.reservation?.reportVersionId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const versionRows = activeReportVersionIds.length > 0
      ? await database
          .select()
          .from(reportVersions)
          .where(inArray(reportVersions.reportVersionId, activeReportVersionIds))
          .orderBy(desc(reportVersions.createdAt), desc(reportVersions.id))
      : [];

    const versionMap = new Map<string, typeof versionRows[number]>();
    for (const v of versionRows) {
      if (!versionMap.has(v.reportVersionId)) {
        versionMap.set(v.reportVersionId, v);
      }
    }

    const evidenceSetIds = Array.from(
      new Set(
        versionRows
          .map((v) => v.evidenceVersionId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    const evidenceSetRows = evidenceSetIds.length > 0
      ? await database
          .select({
            id: evidenceSets.id,
            chartVersionId: evidenceSets.chartVersionId,
          })
          .from(evidenceSets)
          .where(inArray(evidenceSets.id, evidenceSetIds))
      : [];

    const evidenceSetMap = new Map<string, typeof evidenceSetRows[number]>();
    for (const es of evidenceSetRows) {
      evidenceSetMap.set(es.id, es);
    }

    const orders: OrderHistoryItemV1[] = rows.map((row) => {
      const order = row.order;
      const profile = row.profile;
      const revision = row.revision;
      const reservation = row.reservation;
      const entitlement = row.entitlement;
      const version = reservation
        ? versionMap.get(reservation.reportVersionId)
        : undefined;

      const isReservationValid =
        reservation !== null &&
        reservation.chartVersionId === order.chartVersionId &&
        (!entitlement || entitlement.sku === order.sku) &&
        reservation.sku === order.sku &&
        reservation.locale === order.locale;

      const isEvidenceValid =
        version !== undefined &&
        evidenceSetMap.get(version.evidenceVersionId)?.chartVersionId === order.chartVersionId;

      const isVersionLineageConsistent =
        isReservationValid &&
        version !== undefined &&
        version.reportId === reservation.reportId &&
        version.reportVersionId === reservation.reportVersionId &&
        version.chartVersionId === order.chartVersionId &&
        version.evidenceVersionId === reservation.evidenceVersionId &&
        version.knowledgeVersionId === reservation.knowledgeVersionId &&
        version.promptVersion === reservation.promptVersion &&
        version.reportConfigVersion === reservation.reportConfigVersion &&
        version.locale === reservation.locale &&
        version.sku === reservation.sku &&
        version.sku === order.sku &&
        isEvidenceValid;

      const isReportReady =
        isVersionLineageConsistent &&
        reservation.status !== "terminal_failure";

      const displayName =
        "displayName" in revision.originalInput &&
        typeof revision.originalInput.displayName === "string" &&
        revision.originalInput.displayName.trim().length > 0
          ? revision.originalInput.displayName.trim()
          : null;

      const sku = order.sku as CommerceSku;
      const locale = order.locale === "en" ? ("en" as const) : ("vi" as const);
      const productTitle = resolveProductTitle(sku, locale);

      const isExpired = order.status === "pending" && order.createdAt.getTime() <= cutoff.getTime();
      const effectiveStatus: OrderStatus = isExpired ? "expired" : (order.status as OrderStatus);

      const reportId = isReportReady
        ? version.reportId
        : isReservationValid && !version
          ? reservation.reportId
          : null;

      const readUrl = isReportReady && reportId
        ? locale === "en"
          ? `/en/bao-cao/${encodeURIComponent(reportId)}`
          : `/bao-cao/${encodeURIComponent(reportId)}`
        : null;

      const supportUrl =
        locale === "en"
          ? `/en/lien-he?orderId=${encodeURIComponent(order.id)}`
          : `/lien-he?orderId=${encodeURIComponent(order.id)}`;

      return {
        id: order.id,
        orderId: order.id,
        invoiceNumber: order.invoiceNumber,
        chartId: order.chartId,
        profileId: profile.id,
        profileDisplayName: displayName,
        sku,
        productTitle,
        productName: productTitle,
        amount: order.amount,
        currency: order.currency,
        status: effectiveStatus,
        orderStatus: effectiveStatus,
        locale,
        createdAt: order.createdAt.toISOString(),
        paidAt: order.paidAt ? order.paidAt.toISOString() : null,
        reportId,
        readUrl,
        supportUrl,
      };
    });

    return {
      version: 1,
      orders,
      items: orders,
      totalCount: orders.length,
    };
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
        const circuitLockKey = "commerce:reconciliation_circuit";
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${circuitLockKey}))`);

        const [circuitState] = await transaction
          .select({ circuitStatus: commerceReconciliationState.circuitStatus })
          .from(commerceReconciliationState)
          .where(eq(commerceReconciliationState.id, "singleton"))
          .limit(1);

        if (circuitState?.circuitStatus === "open") {
          return { ok: false as const, code: "CHECKOUT_PAYMENTS_PAUSED" };
        }

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
        for (let attempt = 1; attempt <= 5; attempt++) {
          const paymentCode = paymentCodeFactory();
          const [created] = await transaction.insert(commerceOrders).values({
            id,
            paymentCode,
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
          }).onConflictDoNothing({ target: commerceOrders.paymentCode }).returning();

          if (created !== undefined) {
            return { ok: true as const, value: created, reused: false };
          }
        }

        throw new Error("PAYMENT_CODE_GENERATION_EXHAUSTED");
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
      invoiceNumber?: string;
      paymentCode?: string;
      matchMethod?: "invoice_number" | "payment_code";
      providerEventId: string;
      amount: number;
      currency: string;
      traceId: string;
    }) {
      const matchMethod = input.matchMethod ?? "invoice_number";
      let lookupPredicate: ReturnType<typeof eq>;

      if (matchMethod === "payment_code") {
        const raw = input.paymentCode ?? input.invoiceNumber ?? "";
        const normalized = normalizePaymentCodeInput(raw);
        if (!isValidPaymentCode(normalized)) {
          return { ok: false as const, code: "ORDER_NOT_FOUND" };
        }
        lookupPredicate = eq(commerceOrders.paymentCode, normalized);
      } else {
        const invoice = input.invoiceNumber;
        if (!invoice) {
          return { ok: false as const, code: "ORDER_NOT_FOUND" };
        }
        lookupPredicate = eq(commerceOrders.invoiceNumber, invoice);
      }

      try {
        return await database.transaction(async (transaction) => {
          const currentNow = getNow();

          const providerLockKey = `provider_event:${input.providerEventId}`;
          await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${providerLockKey}))`);

          const [priorUnmatched] = await transaction.select().from(commerceUnmatchedPayments)
            .where(eq(commerceUnmatchedPayments.providerEventId, input.providerEventId)).limit(1);
          if (priorUnmatched !== undefined) {
            return { ok: true as const, replayed: true };
          }

          const [target] = await transaction.select({
            chartId: commerceOrders.chartId,
            sku: commerceOrders.sku,
          }).from(commerceOrders)
            .where(lookupPredicate)
            .limit(1);
          if (target === undefined) return { ok: false as const, code: "ORDER_NOT_FOUND" };

          const lockKey = `commerce:${target.chartId}:${target.sku}`;
          await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

          const [order] = await transaction.select().from(commerceOrders)
            .where(lookupPredicate)
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
          orderId: order.id,
          providerEventId: input.providerEventId,
          amount: input.amount,
          currency: input.currency,
          status: "ORDER_PAID",
          matchMethod,
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

    async recordUnmatched(input: {
      providerEventId: string;
      rawPayload: Record<string, unknown>;
      amount: number;
      reason: string;
      receivedAt?: Date;
    }): Promise<{ ok: true; replayed: boolean } | { ok: false; code: string }> {
      if (
        typeof input.amount !== "number" ||
        !Number.isSafeInteger(input.amount) ||
        input.amount <= 0
      ) {
        return { ok: false as const, code: "PAYMENT_AMOUNT_INVALID" };
      }

      return await database.transaction(async (transaction) => {
        const currentNow = getNow();
        const receivedAt = input.receivedAt ?? currentNow;

        const providerLockKey = `provider_event:${input.providerEventId}`;
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${providerLockKey}))`);

        const [existingUnmatched] = await transaction
          .select()
          .from(commerceUnmatchedPayments)
          .where(eq(commerceUnmatchedPayments.providerEventId, input.providerEventId))
          .limit(1);

        if (existingUnmatched !== undefined) {
          return { ok: true as const, replayed: true };
        }

        const [existingPaid] = await transaction
          .select()
          .from(commercePaymentEvents)
          .where(eq(commercePaymentEvents.providerEventId, input.providerEventId))
          .limit(1);

        if (existingPaid !== undefined) {
          return { ok: true as const, replayed: true };
        }

        const [inserted] = await transaction
          .insert(commerceUnmatchedPayments)
          .values({
            providerEventId: input.providerEventId,
            rawPayload: input.rawPayload,
            amount: input.amount,
            reason: input.reason,
            receivedAt,
          })
          .onConflictDoNothing()
          .returning();

        if (inserted !== undefined) {
          return { ok: true as const, replayed: false };
        }

        const [recheckedUnmatched] = await transaction
          .select()
          .from(commerceUnmatchedPayments)
          .where(eq(commerceUnmatchedPayments.providerEventId, input.providerEventId))
          .limit(1);

        if (recheckedUnmatched !== undefined) {
          return { ok: true as const, replayed: true };
        }

        const [recheckedPaid] = await transaction
          .select()
          .from(commercePaymentEvents)
          .where(eq(commercePaymentEvents.providerEventId, input.providerEventId))
          .limit(1);

        if (recheckedPaid !== undefined) {
          return { ok: true as const, replayed: true };
        }

        throw new Error("UNMATCHED_PAYMENT_PERSISTENCE_FAILED");
      });
    },
    async claimUnmatchedPayment(
      actor: CurrentActor,
      input: {
        amount: number;
        transferredAtLocal: string;
      },
    ): Promise<
      | {
          ok: true;
          value: {
            status: "claimed";
            orderId: string;
            reportId: string;
          };
        }
      | {
          ok: false;
          code:
            | "PAYMENT_CLAIM_ACCOUNT_REQUIRED"
            | "PAYMENT_CLAIM_EMAIL_VERIFICATION_REQUIRED"
            | "PAYMENT_CLAIM_RATE_LIMITED"
            | "PAYMENT_CLAIM_NOT_FOUND"
            | "PAYMENT_CLAIM_INVALID";
        }
    > {
      if (actor.kind !== "account") {
        return { ok: false, code: "PAYMENT_CLAIM_ACCOUNT_REQUIRED" };
      }
      const accountError = await checkoutAccount(database, actor);
      if (accountError === "CHECKOUT_ACCOUNT_REQUIRED") {
        return { ok: false, code: "PAYMENT_CLAIM_ACCOUNT_REQUIRED" };
      }
      if (accountError === "CHECKOUT_EMAIL_VERIFICATION_REQUIRED") {
        return { ok: false, code: "PAYMENT_CLAIM_EMAIL_VERIFICATION_REQUIRED" };
      }
      if (accountError !== null) {
        return { ok: false, code: "PAYMENT_CLAIM_ACCOUNT_REQUIRED" };
      }

      if (
        typeof input.amount !== "number" ||
        !Number.isSafeInteger(input.amount) ||
        input.amount <= 0
      ) {
        return { ok: false, code: "PAYMENT_CLAIM_INVALID" };
      }

      let claimTime: ParsedClaimTime;
      try {
        claimTime = parseTransferredAtLocal(input.transferredAtLocal);
      } catch {
        return { ok: false, code: "PAYMENT_CLAIM_INVALID" };
      }

      return await database.transaction(async (transaction) => {
        const currentNow = getNow();
        const { startUtc, nextDayStartUtc, localDateKey } = getVietnamCalendarDayBounds(currentNow);

        // 1. Account / day rate-limit advisory lock
        const rateLimitLockKey = `self_claim_rate:${actor.userId}:${localDateKey}`;
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${rateLimitLockKey}))`);

        const [countResult] = await transaction
          .select({ count: sql<number>`count(*)::integer` })
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.actorId, actor.userId),
              eq(auditLogs.action, "commerce.payment_self_claim.requested"),
              gte(auditLogs.createdAt, startUtc),
              lt(auditLogs.createdAt, nextDayStartUtc),
            ),
          );

        const attemptCount = countResult?.count ?? 0;
        if (attemptCount >= 5) {
          await transaction.insert(auditLogs).values({
            actorId: actor.userId,
            action: "commerce.payment_self_claim.requested",
            targetType: "commerce_payment_claim",
            targetId: "unresolved",
            reasonCode: "PAYMENT_CLAIM_RATE_LIMITED",
            requestId: actor.requestId,
            metadata: {
              outcome: "PAYMENT_CLAIM_RATE_LIMITED",
              claimedAmount: input.amount,
            },
            createdAt: currentNow,
          });
          return { ok: false as const, code: "PAYMENT_CLAIM_RATE_LIMITED" as const };
        }

        const candidatePayments = await transaction
          .select()
          .from(commerceUnmatchedPayments)
          .where(
            and(
              eq(commerceUnmatchedPayments.amount, input.amount),
              isNull(commerceUnmatchedPayments.claimedAt),
              isNull(commerceUnmatchedPayments.claimedByOrderId),
              gte(commerceUnmatchedPayments.receivedAt, claimTime.windowStart),
              lte(commerceUnmatchedPayments.receivedAt, claimTime.windowEnd),
            ),
          );

        const candidateOrders = await transaction
          .select()
          .from(commerceOrders)
          .where(
            and(
              eq(commerceOrders.ownerId, actor.userId),
              eq(commerceOrders.amount, input.amount),
              eq(commerceOrders.currency, "VND"),
              or(
                eq(commerceOrders.status, "pending"),
                eq(commerceOrders.status, "expired"),
              ),
            ),
          );

        const eligibleOrders: typeof candidateOrders = [];
        for (const order of candidateOrders) {
          const [existingEntitlement] = await transaction
            .select({ id: commerceEntitlements.id })
            .from(commerceEntitlements)
            .where(
              and(
                eq(commerceEntitlements.chartId, order.chartId),
                eq(commerceEntitlements.sku, order.sku),
              ),
            )
            .limit(1);
          if (existingEntitlement === undefined) {
            eligibleOrders.push(order);
          }
        }

        if (candidatePayments.length !== 1 || eligibleOrders.length !== 1) {
          await transaction.insert(auditLogs).values({
            actorId: actor.userId,
            action: "commerce.payment_self_claim.requested",
            targetType: "commerce_payment_claim",
            targetId: "unresolved",
            reasonCode: "PAYMENT_CLAIM_NOT_FOUND",
            requestId: actor.requestId,
            metadata: {
              outcome: "PAYMENT_CLAIM_NOT_FOUND",
              claimedAmount: input.amount,
            },
            createdAt: currentNow,
          });
          return { ok: false as const, code: "PAYMENT_CLAIM_NOT_FOUND" as const };
        }

        const selectedPayment = candidatePayments[0]!;
        const selectedOrder = eligibleOrders[0]!;

        // 2. Provider-event advisory lock
        const providerLockKey = `provider_event:${selectedPayment.providerEventId}`;
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${providerLockKey}))`);

        // 3. Chart/SKU advisory lock
        const chartSkuLockKey = `commerce:${selectedOrder.chartId}:${selectedOrder.sku}`;
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${chartSkuLockKey}))`);

        // Test hook before table locks / locked re-query
        await options.beforeClaimLockedRequery?.();

        // 4. Table locks in order: commerce_unmatched_payments before commerce_orders
        await transaction.execute(sql`LOCK TABLE commerce_unmatched_payments IN SHARE ROW EXCLUSIVE MODE`);
        await transaction.execute(sql`LOCK TABLE commerce_orders IN SHARE ROW EXCLUSIVE MODE`);

        // Re-query complete eligible payment and owner-order predicates after locks
        const lockedCandidatePayments = await transaction
          .select()
          .from(commerceUnmatchedPayments)
          .where(
            and(
              eq(commerceUnmatchedPayments.amount, input.amount),
              isNull(commerceUnmatchedPayments.claimedAt),
              isNull(commerceUnmatchedPayments.claimedByOrderId),
              gte(commerceUnmatchedPayments.receivedAt, claimTime.windowStart),
              lte(commerceUnmatchedPayments.receivedAt, claimTime.windowEnd),
            ),
          );

        const lockedCandidateOrders = await transaction
          .select()
          .from(commerceOrders)
          .where(
            and(
              eq(commerceOrders.ownerId, actor.userId),
              eq(commerceOrders.amount, input.amount),
              eq(commerceOrders.currency, "VND"),
              or(
                eq(commerceOrders.status, "pending"),
                eq(commerceOrders.status, "expired"),
              ),
            ),
          );

        const lockedEligibleOrders: typeof lockedCandidateOrders = [];
        for (const order of lockedCandidateOrders) {
          const [existingEntitlement] = await transaction
            .select({ id: commerceEntitlements.id })
            .from(commerceEntitlements)
            .where(
              and(
                eq(commerceEntitlements.chartId, order.chartId),
                eq(commerceEntitlements.sku, order.sku),
              ),
            )
            .limit(1);
          if (existingEntitlement === undefined) {
            lockedEligibleOrders.push(order);
          }
        }

        // Require exactly the same one payment and one order
        if (
          lockedCandidatePayments.length !== 1 ||
          lockedEligibleOrders.length !== 1 ||
          lockedCandidatePayments[0]!.id !== selectedPayment.id ||
          lockedEligibleOrders[0]!.id !== selectedOrder.id
        ) {
          await transaction.insert(auditLogs).values({
            actorId: actor.userId,
            action: "commerce.payment_self_claim.requested",
            targetType: "commerce_payment_claim",
            targetId: "unresolved",
            reasonCode: "PAYMENT_CLAIM_NOT_FOUND",
            requestId: actor.requestId,
            metadata: {
              outcome: "PAYMENT_CLAIM_NOT_FOUND",
              claimedAmount: input.amount,
            },
            createdAt: currentNow,
          });
          return { ok: false as const, code: "PAYMENT_CLAIM_NOT_FOUND" as const };
        }

        // 5. Lock rows before mutation
        const [lockedPayment] = await transaction
          .select()
          .from(commerceUnmatchedPayments)
          .where(eq(commerceUnmatchedPayments.id, selectedPayment.id))
          .limit(1)
          .for("update");

        const [lockedOrder] = await transaction
          .select()
          .from(commerceOrders)
          .where(eq(commerceOrders.id, selectedOrder.id))
          .limit(1)
          .for("update");

        if (
          lockedPayment === undefined ||
          lockedOrder === undefined ||
          lockedPayment.amount !== input.amount ||
          lockedPayment.claimedAt !== null ||
          lockedPayment.claimedByOrderId !== null ||
          lockedPayment.receivedAt < claimTime.windowStart ||
          lockedPayment.receivedAt > claimTime.windowEnd ||
          lockedOrder.ownerId !== actor.userId ||
          lockedOrder.amount !== input.amount ||
          lockedOrder.currency !== "VND" ||
          (lockedOrder.status !== "pending" && lockedOrder.status !== "expired")
        ) {
          await transaction.insert(auditLogs).values({
            actorId: actor.userId,
            action: "commerce.payment_self_claim.requested",
            targetType: "commerce_payment_claim",
            targetId: "unresolved",
            reasonCode: "PAYMENT_CLAIM_NOT_FOUND",
            requestId: actor.requestId,
            metadata: {
              outcome: "PAYMENT_CLAIM_NOT_FOUND",
              claimedAmount: input.amount,
            },
            createdAt: currentNow,
          });
          return { ok: false as const, code: "PAYMENT_CLAIM_NOT_FOUND" as const };
        }

        const [concurrentEntitlement] = await transaction
          .select({ id: commerceEntitlements.id })
          .from(commerceEntitlements)
          .where(
            and(
              eq(commerceEntitlements.chartId, lockedOrder.chartId),
              eq(commerceEntitlements.sku, lockedOrder.sku),
            ),
          )
          .limit(1);

        if (concurrentEntitlement !== undefined) {
          await transaction.insert(auditLogs).values({
            actorId: actor.userId,
            action: "commerce.payment_self_claim.requested",
            targetType: "commerce_payment_claim",
            targetId: "unresolved",
            reasonCode: "PAYMENT_CLAIM_NOT_FOUND",
            requestId: actor.requestId,
            metadata: {
              outcome: "PAYMENT_CLAIM_NOT_FOUND",
              claimedAmount: input.amount,
            },
            createdAt: currentNow,
          });
          return { ok: false as const, code: "PAYMENT_CLAIM_NOT_FOUND" as const };
        }

        await transaction
          .update(commerceUnmatchedPayments)
          .set({
            claimedByOrderId: lockedOrder.id,
            claimedAt: currentNow,
          })
          .where(eq(commerceUnmatchedPayments.id, lockedPayment.id));

        await transaction
          .update(commerceOrders)
          .set({ status: "expired" })
          .where(
            and(
              eq(commerceOrders.chartId, lockedOrder.chartId),
              eq(commerceOrders.sku, lockedOrder.sku),
              eq(commerceOrders.status, "pending"),
              ne(commerceOrders.id, lockedOrder.id),
            ),
          );

        const [paidOrder] = await transaction
          .update(commerceOrders)
          .set({ status: "paid", paidAt: currentNow })
          .where(
            and(
              eq(commerceOrders.id, lockedOrder.id),
              or(eq(commerceOrders.status, "pending"), eq(commerceOrders.status, "expired")),
            ),
          )
          .returning();

        if (paidOrder === undefined) {
          throw new Error("ORDER_TRANSITION_FAILED");
        }

        const [event] = await transaction
          .insert(commercePaymentEvents)
          .values({
            orderId: paidOrder.id,
            providerEventId: lockedPayment.providerEventId,
            amount: lockedPayment.amount,
            currency: "VND",
            status: "ORDER_PAID",
            matchMethod: "self_claim",
            createdAt: currentNow,
          })
          .onConflictDoNothing()
          .returning();

        if (event === undefined) {
          throw new Error("PAYMENT_EVENT_CONFLICT");
        }

        const [evidence] = await transaction
          .select({ id: evidenceSets.id })
          .from(evidenceSets)
          .where(
            and(
              eq(evidenceSets.chartVersionId, paidOrder.chartVersionId),
              eq(evidenceSets.capabilityId, "ziwei.identity.p0"),
            ),
          )
          .limit(1);

        if (evidence === undefined) throw new Error("EVIDENCE_VERSION_MISSING");

        const [entitlement] = await transaction
          .insert(commerceEntitlements)
          .values({
            orderId: paidOrder.id,
            chartId: paidOrder.chartId,
            sku: paidOrder.sku,
            ownerId: paidOrder.ownerId,
            createdAt: currentNow,
          })
          .returning();

        if (entitlement === undefined) throw new Error("ENTITLEMENT_CREATE_FAILED");

        const reportVersions = currentReportVersions(paidOrder.locale);
        const [reservation] = await transaction
          .insert(reportReservations)
          .values({
            reportId: randomUUID(),
            reportVersionId: randomUUID(),
            entitlementId: entitlement.id,
            chartVersionId: paidOrder.chartVersionId,
            evidenceVersionId: evidence.id,
            knowledgeVersionId: reportVersions.knowledgeVersion,
            promptVersion: reportVersions.promptVersion,
            reportConfigVersion: reportVersions.reportConfigVersion,
            locale: paidOrder.locale,
            sku: paidOrder.sku,
            createdAt: currentNow,
            updatedAt: currentNow,
          })
          .returning();

        if (reservation === undefined) throw new Error("REPORT_RESERVATION_CREATE_FAILED");

        await enqueueOutbox(transaction, {
          schemaVersion: 1,
          type: "report.generation.requested.v1",
          eventId: randomUUID(),
          occurredAt: currentNow.toISOString(),
          traceId: actor.requestId,
          actorId: paidOrder.ownerId,
          aggregateType: "order",
          aggregateId: paidOrder.id,
          idempotencyKey: "report-request:" + reservation.reportVersionId,
          payload: {
            reportId: reservation.reportId,
            reportVersionId: reservation.reportVersionId,
            entitlementId: entitlement.id,
            chartVersionId: reservation.chartVersionId,
            evidenceVersionId: reservation.evidenceVersionId,
            knowledgeVersionId: reservation.knowledgeVersionId,
            promptVersion: reservation.promptVersion,
            reportConfigVersion: reservation.reportConfigVersion,
            locale: reservation.locale,
            sku: reservation.sku,
          },
        });

        await transaction.insert(auditLogs).values({
          actorId: actor.userId,
          action: "commerce.payment_self_claim.requested",
          targetType: "commerce_payment_claim",
          targetId: paidOrder.id,
          reasonCode: "claimed",
          requestId: actor.requestId,
          metadata: {
            outcome: "claimed",
            claimedAmount: input.amount,
          },
          createdAt: currentNow,
        });

        await options.beforePaymentCommit?.();

        return {
          ok: true as const,
          value: {
            status: "claimed" as const,
            orderId: paidOrder.id,
            reportId: reservation.reportId,
          },
        };
      });
    },
  readAccountLibrary,
  readOrderHistory,
  };
}

export type CommerceRepository = ReturnType<typeof createDatabaseCommerceRepository>;
