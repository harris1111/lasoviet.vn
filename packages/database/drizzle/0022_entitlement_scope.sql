ALTER TABLE "commerce_entitlements" ADD COLUMN "scope" jsonb;
--> statement-breakpoint
UPDATE "commerce_entitlements"
SET "scope" = '{"sections":["overview","coreAxis","strengthsAndTensions","practicalDirection","keyConfigurations","palaceReadings","thematicSynthesis"]}'::jsonb
WHERE "sku" = 'ZIWEI-IDENTITY-P0' AND "scope" IS NULL;
--> statement-breakpoint
UPDATE "commerce_entitlements"
SET "scope" = '{"sections":["overview","coreAxis","strengthsAndTensions","practicalDirection"]}'::jsonb
WHERE "sku" = 'ZIWEI-NATAL-EXCERPT-P0' AND "scope" IS NULL;
--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ALTER COLUMN "scope" SET NOT NULL;
