# T11 — Integra atribuição de donos ao pipeline de empresas

**Status:** ⬜ Pendente
**Depende de:** T8, T10
**Arquivos:** `cli/companies/use-cases/generate-city-seed-use-case.ts` (+spec), `cli/companies/recycling-seed-pipeline.spec.ts`

## Checklist

- [ ] `GenerateCitySeedUseCase` ganha uma fase `assignOwners(companies, residents)` chamada DEPOIS de `validateAndRepair` (a lista só está "fechada" ali — reais + sintéticas + reparadas) e ANTES de `writeSeed`
- [ ] `execute()` (atalho de conveniência) encadeia a nova fase sem mudar a assinatura pública das fases já existentes
- [ ] `recycling-seed-pipeline.spec.ts` passa a injetar um `ResolveCityResidentsUseCase` fake (ou os fakes de `writer`/`generator` que ele compõe) e assertar que todo `CompanySeed` final tem `owner_resident_index` válido (dentro dos limites do array de moradores) e que nenhum índice aparece mais de 2 vezes entre as empresas geradas
- [ ] `npm run test -- recycling-seed-pipeline` passa
