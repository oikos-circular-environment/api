-- Drop old unique constraint (complaint_id, resolver_user_id)
DROP INDEX IF EXISTS "complaint_resolutions_complaint_id_resolver_user_id_key";

-- Add new unique constraint (complaint_id, resolver_user_id, company_id)
-- Covers rows where company_id IS NOT NULL
ALTER TABLE "complaint_resolutions"
  ADD CONSTRAINT "complaint_resolutions_complaint_id_resolver_user_id_company_id_key"
  UNIQUE ("complaint_id", "resolver_user_id", "company_id");

-- Partial unique index to enforce uniqueness when company_id IS NULL (personal resolutions)
-- PostgreSQL UNIQUE constraints treat NULL != NULL, so this index is required separately
CREATE UNIQUE INDEX "complaint_resolutions_personal_unique"
  ON "complaint_resolutions" ("complaint_id", "resolver_user_id")
  WHERE "company_id" IS NULL;
