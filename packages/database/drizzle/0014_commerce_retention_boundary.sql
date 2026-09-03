ALTER TABLE "commerce_orders" DROP CONSTRAINT IF EXISTS "commerce_orders_chart_id_ziwei_charts_id_fk";--> statement-breakpoint
ALTER TABLE "commerce_orders" DROP CONSTRAINT IF EXISTS "commerce_orders_chart_version_id_ziwei_chart_versions_id_fk";--> statement-breakpoint
ALTER TABLE "commerce_entitlements" DROP CONSTRAINT IF EXISTS "commerce_entitlements_chart_id_ziwei_charts_id_fk";--> statement-breakpoint
ALTER TABLE "report_reservations" DROP CONSTRAINT IF EXISTS "report_reservations_chart_version_id_ziwei_chart_versions_id_fk";
