-- AlterTable
ALTER TABLE "supports"
  ADD COLUMN "moderated_by" TEXT,
  ADD COLUMN "moderated_at" TIMESTAMP(3),
  ADD COLUMN "reason" TEXT;

-- AlterTable
ALTER TABLE "denunciations"
  ADD COLUMN "moderated_by" TEXT,
  ADD COLUMN "moderated_at" TIMESTAMP(3),
  ADD COLUMN "reason" TEXT;

-- AddForeignKey
ALTER TABLE "supports" ADD CONSTRAINT "supports_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denunciations" ADD CONSTRAINT "denunciations_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
