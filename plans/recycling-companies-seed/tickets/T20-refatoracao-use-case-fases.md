# T20 — Refatorar GenerateCitySeedUseCase em fases granulares

**Status:** ✅ Concluído
**Depende de:** T13
**Arquivos:** `use-cases/generate-city-seed-use-case.ts` (+spec)

## Checklist

- [x] Expostos 4 métodos públicos: `resolveCity`, `fetchRealCompanies`, `generateSynthetic`, `writeSeed`
- [x] `execute()` mantido como atalho de conveniência, encadeando os 4 métodos — comportamento idêntico ao anterior
- [x] Testes existentes (`generate-city-seed-use-case.spec.ts`, `recycling-seed-pipeline.spec.ts`) continuam passando sem alteração (só exercitam `execute()`)
- [x] Novos testes cobrindo cada método granular isoladamente (`resolveCity`, `fetchRealCompanies`, `generateSynthetic` com várias combinações de real/target, `writeSeed`)
- [x] `npm run test -- generate-city-seed-use-case` passa (7 testes, 4 novos)
