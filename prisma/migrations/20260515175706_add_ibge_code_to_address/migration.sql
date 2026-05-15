/*
  Warnings:

  - Added the required column `city_ibge_id` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state_ibge_id` to the `addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "city_ibge_id" INTEGER NOT NULL,
ADD COLUMN     "state_ibge_id" INTEGER NOT NULL;
