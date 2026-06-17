/*
  Warnings:

  - You are about to drop the column `event_group_id` on the `complaints` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "complaints" DROP COLUMN "event_group_id";
