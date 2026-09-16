import { sql } from "drizzle-orm";

export function buildBusinessMetricsQuery(input: {
  fromDate: string;
  toDate: string;
  nowMinus1hIso: string;
}) {
  return sql`
WITH days_series AS (
  SELECT to_char(d::date, \x27YYYY-MM-DD\x27) AS day_date
  FROM generate_series(${input.fromDate}::date, ${input.toDate}::date, \x271 day\x27::interval) d
),
all_real_paid_orders AS (
  SELECT o.id, o.owner_id, o.chart_id, o.sku, o.amount, o.currency, o.credited_from_order_id, o.paid_at,
    to_char(o.paid_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) AS paid_date
  FROM commerce_orders o
  WHERE o.paid_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM commerce_payment_events pe
      WHERE pe.order_id = o.id AND pe.status = \x27ORDER_PAID\x27 AND pe.amount = o.amount
        AND pe.currency = o.currency AND pe.provider_event_id NOT LIKE \x27disabled-autopay:%\x27
    )
    AND NOT EXISTS (
      SELECT 1 FROM commerce_payment_events pe_bad
      WHERE pe_bad.order_id = o.id AND pe_bad.provider_event_id LIKE \x27disabled-autopay:%\x27
    )
),
real_paid_summary AS (
  SELECT paid_date AS day_date, COUNT(*) AS real_paid_orders, COALESCE(SUM(amount), 0)::text AS revenue_vnd
  FROM all_real_paid_orders
  WHERE paid_date >= ${input.fromDate} AND paid_date <= ${input.toDate}
  GROUP BY paid_date
),
disabled_autopay_orders AS (
  SELECT to_char(o.paid_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) AS day_date,
    COUNT(DISTINCT o.id) AS count
  FROM commerce_orders o
  WHERE o.status = \x27paid\x27 AND o.paid_at IS NOT NULL
    AND to_char(o.paid_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) >= ${input.fromDate}
    AND to_char(o.paid_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) <= ${input.toDate}
    AND EXISTS (
      SELECT 1 FROM commerce_payment_events pe
      WHERE pe.order_id = o.id AND pe.provider_event_id LIKE \x27disabled-autopay:%\x27
    )
  GROUP BY to_char(o.paid_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27)
),
orders_created AS (
  SELECT to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) AS day_date, COUNT(*) AS count
  FROM commerce_orders o
  WHERE to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) >= ${input.fromDate}
    AND to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) <= ${input.toDate}
    AND NOT EXISTS (
      SELECT 1 FROM commerce_payment_events pe_bad
      WHERE pe_bad.order_id = o.id AND pe_bad.provider_event_id LIKE \x27disabled-autopay:%\x27
    )
  GROUP BY to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27)
),
payment_unmatched AS (
  SELECT to_char(received_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) AS day_date, COUNT(*) AS count
  FROM commerce_unmatched_payments
  WHERE to_char(received_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) >= ${input.fromDate}
    AND to_char(received_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) <= ${input.toDate}
  GROUP BY to_char(received_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27)
),
payment_pending_over_1h AS (
  SELECT to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) AS day_date, COUNT(*) AS count
  FROM commerce_orders
  WHERE status = \x27pending\x27 AND created_at <= ${input.nowMinus1hIso}::timestamptz
    AND to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) >= ${input.fromDate}
    AND to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) <= ${input.toDate}
  GROUP BY to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27)
),
self_claim_succeeded AS (
  SELECT to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) AS day_date, COUNT(*) AS count
  FROM commerce_payment_events pe
  WHERE match_method = \x27self_claim\x27 AND status = \x27ORDER_PAID\x27
    AND to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) >= ${input.fromDate}
    AND to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) <= ${input.toDate}
    AND NOT EXISTS (
      SELECT 1 FROM commerce_payment_events pe_bad
      WHERE pe_bad.order_id = pe.order_id AND pe_bad.provider_event_id LIKE \x27disabled-autopay:%\x27
    )
  GROUP BY to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27)
),
self_claim_failed AS (
  SELECT to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) AS day_date, COUNT(*) AS count
  FROM audit_logs
  WHERE action = \x27commerce.payment_self_claim.requested\x27
    AND reason_code IS NOT NULL AND reason_code != \x27claimed\x27
    AND to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) >= ${input.fromDate}
    AND to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) <= ${input.toDate}
  GROUP BY to_char(created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27)
),
reports_ready AS (
  SELECT to_char(rv.created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) AS day_date, COUNT(DISTINCT rv.id) AS count
  FROM report_versions rv
  JOIN report_reservations rr
    ON rr.report_id = rv.report_id AND rr.report_version_id = rv.report_version_id
   AND rr.entitlement_id = rv.entitlement_id AND rr.chart_version_id = rv.chart_version_id
   AND rr.evidence_version_id = rv.evidence_version_id AND rr.knowledge_version_id = rv.knowledge_version_id
   AND rr.prompt_version = rv.prompt_version AND rr.report_config_version = rv.report_config_version
   AND rr.locale = rv.locale AND rr.sku = rv.sku
  JOIN commerce_entitlements ce ON ce.id = rr.entitlement_id
  JOIN all_real_paid_orders rpo ON rpo.id = ce.order_id
  WHERE to_char(rv.created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) >= ${input.fromDate}
    AND to_char(rv.created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) <= ${input.toDate}
  GROUP BY to_char(rv.created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27)
),
paid_to_ready AS (
  SELECT to_char(rv.created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) AS day_date,
    AVG(GREATEST(0, EXTRACT(EPOCH FROM (rv.created_at - rpo.paid_at)))) AS avg_seconds
  FROM report_versions rv
  JOIN report_reservations rr
    ON rr.report_id = rv.report_id AND rr.report_version_id = rv.report_version_id
   AND rr.entitlement_id = rv.entitlement_id AND rr.chart_version_id = rv.chart_version_id
   AND rr.evidence_version_id = rv.evidence_version_id AND rr.knowledge_version_id = rv.knowledge_version_id
   AND rr.prompt_version = rv.prompt_version AND rr.report_config_version = rv.report_config_version
   AND rr.locale = rv.locale AND rr.sku = rv.sku
  JOIN commerce_entitlements ce ON ce.id = rr.entitlement_id
  JOIN all_real_paid_orders rpo ON rpo.id = ce.order_id
  WHERE to_char(rv.created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) >= ${input.fromDate}
    AND to_char(rv.created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27) <= ${input.toDate}
  GROUP BY to_char(rv.created_at AT TIME ZONE \x27Asia/Ho_Chi_Minh\x27, \x27YYYY-MM-DD\x27)
),
upgrades_within_7_days AS (
  SELECT u.paid_date AS day_date, COUNT(DISTINCT u.id) AS count
  FROM all_real_paid_orders u
  JOIN all_real_paid_orders s ON s.id = u.credited_from_order_id
  WHERE u.credited_from_order_id IS NOT NULL
    AND u.sku = \x27ZIWEI-IDENTITY-P0\x27
    AND s.sku = \x27ZIWEI-NATAL-EXCERPT-P0\x27
    AND u.paid_date >= ${input.fromDate} AND u.paid_date <= ${input.toDate}
    AND s.owner_id = u.owner_id AND s.chart_id = u.chart_id
    AND u.paid_at >= s.paid_at AND u.paid_at <= s.paid_at + INTERVAL \x277 days\x27
  GROUP BY u.paid_date
),
repeat_purchases AS (
  SELECT o.paid_date AS day_date, COUNT(DISTINCT o.id) AS count
  FROM all_real_paid_orders o
  WHERE o.credited_from_order_id IS NULL
    AND o.paid_date >= ${input.fromDate} AND o.paid_date <= ${input.toDate}
    AND EXISTS (
      SELECT 1 FROM all_real_paid_orders earlier
      WHERE earlier.owner_id = o.owner_id AND earlier.id <> o.id AND earlier.paid_at < o.paid_at
    )
  GROUP BY o.paid_date
)
SELECT
  ds.day_date AS date,
  COALESCE(oc.count, 0)::text AS "ordersCreated",
  COALESCE(rps.real_paid_orders, 0)::text AS "realPaidOrders",
  COALESCE(dao.count, 0)::text AS "disabledAutopayOrdersExcluded",
  COALESCE(rps.revenue_vnd, \x270\x27)::text AS "cashCollectedVnd",
  COALESCE(rps.revenue_vnd, \x270\x27)::text AS "recognizedDirectRevenueVnd",
  COALESCE(pu.count, 0)::text AS "paymentUnmatched",
  COALESCE(poh.count, 0)::text AS "paymentPendingOver1h",
  COALESCE(scs.count, 0)::text AS "selfClaimSucceeded",
  COALESCE(scf.count, 0)::text AS "selfClaimFailed",
  COALESCE(rr.count, 0)::text AS "reportsReady",
  COALESCE(upg.count, 0)::text AS "upgradesWithin7Days",
  COALESCE(rp.count, 0)::text AS "repeatPurchases",
  ptr.avg_seconds AS "averagePaidToReportReadySecondsRaw"
FROM days_series ds
LEFT JOIN orders_created oc ON oc.day_date = ds.day_date
LEFT JOIN real_paid_summary rps ON rps.day_date = ds.day_date
LEFT JOIN disabled_autopay_orders dao ON dao.day_date = ds.day_date
LEFT JOIN payment_unmatched pu ON pu.day_date = ds.day_date
LEFT JOIN payment_pending_over_1h poh ON poh.day_date = ds.day_date
LEFT JOIN self_claim_succeeded scs ON scs.day_date = ds.day_date
LEFT JOIN self_claim_failed scf ON scf.day_date = ds.day_date
LEFT JOIN reports_ready rr ON rr.day_date = ds.day_date
LEFT JOIN upgrades_within_7_days upg ON upg.day_date = ds.day_date
LEFT JOIN repeat_purchases rp ON rp.day_date = ds.day_date
LEFT JOIN paid_to_ready ptr ON ptr.day_date = ds.day_date
ORDER BY ds.day_date ASC;
`;
}
