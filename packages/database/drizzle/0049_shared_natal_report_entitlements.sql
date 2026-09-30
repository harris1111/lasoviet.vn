CREATE TABLE IF NOT EXISTS report_entitlement_links (
  entitlement_id uuid PRIMARY KEY REFERENCES commerce_entitlements(id),
  reservation_id uuid NOT NULL REFERENCES report_reservations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS report_entitlement_links_reservation_idx ON report_entitlement_links(reservation_id);
--> statement-breakpoint
-- Older VND upgrades reused a report without storing an explicit association.
INSERT INTO report_entitlement_links (entitlement_id, reservation_id)
SELECT DISTINCT ON (entitlement.id) entitlement.id, reservation.id
FROM commerce_entitlements AS entitlement
JOIN commerce_orders AS purchase ON purchase.id = entitlement.order_id
JOIN commerce_entitlements AS origin
  ON origin.owner_id = entitlement.owner_id AND origin.chart_id = entitlement.chart_id
JOIN report_reservations AS reservation
  ON reservation.entitlement_id = origin.id
  AND reservation.chart_version_id = purchase.chart_version_id
  AND reservation.locale = purchase.locale
  AND reservation.sku = origin.sku
LEFT JOIN report_reservations AS own_reservation ON own_reservation.entitlement_id = entitlement.id
WHERE own_reservation.id IS NULL
  AND purchase.kind = 'content_purchase'
  AND purchase.status = 'paid'
  AND purchase.sku = entitlement.sku
  AND purchase.owner_id = entitlement.owner_id
  AND purchase.chart_id = entitlement.chart_id
  AND entitlement.sku IN ('ZIWEI-IDENTITY-P0', 'ZIWEI-NATAL-EXCERPT-P0')
  AND origin.sku IN ('ZIWEI-IDENTITY-P0', 'ZIWEI-NATAL-EXCERPT-P0')
ORDER BY entitlement.id,
  CASE WHEN reservation.status IN ('html_ready', 'pdf_pending', 'complete') THEN 0 ELSE 1 END,
  reservation.created_at, reservation.id
ON CONFLICT (entitlement_id) DO NOTHING;
