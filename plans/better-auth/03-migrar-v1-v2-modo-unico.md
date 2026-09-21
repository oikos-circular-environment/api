# Migrar `/v1/auth` + `/v2/auth` para modo único nativo do better-auth (api#115, continuação)

## Decisão

Próxima versão não mantém `/v1/auth` nem `/v2/auth`. Todo fluxo de autenticação
(sign-up, sign-in, sign-out, change/forgot/reset password, verify-email, get-session)
passa a ser servido pelo `auth.handler` nativo do better-auth, montado em
`/api/auth/*`. Contrato custom (DTOs zod próprios, envelope `{message, code,
statusCode}`) morre nessa parte. Docs unificado em `/docs` já resolvido
(ver commit desta sessão: `openAPI()` habilitado em
`better-auth.ts`, merge feito em `app.ts` via `auth.api.generateOpenAPISchema()`
+ `app.swagger()`, servido no mesmo `/docs`).

Casing não é problema: `fields` em `better-auth.ts` só renomeia coluna do banco,
payload HTTP do better-auth é sempre camelCase. Nada muda aí.

## O que NÃO morre (isolamento que continua valendo)

`AuthProvider` (contrato em `src/modules/auth/providers/auth/auth-provider.ts`),
`BetterAuthAuthProvider`, `InMemoryAuthProvider` e `errors/*` do módulo `auth`
não são o envelope REST — são o port usado por **12 outros módulos**
(accounts, complaints, companies, moderation, profiles, support, denunciation,
market...) pra checagem de sessão em middleware e pelo painel admin
(`auth.api.admin*`). Isso fica. O que morre é só a camada de rotas HTTP
`/v1/auth` e `/v2/auth` que hoje reexpõe o better-auth com contrato próprio.

## Migração de clients (fora deste repo)

Web e mobile hoje só falam com `/v1` e `/v2` via `oikos-sdk` gerado. Migrar
esses dois pro client oficial (`better-auth/client` no web, `@better-auth/expo`
no mobile) é trabalho nos repos `web` e `mobile` — sub-issues à parte,
bloqueante pra T05 (não dá pra apagar `/v2/auth` com client em produção ainda
dependendo dele).

## Ordem de execução

Tickets em [`tickets/`](./tickets/), nessa ordem, todos na branch `115-migrar-login-v1-better-auth`:

1. [x] [T01 — Levantamento fino de v1/v2](./tickets/T01-levantamento-v1-v2.md)
2. [x] [T02 — Montar handler nativo `/api/auth/*`](./tickets/T02-montar-handler-nativo.md)
3. [ ] [T03 — Migrar clients (sub-issues web/mobile, tracking aqui)](./tickets/T03-migrar-clients-web-mobile.md)
4. [x] [T04 — Remover `/v1/auth`](./tickets/T04-remover-v1.md)
5. [T05 — Remover `/v2/auth`](./tickets/T05-remover-v2.md)
6. [T06 — Suíte completa + PR](./tickets/T06-suite-completa-e-pr.md)

**Regra de execução**: cada ticket ajusta/roda só os testes unitários (`.spec.ts`)
das peças que ele tocou, pra não trabalhar no escuro — nada de suíte completa
nem integration/e2e no meio do caminho. Suíte completa (unit + integration +
e2e + coverage) só corre no T06, depois de todos os outros fechados.

## Nota: upgrade `better-auth` 1.6.26 → 1.7.3 (sessão de 2026-09-07)

Upgrade feito a pedido do mantenedor do produto, integrado ao trabalho do
T03/T06 (mesma branch). Resumo — detalhes completos em
[`T03`](./tickets/T03-migrar-clients-web-mobile.md#upgrade-1626--173-adicionado-em-2026-09-07):

- Deps: `better-auth@1.7.3` + `@better-auth/expo@1.7.3` (exact).
- Schema Prisma: adicionada `Organization.metadata String?`; migration
  `20260907190000_add_organization_metadata` (*deploy* — `migrate dev` quebra
  no shadow DB por postgis sem superuser).
- Config: mapeamento `activeOrganizationId` move do topo
  (`session.fields`) pra dentro do plugin `organization`
  (`schema.session.fields`) — requisito do 1.7. Client Prisma regenerado.
- Validado: boot sem schema mismatch, smoke completo, unit 121 files / 633
  tests, integration 12 files / 58 tests.
- Dívida e2e pré-existente (16 files, `401 missing authorization token`):
  specs usam JWT legado `app.jwt.sign` que o `verify-session` better-auth
  (desde `1514fb1`) não valida — corrigir no T06.
