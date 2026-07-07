# T13 — Use-case orquestrador + CLI/entry point

**Status:** ✅ Concluído
**Depende de:** T10, T11, T12
**Arquivos:** `use-cases/generate-city-seed-use-case.ts` (+spec), `cli.ts`, `index.ts`

## Checklist

- [x] `class GenerateCitySeedUseCase(resolveCity, fetchCompanies, syntheticGenerator, writer)`
- [x] Spec com fakes (compõe as classes reais `ResolveCityUseCase`/`FetchCityCompaniesUseCase`/`SyntheticCompanyGenerator`, fakeando só as fronteiras de I/O — providers e writer) cobrindo: sem `target` (só reais), com `target` maior que o real (completa com sintético), `target` menor/igual ao real (não completa)
- [x] `cli.ts` — `parseArgs` nativo (`--city`, `--state`, `--target`, `--force`, repetível para múltiplas cidades, zipping por índice)
- [x] `cli.ts` como composition root: instancia providers/services concretos e injeta nos use-cases
- [x] `index.ts` — entry point (`dotenv/config` + `cli`)
- [x] Teste manual: rodado contra Poconé-MT real com `GOOGLE_PLACES_API_KEY` do `.env` local (`--target=8`) — 1 empresa real (Informatizi, com endereço/telefone/site reais do Google) + 7 sintéticas variadas (COMPANY/GOVERNMENT/COLLECTOR, CPF só para COLLECTOR, resíduos/serviços variados). Artefato de teste removido depois (não fazia parte do escopo desta etapa gerar Poconé permanentemente)
