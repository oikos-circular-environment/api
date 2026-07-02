-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('ONG', 'COMPANY', 'GOVERNMENT', 'COLLECTOR');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "Measurement" AS ENUM ('DAY', 'KG', 'L', 'UNIT', 'M', 'M2', 'M3', 'ML');

-- CreateEnum
CREATE TYPE "HazardLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "SubcategoryType" AS ENUM ('INCLUDE', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'RESOLVED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ComplaintVoteType" AS ENUM ('RESOLVED', 'NOT_RESOLVED');

-- CreateEnum
CREATE TYPE "ComplaintCaptureMode" AS ENUM ('PHOTO', 'VIDEO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deletion_job_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "address_id" TEXT,
    "profile_image_id" TEXT,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "identity_type" "IdentityType" NOT NULL,
    "company_type" "CompanyType" NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "business_name" TEXT NOT NULL,
    "corporate_name" TEXT NOT NULL,
    "email" TEXT,
    "phones" TEXT[],
    "started_activity_in" TIMESTAMP(3) NOT NULL,
    "is_company_valid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "address_id" TEXT,
    "user_id" TEXT NOT NULL,
    "avatar_id" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "company_avatars" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_avatars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "district" TEXT NOT NULL,
    "city_ibge_id" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "state_ibge_id" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location" geography(Point, 4326),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "waste_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "observations" TEXT,
    "hazard_levels" "HazardLevel"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waste_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_subcategories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "observations" TEXT,
    "hazard_level" "HazardLevel" NOT NULL,
    "type" "SubcategoryType" NOT NULL DEFAULT 'INCLUDE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "waste_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_wastes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "unit" "Measurement" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company_id" TEXT NOT NULL,
    "waste_category_id" TEXT NOT NULL,

    CONSTRAINT "company_wastes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "unit" "Measurement" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company_id" TEXT NOT NULL,
    "waste_category_id" TEXT NOT NULL,

    CONSTRAINT "company_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "date" TIMESTAMP(3) NOT NULL,
    "observations" TEXT,
    "geospatial" JSONB NOT NULL,
    "location" geography(Point, 4326),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_waste_categories" (
    "complaint_id" TEXT NOT NULL,
    "waste_category_id" TEXT NOT NULL,

    CONSTRAINT "complaint_waste_categories_pkey" PRIMARY KEY ("complaint_id","waste_category_id")
);

-- CreateTable
CREATE TABLE "complaint_attachments" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "base64" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ComplaintCaptureMode" NOT NULL DEFAULT 'PHOTO',
    "complaint_id" TEXT NOT NULL,

    CONSTRAINT "complaint_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_votes" (
    "id" TEXT NOT NULL,
    "vote_type" "ComplaintVoteType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "complaint_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_resolutions" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "resolver_user_id" TEXT NOT NULL,
    "company_id" TEXT,

    CONSTRAINT "complaint_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_resolution_attachments" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "base64" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ComplaintCaptureMode" NOT NULL DEFAULT 'PHOTO',
    "resolution_id" TEXT NOT NULL,

    CONSTRAINT "complaint_resolution_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_address_id_key" ON "profiles"("address_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_identity_key" ON "companies"("identity");

-- CreateIndex
CREATE UNIQUE INDEX "companies_address_id_key" ON "companies"("address_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_validations_company_id_key" ON "company_validations"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_business_hours_company_id_day_of_week_key" ON "company_business_hours"("company_id", "day_of_week");

-- CreateIndex
CREATE INDEX "complaints_user_id_created_at_idx" ON "complaints"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "complaint_votes_complaint_id_user_id_key" ON "complaint_votes"("complaint_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "complaint_resolutions_complaint_id_resolver_user_id_company_key" ON "complaint_resolutions"("complaint_id", "resolver_user_id", "company_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_profile_image_id_fkey" FOREIGN KEY ("profile_image_id") REFERENCES "profile_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "company_avatars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_validations" ADD CONSTRAINT "company_validations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_business_hours" ADD CONSTRAINT "company_business_hours_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hour_time_slots" ADD CONSTRAINT "business_hour_time_slots_business_hour_id_fkey" FOREIGN KEY ("business_hour_id") REFERENCES "company_business_hours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_subcategories" ADD CONSTRAINT "waste_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "waste_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_wastes" ADD CONSTRAINT "company_wastes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_wastes" ADD CONSTRAINT "company_wastes_waste_category_id_fkey" FOREIGN KEY ("waste_category_id") REFERENCES "waste_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_services" ADD CONSTRAINT "company_services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_services" ADD CONSTRAINT "company_services_waste_category_id_fkey" FOREIGN KEY ("waste_category_id") REFERENCES "waste_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_waste_categories" ADD CONSTRAINT "complaint_waste_categories_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_waste_categories" ADD CONSTRAINT "complaint_waste_categories_waste_category_id_fkey" FOREIGN KEY ("waste_category_id") REFERENCES "waste_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_votes" ADD CONSTRAINT "complaint_votes_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_votes" ADD CONSTRAINT "complaint_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_resolutions" ADD CONSTRAINT "complaint_resolutions_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_resolutions" ADD CONSTRAINT "complaint_resolutions_resolver_user_id_fkey" FOREIGN KEY ("resolver_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_resolutions" ADD CONSTRAINT "complaint_resolutions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_resolution_attachments" ADD CONSTRAINT "complaint_resolution_attachments_resolution_id_fkey" FOREIGN KEY ("resolution_id") REFERENCES "complaint_resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Spatial indexes (GiST — not generated by Prisma for Unsupported type fields)
CREATE INDEX "addresses_location_gist_idx" ON "addresses" USING GIST ("location");
CREATE INDEX "complaints_location_gist_idx" ON "complaints" USING GIST ("location");
