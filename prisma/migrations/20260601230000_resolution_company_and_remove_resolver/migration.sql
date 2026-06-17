-- AlterTable: remove resolver field and add company_id to complaint_resolutions
ALTER TABLE "complaint_resolutions" DROP COLUMN "resolver";
ALTER TABLE "complaint_resolutions" ADD COLUMN "company_id" TEXT;

-- AddForeignKey
ALTER TABLE "complaint_resolutions" ADD CONSTRAINT "complaint_resolutions_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
