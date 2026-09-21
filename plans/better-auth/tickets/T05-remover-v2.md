# T05 — Remover `/v2/auth`

**Status:** [ ] Pendente
**Depende de:** T03 (web e mobile já migrados e validados em produção/staging)
**Módulos:** `src/modules/auth/routes/v2`, `src/modules/auth/dtos/auth-v2-dto.ts`,
`src/modules/auth/use-cases/v2`, `src/app.ts`

## Remover

| Arquivo | Ação |
|---|---|
| `src/modules/auth/routes/v2/auth-v2-routes.ts` | apagar |
| `src/modules/auth/routes/v2/auth-v2.e2e.spec.ts` | apagar |
| `src/modules/auth/dtos/auth-v2-dto.ts` | apagar |
| `src/modules/auth/use-cases/v2/*.ts` + `*.spec.ts` | apagar os marcados como **passthrough puro** no T01 |

Pra qualquer use-case marcado no T01 como "tem lógica extra": a lógica não
apaga, migra pro destino decidido no T01 (hook do `betterAuth()` em
`better-auth.ts`, ou middleware pós-handler) **antes** de apagar o use-case
original. Não perder comportamento no meio da troca.

Em `src/app.ts`: remover `import { authV2Routes } ...` e
`app.register(authV2Routes, { prefix: "/v2" })`.

**Não remover** (confirmado T01, é o port usado por outros módulos):
`providers/auth/**`, `errors/*`, `entities/auth-entity.ts`.

## Checklist

- [ ] Confirmar T03 fechado (web e mobile não dependem mais de `/v2/auth`).
- [ ] Migrar lógica extra apontada pelo T01, se houver, antes de apagar.
- [ ] Apagar arquivos da tabela.
- [ ] Remover registro em `app.ts`.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npm run test -- auth` (unitários do módulo).

## Testes

Só unitários do módulo `auth`. Suíte completa (unit geral + integration + e2e
+ coverage) fica pro T06.
