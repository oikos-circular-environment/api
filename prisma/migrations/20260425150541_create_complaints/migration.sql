-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('IRREGULAR_DISPOSAL', 'DEFORESTATION', 'BURNING', 'VACANT_LOT');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplaintCaptureMode" AS ENUM ('PHOTO', 'VIDEO');

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_captures" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "ComplaintType" NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "observations" TEXT,
    "geospatial" JSONB NOT NULL,
    "complaint_attachment_id" TEXT NOT NULL,
    "complaint_id" TEXT,

    CONSTRAINT "complaint_captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_attachments" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "base64" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ComplaintCaptureMode" NOT NULL DEFAULT 'PHOTO',

    CONSTRAINT "complaint_attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_captures" ADD CONSTRAINT "complaint_captures_complaint_attachment_id_fkey" FOREIGN KEY ("complaint_attachment_id") REFERENCES "complaint_attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_captures" ADD CONSTRAINT "complaint_captures_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
