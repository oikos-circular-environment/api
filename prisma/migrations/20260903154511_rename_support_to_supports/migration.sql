-- RenameTable
ALTER TABLE "support_requests" RENAME TO "supports";
ALTER TABLE "support_request_attachments" RENAME TO "support_attachments";

-- RenameColumn
ALTER TABLE "support_attachments" RENAME COLUMN "support_request_id" TO "support_id";

-- RenameForeignKey
ALTER TABLE "supports" RENAME CONSTRAINT "support_requests_user_id_fkey" TO "supports_user_id_fkey";
ALTER TABLE "support_attachments" RENAME CONSTRAINT "support_request_attachments_support_request_id_fkey" TO "support_attachments_support_id_fkey";

-- RenamePrimaryKey
ALTER TABLE "supports" RENAME CONSTRAINT "support_requests_pkey" TO "supports_pkey";
ALTER TABLE "support_attachments" RENAME CONSTRAINT "support_request_attachments_pkey" TO "support_attachments_pkey";

-- CreateEnum
CREATE TYPE "ModerationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SupportType" AS ENUM ('ERROR', 'SUPPORT', 'IMPROVEMENT');

-- RewriteEnum ModerationStatus (no rows use APPROVED/REJECTED; PENDING maps to OPEN)
ALTER TYPE "ModerationStatus" RENAME TO "ModerationStatus_old";
CREATE TYPE "ModerationStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED', 'RESOLVED');

ALTER TABLE "supports" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "supports" ALTER COLUMN "status" TYPE "ModerationStatus" USING (
  CASE "status"::text
    WHEN 'PENDING' THEN 'OPEN'
    ELSE "status"::text
  END
)::"ModerationStatus";
ALTER TABLE "supports" ALTER COLUMN "status" SET DEFAULT 'OPEN';

DROP TYPE "ModerationStatus_old";

-- AlterTable
ALTER TABLE "supports"
  ADD COLUMN "type" "SupportType" NOT NULL DEFAULT 'SUPPORT',
  ADD COLUMN "severity" "ModerationSeverity",
  ADD COLUMN "environment" JSONB,
  ADD COLUMN "reporter_email" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3);

-- Backfill updated_at with created_at so pre-existing rows are never mistaken for "seen"
UPDATE "supports" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

ALTER TABLE "supports" ALTER COLUMN "updated_at" SET NOT NULL;
