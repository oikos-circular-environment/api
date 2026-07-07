# T16 — Migração do dataset legado de Rondonópolis

**Status:** ✅ Concluído
**Depende de:** T15
**Arquivos:** `scripts/recycling-companies/migrate-legacy-seed.ts`, `prisma/seeds/recycling-companies.json` (removido), `prisma/seeds/recycling-companies/rondonopolis-mt.json` (novo), `plans/market/03-tdd.md`, `plans/market/04-execution-plan.md`

## Checklist

- [x] `migrate-legacy-seed.ts` — transforma o JSON antigo (zero chamadas de rede), confirmado via scan prévio dos 48 registros que só existem os 4 nomes de resíduo esperados (`Papel e Papelão`, `Plástico`, `Metal`, `Vidro`) e que todas as `quantity` eram `"0.00"` e nenhum `services` preenchido
- [x] Mapeado `waste_type`/`name` legado → `waste_category_name` real (`Papel e Papelão→Papel / Papelão`, `Plástico→Plástico`, `Metal→Metal / Alumínio`, `Vidro→Vidro`)
- [x] Substituído `quantity: "0.00"` pelos valores padrão positivos (500/300/200/300)
- [x] Escrito `prisma/seeds/recycling-companies/rondonopolis-mt.json` (48 empresas), removido `prisma/seeds/recycling-companies.json` antigo
- [x] Confirmado que dados reais (identity, endereço, lat/lng, telefone) do registro "Bio Ecologica" foram preservados intactos (lat -16.4757009, lon -54.6684927 — batendo com a referência citada em `plans/market/03-tdd.md`)
- [x] Atualizadas referências de path em `plans/market/03-tdd.md` e `plans/market/04-execution-plan.md`
- [x] Rodado `npm run seed` com o dataset migrado completo (48 empresas) contra o banco local — todas inseridas com sucesso, `is_company_valid = true` para todas, idempotência confirmada na segunda execução
