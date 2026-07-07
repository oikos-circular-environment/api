# T23 — `cli.ts` reestruturado — composition root único

**Status:** ⬜ Pendente
**Depende de:** T11, T21, T22
**Arquivos:** `cli/cli.ts`

## Checklist

- [ ] Flags via `parseArgs` renomeadas/novas: `residents: { type: "string" }` (NOVO, piso opcional), `companies: { type: "string" }` (substitui `target`), `complaints: { type: "string" }` (substitui `complaints-target`) — todas numéricas, sem flags booleanas de dataset
- [ ] `DEFAULT_COMPANIES_TARGET`/`DEFAULT_COMPLAINTS_TARGET` (constantes nomeadas) usados quando a respectiva flag/prompt é omitida em modo não-interativo
- [ ] Modo interativo sem as flags: prompts em sequência via `promptTarget("moradores")`, `promptTarget("empresas", DEFAULT_COMPANIES_TARGET)`, `promptTarget("denúncias", DEFAULT_COMPLAINTS_TARGET)`
- [ ] Sem `resolveDatasets()`/`promptDatasets()`/tipo `Dataset` — removidos desta versão
- [ ] Instancia `ResolveCityUseCase` e `ResolveCityResidentsUseCase` uma única vez por cidade (compartilhados), passando `{ companiesTarget, complaintsTarget, residentsFloor: residents }` para `computeResidentPoolSize`
- [ ] Uma única `Listr<CityPipelineCtx>` por cidade: tasks "Resolvendo cidade" e "Resolvendo moradores da cidade" sempre executam; tasks dos ramos de empresas/denúncias usam `enabled: (ctx) => ctx.companiesTarget > 0` / `ctx.complaintsTarget > 0`
- [ ] Se o pool de moradores precisar ser ajustado para cima (piso `--residents` menor que o mínimo exigido por `companiesTarget`), uma nota é exibida no output do CLI (não falha silenciosamente)
- [ ] Isolamento de falha por cidade mantido: try/catch no loop externo de `runCli`, `exitOnError` default (`true`) por lista
- [ ] Teste manual: rodar `--city=<cidade> --state=<uf> --residents=15 --companies=10 --complaints=100` contra uma cidade real e conferir os três arquivos gerados (`prisma/seeds/city-residents/<slug>.json`, `prisma/seeds/recycling-companies/<slug>.json`, `prisma/seeds/complaints/<slug>.json`); testar também `--companies=0 --complaints=50` numa cidade que já tem empresas, confirmando que o pool de moradores existente é reaproveitado
