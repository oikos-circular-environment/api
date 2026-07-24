# api#8 — Épicos do rework de auth (Better Auth)

> **Estado**: issues criadas no GH Project em 23/07/2026 (E01–E06 + sub-issues de E01–E03). Nenhum código implementado ainda. Referência técnica detalhada: [`../better-auth/01-technical-plan.md`](../better-auth/01-technical-plan.md). Épico de Moderação, que consome o E02: [`01-moderation.md`](./01-moderation.md).

## Contexto
api#8 (rework de auth com Better Auth: email/senha + roles + painel de usuários + recuperação de senha) cresceu e virou um **épico grande**. Foi quebrado em 6 épicos, com as sub-issues criadas no GH Project. A base técnica (schema unificado, ports `AuthProvider`/`EmailProvider`, `/v2/auth`, `/v2/users`, etc.) já está no `01-technical-plan.md`.

## Decisões fechadas
- **api#8 = épico guarda-chuva**; E01–E06 = **sub-issues de api#8** (label `epic`); as tasks = **sub-issues de cada épico** (aninhamento 2 níveis).
- **Criadas**: as 6 issues de épico **+** as sub-issues granulares de **E01–E03**; E04–E06 ficaram só como issue de épico (sub-issues quando forem priorizados).
- User **unificado** (o `user` do Better Auth é a nossa `users`); **bcrypt 10** no v2; painel `/v2/users` **API-only**; `/v2` = **só identidade+admin** (rotas de recurso seguem no v1/JWT); `sign-in` devolve **session token puro**.
- **E-mail**: `EmailProvider` com **fake** (console) agora; Resend depois (devops#72).
- **Coexistência**: `/v1/auth`, `token-service`, refresh-tokens (#53), change-password v1 (#54), `verify-jwt` e rotas de recurso ficam **intactos**.

## Épicos e sub-issues

### E01 — Fundação Better Auth + email/senha  [P1, agora] — api#62
Instância `betterAuth` (Prisma adapter, bcrypt 10, secret/baseURL/trustedOrigins), schema unificado (`users` evoluída + `accounts`/`sessions`/`verifications`) + migração, ports (`AuthProvider`/`BetterAuthAuthProvider`/`InMemoryAuthProvider`), env, wiring `/v2`.
- **E01.1** (api#68) Infra + schema unificado + migração + regen client
- **E01.2** (api#69) Ports `AuthProvider` (+ impl Better Auth + in-memory)
- **E01.3** (api#70) `/v2/auth` sign-up/sign-in/sign-out/session + testes (unit+e2e)

### E02 — Roles & Painel de administração de usuários  [P1, agora] — api#63
Plugin admin (role/banned), `verify-session`, `require-role`, moderador via banco; painel **API-only** `/v2/users` (list/get/create/role/ban/unban/sessions/revoke/reset/delete).
- **E02.1** (api#71) `verify-session` + `require-role` + role no schema/config
- **E02.2** (api#72) Métodos admin no provider (list/ban/revoke/`setUserPassword`/`removeUser`…)
- **E02.3** (api#73) Rotas `/v2/users` + testes

### E03 — Gestão e recuperação de senha  [P1, agora] — api#64
`change-password` v2 (autenticado); `forgot`/`reset`; `EmailProvider` (console fake + in-memory p/ testes).
- **E03.1** (api#74) `EmailProvider` (interface + console + in-memory)
- **E03.2** (api#75) `change-password` v2 + testes
- **E03.3** (api#76) `forgot`/`reset` + testes

### E04 — E-mail transacional real (Resend)  [P2, futuro — dep devops#72] — api#65
ResendEmailProvider · verificação de e-mail obrigatória · troca do fake. *(sub-issues detalhadas depois)*

### E05 — Login social (Google/Facebook)  [P2, futuro] — api#66
config `socialProviders` + handler nativo p/ callbacks · account linking · contas de teste (seeds Google/Apple já existem). *(sub-issues depois)*

### E06 — Migração v1→v2 & aposentadoria do JWT legado  [P2, futuro] — api#67
migrar rotas de recurso p/ sessão v2 · **sub-issue no mobile** (app → `/v2` + bearer) · remover `/v1/auth` + #53/#54 · unificar credenciais. *(sub-issues depois)*

## Dependências
E02 e E03 dependem de **E01**. E04 depende de **devops#72**. E06 depende de **E01–E03**.

## Execução no GH Project (feito em 23/07/2026)

1. **E01–E06** criados como sub-issues de **api#8**, label `epic`, status Backlog (E01–E03 = P1; E04–E06 = P2).
2. Sub-issues granulares de **E01–E03** criadas (api#68–#76), vinculadas ao respectivo épico e no Project como P1/Backlog.
3. Corpo de cada issue traz **Contexto + Escopo + Critérios de aceite**, com as dependências apontando issues reais.
4. `api#8` recebeu label `epic` e uma seção "Quebra em épicos" com a tabela E01–E06.

## Próximo passo

Executar **E01** (api#62), começando por E01.1 (api#68). O primeiro passo da execução dentro de `api/` é verificar/instalar a skill (`npx skills add better-auth/skills`) e o MCP (`npx auth@latest mcp`) do Better Auth, locais ao repo.
