-- Migrate existing status values
UPDATE complaints SET status = 'OPEN' WHERE status = 'IN_PROGRESS';
UPDATE complaints SET status = 'CANCELED' WHERE status = 'REJECTED';

-- Remove ComplaintType usage before dropping column
ALTER TABLE complaints DROP COLUMN IF EXISTS type;

-- Rebuild ComplaintStatus enum
ALTER TABLE complaints ALTER COLUMN status DROP DEFAULT;
CREATE TYPE "ComplaintStatus_new" AS ENUM ('OPEN', 'RESOLVED', 'CANCELED');
ALTER TABLE complaints ALTER COLUMN status TYPE "ComplaintStatus_new" USING status::text::"ComplaintStatus_new";
DROP TYPE IF EXISTS "ComplaintStatus";
ALTER TYPE "ComplaintStatus_new" RENAME TO "ComplaintStatus";
ALTER TABLE complaints ALTER COLUMN status SET DEFAULT 'OPEN'::"ComplaintStatus";

-- Drop ComplaintType enum
DROP TYPE IF EXISTS "ComplaintType";

-- Create complaint_waste_categories join table
CREATE TABLE IF NOT EXISTS "complaint_waste_categories" (
    "complaint_id" TEXT NOT NULL,
    "waste_category_id" TEXT NOT NULL,
    CONSTRAINT "complaint_waste_categories_pkey" PRIMARY KEY ("complaint_id", "waste_category_id"),
    CONSTRAINT "complaint_waste_categories_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE,
    CONSTRAINT "complaint_waste_categories_waste_category_id_fkey" FOREIGN KEY ("waste_category_id") REFERENCES "waste_categories"("id") ON DELETE RESTRICT
);
