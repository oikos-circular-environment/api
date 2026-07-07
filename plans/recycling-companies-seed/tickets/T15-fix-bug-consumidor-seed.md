# T15 — Fix do bug no consumidor de seed

**Status:** ✅ Concluído
**Depende de:** T1
**Arquivos:** `prisma/seeds/recycling-companies.ts`

## Checklist

- [x] Trocado `DATA_PATH` por `SEEDS_DIR` + `readdirSync` (itera todos os `.json` do diretório, loga total por arquivo)
- [x] Interface local `CompanySeed` estendida com `wastes`/`services`
- [x] Removidas `DEFAULT_WASTES`/`DEFAULT_SERVICES`; loops agora iteram `data.wastes`/`data.services`
- [x] `CompanyValidation.wastes`/`.services` refletem `data.wastes.length > 0`/`data.services.length > 0`
- [x] Mensagem de erro atualizada para apontar `scripts/recycling-companies/index.ts` (script antigo removido em T14)
- [x] Rodado `npm run seed` localmente (Postgres via docker compose, migração aplicada com `prisma migrate deploy`) contra um seed de teste (Poconé, 6 empresas) — inserção bem-sucedida, `company_wastes` variando por empresa (2 a 5 itens, não mais fixo em 4), `company_validations.wastes`/`.services` refletindo os dados reais, `is_company_valid` computado corretamente
- [x] Idempotência confirmada — segunda execução mostra tudo como `↷ (já existe)`
