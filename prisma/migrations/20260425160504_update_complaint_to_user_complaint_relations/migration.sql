/*
  Warnings:

  - You are about to drop the column `created_at` on the `complaints` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `complaints` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `complaints` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `complaints` table. All the data in the column will be lost.
  - You are about to drop the `complaint_captures` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `date` to the `complaints` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geospatial` to the `complaints` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `complaints` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "complaint_captures" DROP CONSTRAINT "complaint_captures_complaint_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "complaint_captures" DROP CONSTRAINT "complaint_captures_complaint_id_fkey";

-- DropForeignKey
ALTER TABLE "complaints" DROP CONSTRAINT "complaints_userId_fkey";

-- AlterTable
ALTER TABLE "complaints" DROP COLUMN "created_at",
DROP COLUMN "status",
DROP COLUMN "updated_at",
DROP COLUMN "userId",
ADD COLUMN     "attachment_id" TEXT,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "geospatial" JSONB NOT NULL,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "type" "ComplaintType" NOT NULL;

-- DropTable
DROP TABLE "complaint_captures";

-- CreateTable
CREATE TABLE "user_complaints" (
    "id" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "userId" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_complaints_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_complaints" ADD CONSTRAINT "user_complaints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_complaints" ADD CONSTRAINT "user_complaints_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "complaint_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
