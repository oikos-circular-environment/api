/*
  Warnings:

  - You are about to drop the column `updated_at` on the `user_complaints` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_complaints` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `user_complaints` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_complaints" DROP CONSTRAINT "user_complaints_userId_fkey";

-- AlterTable
ALTER TABLE "user_complaints" DROP COLUMN "updated_at",
DROP COLUMN "userId",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "user_complaints" ADD CONSTRAINT "user_complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
