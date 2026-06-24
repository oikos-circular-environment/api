-- CreateIndex
CREATE INDEX "complaints_location_gist_idx" ON "complaints" USING GIST ("location");
