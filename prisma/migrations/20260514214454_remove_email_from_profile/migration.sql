/*
  Warnings:

  - You are about to drop the column `email` on the `profiles` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "profiles_email_key";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "email";
