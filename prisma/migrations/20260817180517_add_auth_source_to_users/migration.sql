-- AlterTable
ALTER TABLE "users" ADD COLUMN "auth_source" TEXT NOT NULL DEFAULT 'better_auth';

-- Backfill: todos os usuarios existentes ate aqui vieram do seed (prisma.user.create
-- direto, nunca passaram pela API real do Better Auth) - marcar "default" independente
-- de terem Account pareado ou nao. Novos usuarios (v1 via PrismaUsersRepository, v2 via
-- auth.api.*) passam a setar auth_source explicitamente a partir de agora.
UPDATE "users" SET "auth_source" = 'default';
