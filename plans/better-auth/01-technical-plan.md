# api#8 — Rework de auth com Better Auth (email/senha + roles + painel de usuários), versionado em `/v2`

> Rascunho técnico em discussão. Escopo desta entrega = Track 1 (algoritmo de auth completo + painel admin; e-mail via provider **fake**). Sujeito a ajuste antes de virar tickets.

## Contexto

A `api` hoje tem auth **caseiro** (Fastify JWT): `/v1/auth/login` → `{ token, refreshToken }`, refresh com rotação de `jti` em `refresh_tokens` (#53), `change-password` (#54), verificação via `verifyJwt` lendo `request.user.sub`. **Sem role/RBAC** (autorização = ownership por `user_id`). Senha bcryptjs (custo 6) em `users.password`.

A issue **api#8** troca a fundação para **Better Auth**. Decisões desta discussão:

- **Greenfield** — sem produção real; sem migração de usuários.
- **Abstração é central** — Better Auth atrás de `AuthProvider`; e-mail atrás de `EmailProvider`. Rotas/use-cases não importam Better Auth direto (SOLID/DRY; engine trocável).
- **User unificado (Opção A)** — o `user` do Better Auth **é a nossa `users`**; as relações de domínio (Profile/Company/Complaint…) continuam penduradas nela. (No fim, quase todo provedor mantém a mesma estrutura de user; separar em duas tabelas não compensa.)
- **Coexistir + versionar** — novo stack em **`/v2`**; **`/v1/auth` e o mobile seguem intactos**.
- **Painel de usuários próprio** — API autenticada `/v2/users` (base de `https://api.oikos.company/users`) para gerenciar usuários, revogar acessos, hard reset de senha, deletar contas. **Sem** dashboard do Better Auth.
- **E-mail** — não depende de provedor real: `EmailProvider` com **fake** (loga link/token no console) agora; Resend depois (devops#72).
- **Adiar**: login social (Google/Facebook) e adaptador Resend real.

## Modelo de dados — schema unificado (Prisma)

O `user` do Better Auth vira a **`users`** atual, acrescida dos campos que o Better Auth + plugin admin exigem, mantendo os campos/relações de domínio. Senha das contas v2 mora em `accounts` (`providerId="credential"`); a coluna `users.password` fica como **legado nullable** só para o `/v1` conviver.

### Tabelas novas
```prisma
model Account {
  id                       String    @id @default(uuid())
  account_id               String                          // accountId (= user.id p/ credential)
  provider_id              String                          // "credential" | "google" | ...
  password                 String?                          // hash (credential)
  access_token             String?
  refresh_token            String?
  id_token                 String?
  access_token_expires_at  DateTime?
  refresh_token_expires_at DateTime?
  scope                    String?
  created_at               DateTime  @default(now())
  updated_at               DateTime  @updatedAt

  user_id String
  user    User   @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("accounts")
}

model Session {
  id              String   @id @default(uuid())
  token           String   @unique
  expires_at      DateTime
  ip_address      String?
  user_agent      String?
  impersonated_by String?                                   // plugin admin
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  user_id String
  user    User   @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("sessions")
}

model Verification {
  id         String   @id @default(uuid())
  identifier String
  value      String                                          // token de reset / verificação
  expires_at DateTime
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@index([identifier])
  @@map("verifications")
}
```

### `User` (a `users` atual, evoluída)
```prisma
model User {
  id              String    @id @default(uuid())
  name            String?                              // Better Auth (nullable p/ compat com register v1)
  email           String    @unique
  email_verified  Boolean   @default(false)            // Better Auth
  image           String?                              // Better Auth
  role            String    @default("user")           // plugin admin (user/admin)
  banned          Boolean   @default(false)            // plugin admin
  ban_reason      String?                              // plugin admin
  ban_expires     DateTime?                            // plugin admin
  password        String?                              // LEGADO v1 (nullable; v2 usa `accounts`)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt                 // Better Auth (novo)
  deleted_at      DateTime?                            // domínio (soft delete) — inalterado
  deletion_job_id String?                              // domínio — inalterado

  // relações de domínio — INALTERADAS
  profile          Profile?
  companies        Company[]
  complaints       Complaint[]
  votes            ComplaintVote[]
  resolutions      ComplaintResolution[] @relation("ResolutionResolver")
  support_requests SupportRequest[]
  refresh_tokens   RefreshToken[]        // legado v1

  // relações Better Auth — NOVAS
  accounts Account[]
  sessions Session[]

  @@map("users")
}
```

### Diff vs. schema atual
- **Novas tabelas**: `accounts`, `sessions`, `verifications`.
- **`users` ganha**: `name?`, `email_verified`, `image?`, `role`, `banned`, `ban_reason?`, `ban_expires?`, `updated_at`, relações `accounts`/`sessions`.
- **`users.password` → nullable** (v2 usa `accounts`; v1 legado ainda usa a coluna).
- **Nada nas demais tabelas muda** — todas as FKs continuam em `users.id`.
- Migração: `prisma migrate dev --name better_auth_init` (greenfield). Regerar client via container root one-off (caveat root-owned do #53).

### Config de mapeamento (nomes)
Os models chamam-se `User/Account/Session/Verification` (defaults do Better Auth → `prisma.user/account/session/verification`); os **nomes de tabela** vêm do `@@map` e as **colunas snake_case** via `fields` no `betterAuth()`:
```ts
betterAuth({
  user:    { fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at", banReason: "ban_reason", banExpires: "ban_expires" } },
  account: { fields: { accountId: "account_id", providerId: "provider_id", userId: "user_id", accessToken: "access_token", refreshToken: "refresh_token", idToken: "id_token", accessTokenExpiresAt: "access_token_expires_at", refreshTokenExpiresAt: "refresh_token_expires_at", createdAt: "created_at", updatedAt: "updated_at" } },
  session: { fields: { userId: "user_id", expiresAt: "expires_at", ipAddress: "ip_address", userAgent: "user_agent", impersonatedBy: "impersonated_by", createdAt: "created_at", updatedAt: "updated_at" } },
  verification: { fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" } },
})
```
Better Auth ignora colunas que não conhece (`password` legado, `deleted_at`, `deletion_job_id`, relações de domínio) — todas nullable/default, então tanto o create do Better Auth quanto o register v1 funcionam.

## Conceitos-guia
- **Identidade × credenciais**: `users` (identidade+domínio) × `accounts` (credencial por método: `credential`, depois `google`…). Social é **aditivo** (só config `socialProviders` + handler nativo p/ callbacks).
- **Sessão** = linha em `sessions` (substitui JWT+refresh do #53 no mundo v2); revogar = apagar linha.
- **Três operações de senha, distintas**: `change-password` (autenticado, senha atual) · `forgot-password` (só e-mail → link) · `reset-password` (token + nova). Não colapsar.

## Arquitetura — ports
```
src/modules/auth/
  providers/
    auth-provider.ts                 # interface AuthProvider (auth + admin) + tipos de domínio
    better-auth/
      better-auth.ts                 # instância betterAuth({...}) (config + EmailProvider injetado)
      better-auth-auth-provider.ts   # implements AuthProvider via auth.api.*
    in-memory/in-memory-auth-provider.ts
    email/
      email-provider.ts              # interface EmailProvider
      console/console-email-provider.ts
      in-memory/in-memory-email-provider.ts   # captura e-mail p/ e2e
```
`AuthProvider` (auth): `signUpWithPassword`, `signInWithPassword`, `getSession(headers)`, `signOut`, `changePassword`, `requestPasswordReset`, `resetPassword`.
`AuthProvider` (admin): `listUsers`, `getUser`, `createUser`, `updateUser`, `setRole`, `banUser`/`unbanUser`, `listUserSessions`, `revokeUserSessions`, `setUserPassword` (hard reset), `removeUser` (hard delete). Delegam ao **admin plugin** (`auth.api.admin*`) passando a sessão do admin (Better Auth checa `role=admin`).

## Escopo desta entrega (Track 1)

### A. Infra + schema
- `npm i better-auth`; instância com `prismaAdapter(prisma,{provider:"postgresql"})`, `emailAndPassword` (enabled, minPasswordLength 6, `password.hash/verify` **bcryptjs custo 10**, `sendResetPassword` → EmailProvider), `plugins:[admin(), bearer()]`, `secret`/`baseURL`/`trustedOrigins`. Reusar `prisma` de `src/lib/prisma.ts`.
- Schema unificado acima + migração; regerar client.

### B. `/v2/auth` (email/senha + sessão + change/forgot/reset)
- `POST /v2/auth/sign-up` `201` · `POST /v2/auth/sign-in` `200 {token,user}` · `POST /v2/auth/sign-out` `204` · `GET /v2/auth/session` `200 {user}` (com `role`) · `POST /v2/auth/change-password` (sessão) · `POST /v2/auth/forgot-password` `200` genérico (fake loga token) · `POST /v2/auth/reset-password` `200`.

### C. Sessão + roles
- `middlewares/verify-session.ts` (provider.getSession) e `middlewares/require-role.ts` (`requireRole("admin")`). Moderador = `role="admin"` manual no banco (ou `adminUserIds`).

### D. Painel de usuários (`/v2/users`, admin) — nosso, não o do Better Auth
Rotas Fastify+Zod guardadas por `require-role("admin")`, sobre os métodos admin do provider:
- `GET /v2/users` (list, busca/paginação) · `GET /v2/users/:id`
- `POST /v2/users` (create) · `PATCH /v2/users/:id/role`
- `POST /v2/users/:id/ban` · `POST /v2/users/:id/unban`
- `GET /v2/users/:id/sessions` · `POST /v2/users/:id/revoke-sessions` (revogar acessos)
- `POST /v2/users/:id/reset-password` (hard reset — `setUserPassword`)
- `DELETE /v2/users/:id` (hard delete — `removeUser`)
- (impersonate: opcional/futuro.) A **UI web** do painel é separada/futura — aqui entregamos a **API**.

### E. EmailProvider (fake)
- `console` (loga link/token) + `in-memory` (captura p/ e2e). Seleção por env `EMAIL_PROVIDER` (default `console`).

### F. Env + wiring
- Env (zod): `BETTER_AUTH_SECRET` (req), `BETTER_AUTH_URL` (default `APP_PUBLIC_URL`), `BETTER_AUTH_TRUSTED_ORIGINS?`, `EMAIL_PROVIDER` (default `console`). `.env`/`.env.test`.
- `app.ts`: registrar `/v2/auth` e `/v2/users`. Manter enforcement do `X-Client-Key` (sem isentar `/v2`).

### G. Testes
- **Unit**: use-cases v2 (auth + admin) contra `InMemoryAuthProvider` + `InMemoryEmailProvider`.
- **e2e** (DB de teste, porta 5433, EmailProvider in-memory): sign-up → sign-in → session(role) → change-password → forgot → reset → sign-in(nova senha) → sign-out; e o fluxo admin: promover `role=admin` no banco → list/ban/revoke-sessions/set-password/remove-user. Limpar `users/accounts/sessions/verifications` no `afterEach`.

## Setup de execução (skill + MCP do Better Auth)
Como **1º passo da execução** (agente rodando dentro de `api/`): instalar/verificar a **skill** (`npx skills add better-auth/skills`) e o **MCP** (`npx auth@latest mcp`, registrado no MCP config **do repo `api`**). São locais ao repo. Checar se já existem antes de reinstalar.

## Fora de escopo (fases seguintes)
- **Login social** (Google/Facebook): `socialProviders` + handler nativo p/ callbacks + account linking. (Já há seeds/vars Google/Apple no repo.)
- **Adaptador Resend real** do `EmailProvider` (devops#72) + verificação de e-mail obrigatória.
- **Migrar rotas de recurso + mobile para a sessão v2**; aposentar `/v1/auth` + #53/#54.
- **RBAC multi-tenant** (cliente/prestador/órgão público).
- **UI web** do painel de usuários.

## Verificação
- `tsc --noEmit` limpo; `lint` sem novos warnings; `test` (unit) e `test:e2e -- auth-v2`/`users-admin` verdes (`test:infra:up`).
- `migrate dev` aplica sem colidir; `/v1/auth/*` e rotas de recurso seguem verdes (coexistência).
- Manual (Scalar `/docs`, com `X-Client-Key`): sign-up→sign-in→session; forgot mostra token no **console**→reset conclui; setar `role=admin` no banco e exercitar `/v2/users` (list/ban/revoke/reset/delete).

## Arquivos-chave
- Novos: `providers/{auth-provider.ts, better-auth/*, in-memory/*, email/*}`, `dtos/{auth-v2-dto.ts, users-admin-dto.ts}`, `use-cases/*` (+ specs), `middlewares/{verify-session,require-role}.ts`, `v2/{auth-v2-routes.ts, users-admin-routes.ts}` (+ e2e), migração `*_better_auth_init`.
- Editados: `prisma/schema.prisma`, `src/env/index.ts`, `src/app.ts`, `.env`/`.env.test`, `package.json`.
- Reuso: `src/lib/prisma.ts`, `src/lib/logger.ts`, `bcryptjs`, `AppError`, `withBearerAuth`.
- Intocados (coexistência): `/v1/auth`, `token-service.ts`, `refresh-token-*` (#53), `change-password` v1 (#54), `verify-jwt.ts`, rotas de recurso.

## Decomposição em tasks (sub-issues do api#8)
1. **Infra Better Auth + schema unificado + ports** (dep, instância, providers, migração, env).
2. **`/v2/auth` email/senha + sessão** (sign-up/in/out, session) + testes.
3. **Roles** (`verify-session`, `require-role`, moderador via banco) + testes.
4. **change-password v2** + testes.
5. **forgot/reset** (EmailProvider fake) + testes.
6. **Painel `/v2/users`** (admin: list/create/role/ban/revoke/reset/delete) + testes.
7. *(futuro)* Resend real · 8. *(futuro)* login social · 9. ~~(futuro) migrar recurso+mobile p/ v2~~ — feito em [`02-migrar-v1-para-better-auth.md`](./02-migrar-v1-para-better-auth.md) (api#115), exceto a parte mobile (repo separado).

## Decisões fechadas
- **bcrypt custo 10** no engine v2 (greenfield; v1 segue em 6).
- **Painel `/v2/users` = API-only** nesta entrega; UI web é task futura.
- **`/v2` = só identidade + admin**; rotas de recurso seguem 100% no v1/JWT (migração p/ sessão v2 é fase seguinte).
- **`/v2/auth/sign-in`** devolve o **session token puro** do Better Auth (bearer p/ mobile futuro).
