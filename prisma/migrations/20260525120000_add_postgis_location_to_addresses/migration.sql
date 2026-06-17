-- Enable PostGIS extension (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location column to addresses
ALTER TABLE "addresses"
  ADD COLUMN "location" public.geography(Point, 4326);

-- Spatial index for ST_DWithin performance
CREATE INDEX "addresses_location_gist_idx"
  ON "addresses" USING GIST ("location");

-- Backfill existing records that already have lat/lon
UPDATE "addresses"
SET "location" = public.ST_SetSRID(public.ST_Point("longitude", "latitude"), 4326)
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
