CREATE OR REPLACE FUNCTION "prevent_commerce_order_invoice_mutation"() RETURNS trigger AS $$
BEGIN
  IF NEW.invoice_number IS DISTINCT FROM OLD.invoice_number THEN
    RAISE EXCEPTION 'commerce_orders.invoice_number is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "commerce_orders_invoice_immutable" ON "commerce_orders";
--> statement-breakpoint
CREATE TRIGGER "commerce_orders_invoice_immutable"
BEFORE UPDATE ON "commerce_orders"
FOR EACH ROW EXECUTE FUNCTION "prevent_commerce_order_invoice_mutation"();
--> statement-breakpoint
DROP INDEX IF EXISTS "commerce_orders_chart_sku_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_chart_sku_unique" ON "commerce_orders" USING btree ("chart_id","sku") WHERE status = 'pending';
