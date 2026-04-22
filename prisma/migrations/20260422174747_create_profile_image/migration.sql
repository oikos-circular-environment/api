-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "profile_image_id" TEXT;

-- CreateTable
CREATE TABLE "profile_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "base64" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_profile_image_id_fkey" FOREIGN KEY ("profile_image_id") REFERENCES "profile_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
