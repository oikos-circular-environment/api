# T04 — Remover `/v1/auth`

**Status:** [x] Concluído
**Depende de:** T02 (não depende de T03 — `/v1` já não tem client ativo, era
a versão antiga pré-better-auth)
**Módulos:** `src/modules/auth/routes/v1`, `src/modules/auth/dtos/auth-dto.ts`,
`src/app.ts`

## Remover

| Arquivo | Ação |
|---|---|
| `src/modules/auth/routes/v1/auth-routes.ts` | apagado |
| `src/modules/auth/routes/v1/auth-login.e2e.spec.ts` | apagado |
| `src/modules/auth/routes/v1/auth-refresh.e2e.spec.ts` | apagado |
| `src/modules/auth/dtos/auth-dto.ts` | apagado (T01 fechado) |
| `src/modules/auth/factories/make-auth-user.ts` | apagado (dead code, decisão T01) |

Em `src/app.ts`: remover `import { authRoutes } ...` e
`app.register(authRoutes, { prefix: "/v1" })`.

Se `@fastify/jwt` (linha ~83-92 de `app.ts`, cookie `refreshToken`) não tiver
mais nenhum outro consumidor depois de tirar `authRoutes`, remover o
`app.register(fastifyJwt, ...)` também — confirmar com grep antes de tirar.

## Checklist

- [x] Apagar arquivos da tabela (+ remover dirs vazios `routes/v1` e `factories`).
- [x] Remover registro em `app.ts` (`authRoutes` + prefix `/v1`).
- [x] Grep por `fastifyJwt`/`request.jwt`/`reply.jwtSign`: **@fastify/jwt ficou** —
      **16 e2e specs** de outros módulos (companies e afins) assinam token de
      teste com `app.jwt.sign(...)`. Plugin permanece registrado em `app.ts`
      (com comentário explicando), `JWT_SECRET` continua no schema de env
      (specs `env/index.spec.ts`, `make-email-provider.spec.ts`,
      `resend-email-provider.spec.ts` o exercitam). Nenhum handler de produção
      usa jWT.
- [x] `npm run lint` no que sobrou: biome check limpo em `app.ts`/`server.ts`.
- [x] `npm run test -- auth`: 13 files / 119 tests verdes.
- [x] Smoke no container: `/v1/auth/login` → 404; `/v2/auth/sign-in`, `/api/auth/*`, `/health` intactos.

## Testes

Só unitários do módulo `auth` (13 files / 119 tests). Integration/e2e e
suíte completa ficam pro T06.
