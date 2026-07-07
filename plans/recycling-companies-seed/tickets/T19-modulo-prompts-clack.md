# T19 — Módulo de prompts interativos (Clack)

**Status:** ✅ Concluído
**Depende de:** T18
**Arquivos:** `cli/prompts.ts`

## Checklist

- [x] `promptState(ufs)` — `select` (27 opções, uma por UF)
- [x] `promptCity(municipios)` — `autocomplete` (busca com filtro, confirmado via Context7 que existe suporte nativo no `@clack/prompts`, essencial pra estados com centenas de municípios)
- [x] `promptTarget()` — `text` opcional (Enter = sem padding sintético), com `validate` tratando `value: string | undefined` corretamente (achado no typecheck: `Validate<T>` do Clack passa `undefined` quando o campo está vazio, não só `""`)
- [x] `promptForce()` / `promptAddAnotherCity()` — `confirm`
- [x] `isCancel`/`cancel` tratados num helper único (`handleCancel`), encerrando o processo de forma limpa em qualquer Ctrl+C
- [x] `npx tsc` sem erros
