/*
  Warnings:

  - You are about to drop the column `status` on the `complaint_captures` table. All the data in the column will be lost.
  - Made the column `complaint_id` on table `complaint_captures` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `complaints` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `complaints` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "ComplaintStatus" ADD VALUE 'CANCELED';

-- DropForeignKey
ALTER TABLE "complaint_captures" DROP CONSTRAINT "complaint_captures_complaint_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "complaint_captures" DROP CONSTRAINT "complaint_captures_complaint_id_fkey";

-- DropForeignKey
ALTER TABLE "complaints" DROP CONSTRAINT "complaints_userId_fkey";

-- AlterTable
ALTER TABLE "complaint_captures" DROP COLUMN "status",
ALTER COLUMN "complaint_attachment_id" DROP NOT NULL,
ALTER COLUMN "complaint_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_captures" ADD CONSTRAINT "complaint_captures_complaint_attachment_id_fkey" FOREIGN KEY ("complaint_attachment_id") REFERENCES "complaint_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_captures" ADD CONSTRAINT "complaint_captures_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
