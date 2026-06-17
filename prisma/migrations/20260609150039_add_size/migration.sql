-- AlterEnum
ALTER TYPE "Measurement" ADD VALUE 'DAY';

-- DropForeignKey
ALTER TABLE "complaint_waste_categories" DROP CONSTRAINT "complaint_waste_categories_complaint_id_fkey";

-- DropForeignKey
ALTER TABLE "complaint_waste_categories" DROP CONSTRAINT "complaint_waste_categories_waste_category_id_fkey";

-- AddForeignKey
ALTER TABLE "complaint_waste_categories" ADD CONSTRAINT "complaint_waste_categories_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_waste_categories" ADD CONSTRAINT "complaint_waste_categories_waste_category_id_fkey" FOREIGN KEY ("waste_category_id") REFERENCES "waste_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
