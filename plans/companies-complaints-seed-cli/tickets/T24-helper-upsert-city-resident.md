# T24 — Helper compartilhado de upsert de morador

**Status:** ⬜ Pendente
**Depende de:** T5
**Arquivos:** `prisma/seeds/shared/upsert-city-resident.ts`

## Checklist

- [ ] `upsertCityResident(prisma, resident: CityResidentSeed, passwordHash: string): Promise<{ userId: string }>`
- [ ] Busca `prisma.user.findUnique({ where: { email: resident.email } })` ANTES de criar — se existir, retorna o `id` existente sem recriar nada (idempotência, mesmo padrão de `findUnique` por `identity` em `recycling-companies.ts`)
- [ ] Se não existir: cria `Address` (raw SQL `ST_SetSRID(ST_Point(...))` para popular `location`, mesmo padrão de `users.seed.ts`/`recycling-companies.ts`), depois `User` com `Profile` aninhado (`full_name`, `display_name`, `phone`, `address_id`)
- [ ] Usado por AMBOS os consumidores (T25, T26) — garante que o MESMO morador (mesmo email) nunca gera duas linhas de `User`, mesmo se referenciado primeiro pelo consumidor de empresas e depois pelo de denúncias (ou vice-versa)
- [ ] Não precisa de spec unitário próprio (mesmo padrão dos consumidores existentes em `prisma/seeds/`, que não têm `.spec.ts` — são verificados via `npm run seed` manual/`SEED_DRY_RUN`)
