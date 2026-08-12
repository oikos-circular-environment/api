# T02 — Renomear módulo `users` → `accounts`, aposentar `GET /v1/users/me`

**Status:** [x] Concluído
**Depende de:** nada (não cruza arquivo com T01, mas rode depois por ordem de plano)
**Módulos:** `src/modules/users` → `src/modules/accounts`, `src/app.ts`, `src/server.ts`, `src/modules/profiles`

## Contexto

Depois da remoção do JWT legado (#67), `src/modules/users` ficou com só três rotas
sob `/v1/users`: `GET /me` (redundante — `/v2/auth/session` retorna os mesmos dados e
mais), `DELETE /me` (agenda exclusão de conta, LGPD) e `PATCH /me/cancel-deletion`.
Christian decidiu: aposentar o `GET`, subir o resto pra `/v2/accounts`, e renomear o
módulo. `accounts` é o contexto de crescimento futuro (self-service do usuário
logado: segurança, preferências); `auth` continua só autenticação/sessão.

**Nomes internos não mudam.** `UsersRepository`, `PrismaUsersRepository`,
`InMemoryUsersRepository`, o tipo `User`, `userSchema` continuam com esse nome —
espelham o model Prisma `User`. Só a pasta do módulo e o arquivo/rota de entrada
mudam de `users` para `accounts`.

## Passo 1 — `git mv` de `src/modules/users/` para `src/modules/accounts/`

Mover a árvore inteira preservando estrutura, com estas exceções:

| Arquivo original | Ação |
|---|---|
| `dtos/users-dto.ts` | mover para `dtos/accounts-dto.ts` (renomeia o arquivo — segue o padrão do repo de nomear dto pelo módulo, ex. `moderation-dto.ts`) |
| `entities/user-entity.ts` | mover como está, sem renomear (é o entity, não o módulo) |
| `user-routes.ts` | mover para `account-routes.ts` (ver Passo 3) |
| `errors/user-already-exists-error.ts` | **deletar** — código morto, sem nenhum import em `src/modules/users/**` fora do próprio arquivo (confirmado por grep antes deste ticket) |
| `errors/same-password-error.ts` | **deletar** — código morto, mesmo motivo |
| `use-cases/get-user-use-case.ts` + `get-user-use-case.spec.ts` | **deletar** — só existiam para o `GET /me` que está sendo aposentado |
| Todo o resto (`errors/account-*`, `errors/user-not-found-error.ts`, `factories/`, `providers/queue/**`, `repositories/**`, `use-cases/cancel-account-deletion-*`, `use-cases/request-account-deletion-*`, `workers/**`) | mover como está, mesmo nome de arquivo |

## Passo 2 — `dtos/accounts-dto.ts`

Remover o export `userResponseSchema` (só era usado pelo `GET /me` que está saindo).
Manter `export type { User }` e `export { userSchema }` vindos de
`../entities/user-entity.js` — outros arquivos do módulo continuam importando `User`
daqui.

## Passo 3 — `account-routes.ts` (era `user-routes.ts`)

- Renomear a função exportada `userRoutes` → `accountRoutes`.
- **Remover o handler `GET /users/me` inteiro** (incluindo o import de
  `GetUserUseCase`, que deixou de existir).
- `DELETE /users/me` → `DELETE /accounts/me` (mesmo handler, mesma lógica).
- `PATCH /users/me/cancel-deletion` → `PATCH /accounts/me/cancel-deletion` (mesmo
  handler, mesma lógica).
- Trocar a tag OpenAPI `tags: ["Users"]` → `tags: ["Accounts"]` nos dois handlers
  restantes.
- Atualizar o import do dto (`./dtos/users-dto.js` → `./dtos/accounts-dto.js`), se
  algum dos handlers restantes ainda referenciar algo de lá (`DELETE`/`PATCH` hoje não
  usam `userResponseSchema`, só `GetUserUseCase` usava — confirmar ao remover).

## Passo 4 — corrigir imports internos ao módulo

Todo arquivo movido que importa `@/modules/users/...` (de si mesmo ou de outro arquivo
do mesmo módulo) precisa virar `@/modules/accounts/...`. Rodar um grep depois do `git
mv` pra achar o que sobrou:

```
grep -rln "modules/users" src/modules/accounts
```

E corrigir cada ocorrência.

## Passo 5 — corrigir os 3 consumidores externos (fora do módulo)

1. **`src/app.ts`**:
   - `import { userRoutes } from "./modules/users/user-routes.js"` → `import { accountRoutes } from "./modules/accounts/account-routes.js"`.
   - `app.register(userRoutes, { prefix: "/v1" })` → `app.register(accountRoutes, { prefix: "/v2" })`.
2. **`src/server.ts`**: `await import("./modules/users/workers/index.js")` → `await import("./modules/accounts/workers/index.js")`.
3. **`src/modules/profiles/profile-routes.ts`**: `@/modules/users/repositories/prisma/users-repository-prisma.js` → `@/modules/accounts/repositories/prisma/users-repository-prisma.js`.
4. **`src/modules/profiles/use-cases/upsert-profile-use-case.ts`**: `@/modules/users/repositories/users-repository.js` → `@/modules/accounts/repositories/users-repository.js`.
5. **`src/modules/profiles/use-cases/upsert-profile-use-case.spec.ts`**: `@/modules/users/repositories/in-memory/in-memory-users-repositories.js` → `@/modules/accounts/repositories/in-memory/in-memory-users-repositories.js`.

## Fora de escopo

- Atualizar mobile/web para o novo prefixo `/v2/accounts` — sub-issue própria, mesmo
  padrão usado nos outros épicos deste épico guarda-chuva (api#8).
- Renomear `UsersRepository`/`PrismaUsersRepository`/`InMemoryUsersRepository`/`User`
  — decisão registrada no tech-plan (`00-tech-plan.md`), não refazer aqui.

## Verificação

- `npx tsc --noEmit` limpo.
- `npm run lint` sem novos warnings.
- `npm run test` — specs movidos (`cancel-account-deletion-use-case.spec.ts`,
  `request-account-deletion-use-case.spec.ts`) passam do novo local sem alteração de
  conteúdo.
- `npm run test:integration -- bullmq-account-deletion` e
  `-- account-deletion-worker` verdes (`npm run test:infra:up` antes).
- Grep de guarda: `grep -rn "modules/users" src cli --include=*.ts` deve voltar vazio
  por completo (nenhum arquivo, nem dentro nem fora do módulo).
- Manual (Scalar `/docs`, com `X-Client-Key` + bearer de uma sessão v2): `DELETE
  /v2/accounts/me` agenda exclusão → `PATCH /v2/accounts/me/cancel-deletion`
  cancela. `GET /v1/users/me` deve retornar 404 (rota não existe mais).
