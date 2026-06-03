-- Add is_company_valid to companies
ALTER TABLE "companies" ADD COLUMN "is_company_valid" BOOLEAN NOT NULL DEFAULT false;

-- Create company_validations table
CREATE TABLE "company_validations" (
    "id" TEXT NOT NULL,
    "general_registration" BOOLEAN NOT NULL DEFAULT false,
    "address" BOOLEAN NOT NULL DEFAULT false,
    "business_hours" BOOLEAN NOT NULL DEFAULT false,
    "wastes" BOOLEAN NOT NULL DEFAULT false,
    "services" BOOLEAN NOT NULL DEFAULT false,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "company_validations_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on company_id (1:1 relation)
CREATE UNIQUE INDEX "company_validations_company_id_key" ON "company_validations"("company_id");

-- Foreign key to companies
ALTER TABLE "company_validations" ADD CONSTRAINT "company_validations_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed one CompanyValidation row per existing company (all fields default false)
INSERT INTO "company_validations" ("id", "company_id")
SELECT gen_random_uuid(), "id" FROM "companies";
