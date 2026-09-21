# T01 — Levantamento fino de v1/v2 antes de mexer

**Status:** [x] Concluído
**Depende de:** nada
**Módulos:** `src/modules/auth` (leitura only, sem edição de produção)

## Contexto

Antes de apagar `/v1/auth` e `/v2/auth`, confirmar arquivo a arquivo o que é
passthrough puro do better-auth (morre) vs. lógica própria colada na rota
(precisa virar hook/plugin do better-auth ou ir pra outro lugar).

## Tabela final de decisão

### Use-cases `use-cases/v2/*.ts`

| Arquivo | Classificação | Lógica extra | Consumidores | Decisão |
|---|---|---|---|---|
| `sign-up-use-case.ts` | passthrough puro | — | só V2 | **morre** — nativo tem `/sign-up/email` |
| `sign-in-use-case.ts` | lógica mínima | guard `if (!result.token)` throw | V1 + V2 | **morre** — nativo já 401 em credencial inválida |
| `sign-out-use-case.ts` | passthrough puro | — | V1 + V2 | **morre** — nativo tem `/sign-out` |
| `get-session-use-case.ts` | lógica mínima | null check → `InvalidCredentialsError`; reshape `{user}` | V1 + V2 | **morre** — nativo já 401 em sessão inválida |
| `change-password-use-case.ts` | passthrough puro | — | **accounts** (`PATCH /users/me/change-password`) | **fica** — rota não morre, depende só do port `AuthProvider`. Reavaliar no T06 se o accounts passa a chamar `authProvider.changePassword()` direto |
| `request-password-reset-use-case.ts` | passthrough puro | — | só V2 | **morre** — nativo tem `/forget-password` |
| `reset-password-use-case.ts` | passthrough puro | — | só V2 | **morre** — nativo tem `/reset-password` |
| `send-verification-email-use-case.ts` | passthrough puro | — | só V2 | **morre** — nativo tem `/send-verification-email` |
| `verify-email-use-case.ts` | passthrough puro | — | só V2 | **morre** — nativo tem `/verify-email` |

### Rotas

| Arquivo/Rota | O que faz | Decisão |
|---|---|---|
| `routes/v1/auth-routes.ts` (`POST /login`, `PATCH /refresh`, `POST /logout`) | delega aos use-cases + **enriquece com organizations** via `PrismaUserOrganizationsRepository` + `authUserWithOrganizationsResponseMapper` | **morre** (T04). Enrichment de orgs **não migra pra hook**: o plugin `organization()` já está configurado em `better-auth.ts`, client passa a usar endpoints nativos do plugin |
| `routes/v2/auth-v2-routes.ts` (9 endpoints) | delega aos use-cases; `change-password` tem `preHandler: [verifySession]` | **morre** (T05) |

### Infra pega no caminho

| Peça | Uso após a migração | Decisão |
|---|---|---|
| `dtos/auth-dto.ts` | só V1 route + `make-auth-user.ts` | **morre** (T04) |
| `dtos/auth-v2-dto.ts` | V1/V2 routes + **moderation** (`authV2UserSchema` em `users-admin-dto.ts` e `moderation-user-routes.ts`) | **fica** (schema continua servindo o painel admin) |
| `mapper/auth-user-response-mapper.ts` | só V1/V2 routes | **morre** (T05) |
| `repositories/user-organizations-repository*` (interface, prisma, in-memory) | só V1/V2 routes | **morre** (T05) |
| `factories/make-auth-user.ts` | **zero imports em todo `src/`** | **deletar** (dead code) |
| `middlewares/verify-session.ts` (`createVerifySession`/`requireAuthUser`) | usado por **11 módulos** (accounts, complaints, companies, profiles, support, denunciation, moderation...) | **fica** — só o uso em `auth-v2-routes.ts` morre |
| `@fastify/jwt` (registro global em `app.ts` 84-93, cookie `refreshToken`) | **nenhum handler usa** (`jwtVerify`/`jwtSign` zero usos em `src/`) — resto de infra v1 antiga, sem pendência no fluxo atual de auth | fora do escopo dos tickets de auth; remoção global fica como limpeza à parte do `app.ts` |

## Achados confirmados (não-passthrough → ficam)

- `errors/*`, `providers/auth/auth-provider.ts`, `providers/auth/better-auth/better-auth-auth-provider.ts`,
  `providers/auth/in-memory/in-memory-auth-provider.ts`, `providers/auth/better-auth/fake-auth-api.ts`:
  **ficam** — port usado por 12 outros módulos pra sessão, não fazem parte do
  envelope REST de `/v1` e `/v2`.
- `providers/auth/better-auth/better-auth.ts` (config `betterAuth()`): **não tem
  hooks/databaseHooks sobrescritos hoje** — toda lógica custom vive nos callbacks
  de email/password. Nada a migrar pro hook nessa camada.

## Checkpoint

- [x] Ler cada use-case em `use-cases/v2/*.ts` e marcar passthrough vs lógica extra.
- [x] Decidir destino da lógica extra — **nenhuma migra**: guards mínimos (sign-in/session)
      já são comportamento nativo; org-enrichment vira endpoints nativos do plugin
      `organization()` (client migration em T03).
- [x] Confirmar `routes/v1/auth-routes.ts`: **nenhuma pendência de cookie/refresh
      via `@fastify/jwt`** (registro global existe, zero handlers usam).
- [x] Fechar decisão `make-auth-user.ts`: **deletar** (dead code, sem teste usando).
- [x] Registrar decisão de `change-password-use-case.ts`: **fica** (accounts depende dele).

## Testes

Nenhuma mudança de código neste ticket — não roda suíte.