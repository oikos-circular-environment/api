-- Dev environment: truncate existing complaint data before structural changes
-- (no production data at risk)
DELETE FROM "complaint_attachments";
DELETE FROM "user_complaints";
DELETE FROM "complaints";

-- CreateEnum
CREATE TYPE "ComplaintMethod" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "ComplaintVoteType" AS ENUM ('RESOLVED', 'NOT_RESOLVED');

-- DropForeignKey
ALTER TABLE "complaints" DROP CONSTRAINT "complaints_attachment_id_fkey";

-- DropForeignKey
ALTER TABLE "user_complaints" DROP CONSTRAINT "user_complaints_complaint_id_fkey";

-- DropForeignKey
ALTER TABLE "user_complaints" DROP CONSTRAINT "user_complaints_user_id_fkey";

-- DropIndex
DROP INDEX "companies_user_id_key";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "avatar_id" TEXT,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "complaint_attachments" ADD COLUMN     "capture_id" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "complaints" DROP COLUMN "attachment_id",
DROP COLUMN "date",
DROP COLUMN "geospatial",
DROP COLUMN "observations",
ADD COLUMN     "complaint_method" "ComplaintMethod" NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "event_group_id" TEXT,
ADD COLUMN     "location" geography(Point, 4326),
ADD COLUMN     "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "user_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "user_complaints";

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
CREATE TABLE "complaint_captures" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "observations" TEXT,
    "geospatial" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "complaint_id" TEXT NOT NULL,

    CONSTRAINT "complaint_captures_pkey" PRIMARY KEY ("id")
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
    "resolver" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "resolver_user_id" TEXT NOT NULL,

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
CREATE UNIQUE INDEX "complaint_votes_complaint_id_user_id_key" ON "complaint_votes"("complaint_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "complaint_resolutions_complaint_id_resolver_user_id_key" ON "complaint_resolutions"("complaint_id", "resolver_user_id");

-- Spatial index for ST_DWithin performance on complaints location
CREATE INDEX "complaints_location_gist_idx" ON "complaints" USING GIST ("location");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "company_avatars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_captures" ADD CONSTRAINT "complaint_captures_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_capture_id_fkey" FOREIGN KEY ("capture_id") REFERENCES "complaint_captures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_votes" ADD CONSTRAINT "complaint_votes_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_votes" ADD CONSTRAINT "complaint_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_resolutions" ADD CONSTRAINT "complaint_resolutions_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_resolutions" ADD CONSTRAINT "complaint_resolutions_resolver_user_id_fkey" FOREIGN KEY ("resolver_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_resolution_attachments" ADD CONSTRAINT "complaint_resolution_attachments_resolution_id_fkey" FOREIGN KEY ("resolution_id") REFERENCES "complaint_resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
