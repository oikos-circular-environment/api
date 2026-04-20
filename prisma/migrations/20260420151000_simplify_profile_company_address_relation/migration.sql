ALTER TABLE "profiles" ADD COLUMN "address_id" TEXT;
ALTER TABLE "companies" ADD COLUMN "address_id" TEXT;

UPDATE "profiles" AS p
SET "address_id" = pa."address_id"
FROM "profile_addresses" AS pa
WHERE pa."profile_id" = p."id";

UPDATE "companies" AS c
SET "address_id" = ca."address_id"
FROM "company_addresses" AS ca
WHERE ca."company_id" = c."id";

ALTER TABLE "profiles"
ADD CONSTRAINT "profiles_address_id_key" UNIQUE ("address_id");

ALTER TABLE "companies"
ADD CONSTRAINT "companies_address_id_key" UNIQUE ("address_id");

ALTER TABLE "profiles"
ADD CONSTRAINT "profiles_address_id_fkey"
FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "companies"
ADD CONSTRAINT "companies_address_id_fkey"
FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "profile_addresses";
DROP TABLE "company_addresses";
