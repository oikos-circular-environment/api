# T1 — Rename `scripts/recycling-companies/` → `cli/`, split `shared/`/`companies/`

**Status:** ⬜ Pendente
**Depende de:** —
**Arquivos:** `api/cli/shared/**`, `api/cli/companies/**`

## Checklist

- [ ] `git mv api/scripts/recycling-companies api/cli/companies` (preserva histórico como ponto de partida)
- [ ] Extrair de `cli/companies/` para `cli/shared/`: `entities/city-context.ts`, `entities/ibge-municipio.ts`, `providers/geocoding-provider.ts` + `google-geocoding-provider.ts`, `providers/municipio-provider.ts` + `ibge-municipio-provider.ts`, `use-cases/resolve-city-use-case.ts` (+spec), `env.ts`
- [ ] `cli.ts`/`index.ts`/`cli/prompts.ts`/`requests/` ficam na raiz de `api/cli/` (não dentro de `companies/`)
- [ ] Ajustar profundidade de TODOS os imports relativos internos afetados pela mudança de nível (`cli/companies/services/x.ts` está um nível mais fundo que o antigo `scripts/recycling-companies/services/x.ts`; `cli/shared/...` também muda de profundidade em relação a `src/`)
- [ ] `npm run test -- cli` roda e todos os specs movidos continuam passando sem alteração de comportamento
- [ ] `npx tsc --noEmit` (ou equivalente) não acusa import quebrado em `cli/`
