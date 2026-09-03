-- CreateTable
CREATE TABLE "denunciations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "ModerationSeverity",
    "reporter_email" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "reporter_user_id" TEXT,
    "reported_user_id" TEXT,

    CONSTRAINT "denunciations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denunciation_attachments" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "base64" TEXT NOT NULL,
    "metadata" JSONB,
    "type" "ComplaintCaptureMode" NOT NULL DEFAULT 'PHOTO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "denunciation_id" TEXT NOT NULL,

    CONSTRAINT "denunciation_attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "denunciations" ADD CONSTRAINT "denunciations_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denunciations" ADD CONSTRAINT "denunciations_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denunciation_attachments" ADD CONSTRAINT "denunciation_attachments_denunciation_id_fkey" FOREIGN KEY ("denunciation_id") REFERENCES "denunciations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

