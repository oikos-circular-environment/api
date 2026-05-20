/*
  Warnings:

  - Added the required column `quantity` to the `company_wastes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "company_wastes" ADD COLUMN     "observations" TEXT,
ADD COLUMN     "quantity" DECIMAL(12,2) NOT NULL;
