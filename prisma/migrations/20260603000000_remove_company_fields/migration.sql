-- Remove deprecated fields from companies table
ALTER TABLE "companies" DROP COLUMN IF EXISTS "is_headquarters";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "accept_appointments";
ALTER TABLE "companies" DROP COLUMN IF EXISTS "description";

-- Make business_name required (NOT NULL)
UPDATE "companies" SET "business_name" = "corporate_name" WHERE "business_name" IS NULL;
ALTER TABLE "companies" ALTER COLUMN "business_name" SET NOT NULL;
