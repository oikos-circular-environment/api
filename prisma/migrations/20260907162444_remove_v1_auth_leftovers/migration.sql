-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "auth_source",
DROP COLUMN "password";

-- DropTable
DROP TABLE "refresh_tokens";

