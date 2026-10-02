import { and, eq, exists, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { commerceEntitlements, reportEntitlementLinks, reportReservations, type Database } from "@lasoviet/database";

/** A link cannot transfer a report across owners, charts, or its immutable SKU provenance. */
export function reportReservationAuthority(database: Database) {
  const origin = alias(commerceEntitlements, "reservation_origin");
  return or(
    eq(reportReservations.entitlementId, commerceEntitlements.id),
    exists(database.select({ id: reportEntitlementLinks.entitlementId })
      .from(reportEntitlementLinks)
      .innerJoin(origin, and(
        eq(origin.id, reportReservations.entitlementId),
        eq(origin.ownerId, commerceEntitlements.ownerId),
        eq(origin.chartId, commerceEntitlements.chartId),
        eq(origin.sku, reportReservations.sku),
      ))
      .where(and(
        eq(reportEntitlementLinks.entitlementId, commerceEntitlements.id),
        eq(reportEntitlementLinks.reservationId, reportReservations.id),
      ))),
  );
}
