# T18 — Provider IBGE estados (fetchUfs)

**Status:** ✅ Concluído
**Depende de:** T1, T2
**Arquivos:** `providers/municipio-provider.ts`, `providers/ibge-municipio-provider.ts`

## Checklist

- [x] Adicionado `fetchUfs(): Promise<IbgeUf[]>` à interface `MunicipioProvider`
- [x] Implementado em `IbgeMunicipioProvider` via `GET /api/v1/localidades/estados?orderBy=nome`
- [x] Confirmado via chamada real que o shape já bate com `IbgeUf` (`{id, sigla, nome}` + `regiao` extra ignorável) — 27 UFs retornadas
- [x] Fakes de `MunicipioProvider` em specs existentes (`resolve-city-use-case.spec.ts`, `generate-city-seed-use-case.spec.ts`, `recycling-seed-pipeline.spec.ts`) atualizados com `fetchUfs()`
- [x] `npm run test` — suíte completa passa sem regressão
