/*
  Warnings:

  - You are about to drop the column `sub_items` on the `company_services` table. All the data in the column will be lost.
  - You are about to drop the column `waste_type` on the `company_services` table. All the data in the column will be lost.
  - You are about to drop the column `sub_items` on the `company_wastes` table. All the data in the column will be lost.
  - You are about to drop the column `waste_type` on the `company_wastes` table. All the data in the column will be lost.
  - Made the column `latitude` on table `addresses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `addresses` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `waste_category_id` to the `company_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `waste_category_id` to the `company_wastes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HazardLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "SubcategoryType" AS ENUM ('INCLUDE', 'EXCLUDE');

-- AlterTable
ALTER TABLE "addresses" ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL;

-- AlterTable
ALTER TABLE "company_services" DROP COLUMN "sub_items",
DROP COLUMN "waste_type",
ADD COLUMN     "waste_category_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "company_wastes" DROP COLUMN "sub_items",
DROP COLUMN "waste_type",
ADD COLUMN     "waste_category_id" TEXT NOT NULL;

-- DropEnum
DROP TYPE "ComplaintMethod";

-- DropEnum
DROP TYPE "WasteType";

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

-- AddForeignKey
ALTER TABLE "waste_subcategories" ADD CONSTRAINT "waste_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "waste_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_wastes" ADD CONSTRAINT "company_wastes_waste_category_id_fkey" FOREIGN KEY ("waste_category_id") REFERENCES "waste_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_services" ADD CONSTRAINT "company_services_waste_category_id_fkey" FOREIGN KEY ("waste_category_id") REFERENCES "waste_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
