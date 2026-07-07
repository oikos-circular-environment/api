# T26 — Novo `prisma/seeds/complaints.ts`

**Status:** ⬜ Pendente
**Depende de:** T12, T24
**Arquivos:** `prisma/seeds/complaints.ts`

## Checklist

- [ ] Lê todos os arquivos de `prisma/seeds/complaints/`, e para cada um o `city-residents/<slug>.json` correspondente (mesmo slug)
- [ ] Carrega `wasteCategories`/`categoryByName` (mesmo padrão de `recycling-companies.ts`)
- [ ] Materializa moradores referenciados de forma lazy: `Map<number, string>` (índice → `userId`) preenchido sob demanda via `upsertCityResident`, reaproveitado dentro do loop de um mesmo arquivo de cidade
- [ ] Por denúncia, em `$transaction`: cria `Complaint` (`user_id` = autor) + raw SQL de `location` (PostGIS) + `ComplaintWasteCategory[]` (resolvendo nome→id, ignorando com warning se não encontrado, mesmo padrão de wastes/services) + `ComplaintAttachment[]` (lendo o arquivo de `cli/assets/`, upload real via `makeStorageProvider().uploadFile`, `getFileUrl`, `base64` do buffer) + `ComplaintVote[]` (um por `VoteSeed`) + `ComplaintResolution[]` (resolvendo `PREFER_COMPANY` via `prisma.company.findFirst({ where: { user_id: resolverUserId } })` — se encontrar, usa `company.id`; senão, `company_id: null`)
- [ ] `SEED_DRY_RUN`/`SEED_USER_PASSWORD` reaproveitados (mesmo padrão de `recycling-companies.ts`); contadores de resumo (criadas/já existiam/inválidas/falharam) ao final
- [ ] Comentário explícito no código sobre o caso "nenhuma empresa encontrada para `PREFER_COMPANY`" (cidade sem empresas seedadas) — comportamento correto, cai para `company_id: null`, não é erro
- [ ] Teste manual: com MinIO rodando (`docker compose up minio createbuckets`), `npm run seed` cria denúncias com anexos cujas URLs abrem de verdade (conferir no MinIO console ou via `curl`)
