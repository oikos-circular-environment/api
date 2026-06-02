-- Add new columns to complaints with defaults for existing data
ALTER TABLE "complaints"
  ADD COLUMN IF NOT EXISTS "date" TIMESTAMP(3) NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "geospatial" JSONB NOT NULL DEFAULT '{}';

-- Migrate date and geospatial from the most recent capture per complaint
UPDATE "complaints" c
SET
  "date" = cap.date,
  "geospatial" = cap.geospatial
FROM (
  SELECT DISTINCT ON (complaint_id)
    complaint_id,
    date,
    geospatial
  FROM complaint_captures
  ORDER BY complaint_id, created_at DESC
) cap
WHERE c.id = cap.complaint_id;

-- Add complaint_id to complaint_attachments (nullable initially for migration)
ALTER TABLE "complaint_attachments"
  ADD COLUMN IF NOT EXISTS "complaint_id" TEXT;

-- Migrate complaint_id from capture -> complaint
UPDATE "complaint_attachments" a
SET "complaint_id" = cap.complaint_id
FROM "complaint_captures" cap
WHERE a.capture_id = cap.id;

-- Set complaint_id NOT NULL after migration
ALTER TABLE "complaint_attachments"
  ALTER COLUMN "complaint_id" SET NOT NULL;

-- Add the foreign key constraint
ALTER TABLE "complaint_attachments"
  ADD CONSTRAINT "complaint_attachments_complaint_id_fkey"
  FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the old capture_id foreign key and column
ALTER TABLE "complaint_attachments"
  DROP CONSTRAINT IF EXISTS "complaint_attachments_capture_id_fkey";

ALTER TABLE "complaint_attachments"
  DROP COLUMN IF EXISTS "capture_id";

-- Drop the complaint_method column
ALTER TABLE "complaints"
  DROP COLUMN IF EXISTS "complaint_method";

-- Drop the complaint_captures table
DROP TABLE IF EXISTS "complaint_captures";

-- Remove the DEFAULT now() we added for migration (column stays, just remove default)
ALTER TABLE "complaints"
  ALTER COLUMN "date" DROP DEFAULT,
  ALTER COLUMN "geospatial" DROP DEFAULT;
