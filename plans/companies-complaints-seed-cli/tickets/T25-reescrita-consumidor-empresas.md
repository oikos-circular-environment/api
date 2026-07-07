# T25 — Reescrita de `prisma/seeds/recycling-companies.ts`

**Status:** ⬜ Pendente
**Depende de:** T24
**Arquivos:** `prisma/seeds/recycling-companies.ts`

## Checklist

- [ ] Para cada arquivo de empresas, ler o `city-residents/<slug>.json` correspondente (mesmo slug de cidade)
- [ ] Para cada `CompanySeed` com `owner_resident_index` presente: resolver `residents[owner_resident_index]` → `upsertCityResident(prisma, resident, passwordHash)` → usar o `userId` retornado como `company.user_id` (substitui a criação de `user` descartável inline que existe hoje)
- [ ] Branch de **fallback explícito e comentado** para `CompanySeed` SEM `owner_resident_index` (JSONs gerados antes desta mudança): mantém o comportamento antigo (cria um `user` descartável por empresa, email `${slug}.${i+1}@oikos.seed`) — comentário no código deixando claro que é suporte a dado legado, não uma feature permanente
- [ ] Resto do fluxo inalterado: `Address` da EMPRESA (distinto do endereço do morador dono), `CompanyBusinessHour`, `CompanyWaste`/`CompanyService` (resolução `categoryByName`), `CompanyValidation`, idempotência por `identity`, `SEED_DRY_RUN`, `SEED_USER_PASSWORD`, contadores de resumo
- [ ] Teste manual com `SEED_DRY_RUN=true` confirma que nenhum erro de tipo/runtime aparece para um arquivo de empresas gerado com o novo formato (`owner_resident_index`) e para um arquivo legado (sem esse campo)
