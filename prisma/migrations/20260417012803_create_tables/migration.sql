-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('ONG', 'COMPANY', 'GOVERNMENT', 'COLLECTOR');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "Measurement" AS ENUM ('KG', 'L', 'UNIT', 'M', 'M2', 'M3', 'ML');

-- CreateEnum
CREATE TYPE "WasteType" AS ENUM ('RECYCLABLE', 'GARBAGE');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_collector" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "identity_type" "IdentityType" NOT NULL,
    "company_type" "CompanyType" NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "is_headquarters" BOOLEAN NOT NULL DEFAULT false,
    "business_name" TEXT,
    "corporate_name" TEXT NOT NULL,
    "accept_appointments" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "phones" TEXT[],
    "started_activity_in" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_addresses" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "profile_id" TEXT NOT NULL,
    "address_id" TEXT NOT NULL,

    CONSTRAINT "profile_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_addresses" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company_id" TEXT NOT NULL,
    "address_id" TEXT NOT NULL,

    CONSTRAINT "company_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_business_hours" (
    "id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "is_open" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "company_business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_hour_time_slots" (
    "id" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "business_hour_id" TEXT NOT NULL,

    CONSTRAINT "business_hour_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_wastes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "unit" "Measurement" NOT NULL,
    "waste_type" "WasteType" NOT NULL,
    "sub_items" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "company_wastes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "unit" "Measurement" NOT NULL,
    "waste_type" "WasteType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "observations" TEXT,
    "sub_items" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "company_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_cpf_key" ON "profiles"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_identity_key" ON "companies"("identity");

-- CreateIndex
CREATE UNIQUE INDEX "profile_addresses_profile_id_key" ON "profile_addresses"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_addresses_address_id_key" ON "profile_addresses"("address_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_addresses_company_id_key" ON "company_addresses"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_addresses_address_id_key" ON "company_addresses"("address_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_business_hours_company_id_day_of_week_key" ON "company_business_hours"("company_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_addresses" ADD CONSTRAINT "profile_addresses_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_addresses" ADD CONSTRAINT "profile_addresses_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_business_hours" ADD CONSTRAINT "company_business_hours_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hour_time_slots" ADD CONSTRAINT "business_hour_time_slots_business_hour_id_fkey" FOREIGN KEY ("business_hour_id") REFERENCES "company_business_hours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_wastes" ADD CONSTRAINT "company_wastes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_services" ADD CONSTRAINT "company_services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
