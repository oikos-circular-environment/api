# T03 — Migrar clients web/mobile pro better-auth nativo (tracking)

**Status:** [ ] Pendente
**Depende de:** T02
**Módulos:** fora deste repo — `web` e `mobile` (org `oikos-circular-environment`)

## Contexto

Sub-issues em repos separados, vinculadas ao api#115. Este arquivo só rastreia
o bloqueio: T05 (apagar `/v2/auth`) não pode fechar enquanto web ou mobile
ainda dependerem do `oikos-sdk` v2 em produção.

- **web**: trocar chamadas do `oikos-sdk` v2 por `createAuthClient()`
  (`better-auth/client`), sessão via cookie nativo.
- **mobile**: trocar por `@better-auth/expo` (`expoClient()` + plugin server
  `expo()`), deep link scheme, storage via SecureStore do client.

## Checklist

- [x] Abrir sub-issue no repo `web`, linkada a api#115.
- [x] Abrir sub-issue no repo `mobile`, linkada a api#115.
- [x] Api-side do plugin `expo()` — `@better-auth/expo@1.7.3` adicionado e
      `expo()` registrado em `better-auth.ts` (ver notas adicionais abaixo).
- [ ] Confirmar em cada repo que a migração foi mergeada em `development` e
      validada (login, sign-up, refresh de sessão, logout) antes de marcar
      este ticket como concluído.

## Notas adicionais (api — inicia a partir de 2026-09-07)

Dependência adicionada pra desbloquear o mobile:
- `better-auth` e `@better-auth/expo` em **1.7.3** (exact, latest estável).
  Upgrade feito em 2026-09-07 junto com o schema: ver seção "Upgrade 1.6.26 → 1.7.3".
- Plugin server `expo()` adicionado em `better-auth.ts` (plugins). Rotas novas:
  `GET /api/auth/expo-authorization-proxy` (oculta do openapi — `HIDE_METADATA`).
  Protegida por `X-Client-Key` como as demais; exige `authorizationURL` https
  com origin ≠ baseURL (400 caso contrário, validado).
- Dev loop: o container `oikos-dev-api-1` usa volume anônimo `/app/node_modules`
  (populado da imagem). Após `npm install`, rebuild + `rm -sf -v api` + `up -d`
  (recreate preserva o volume velho — precisa do `rm -v` pra nascer volume novo).
- Smoke no container e local OK: sign-in/sign-up/get-session/sign-out, criação
  de organização + set-active, v1 404, v2 intacto, `/health` 200.

## Upgrade 1.6.26 → 1.7.3 (adicionado em 2026-09-07)

Upgrade completo pedido pelo mantenedor do produto. Quando `better-auth@1.7.3`
bootava com o schema antigo, o check de schema (prisma adapter) bloqueava com:

```
[SchemaMismatchError]: Missing columns
  session.activeOrganizationId
  organization.metadata
```

Mudanças aplicadas:

1. **Deps**: `better-auth@1.7.3` + `@better-auth/expo@1.7.3` (exact) em
   `package.json`. O `npx auth` standalone não lê este repo (alias `@/` +
   PrismaClient 7); usado `auth generate` com config tmp espelhando a config
   real pra obter o schema de referência do 1.7.
2. **Schema Prisma**: adicionada coluna `metadata String?` ao model
   `Organization` (`prisma/schema.prisma`). Única mudança real exigida pelo
   boot — `npx auth generate` não cria tabelas SCIM/OAuth/etc. porque a config
   não usa esses plugins.
3. **Migration**: `prisma/migrations/20260907190000_add_organization_metadata/`
   (`ALTER TABLE "organizations" ADD COLUMN "metadata" TEXT;`). Feita na mão +
   `prisma migrate deploy` porque `migrate dev`/`diff` quebram no shadow DB
   (usuário sem superuser pro extension postgis).
4. **Config `better-auth.ts`**: em 1.7 o mapeamento `activeOrganizationId →
   active_organization_id` precisa ficar **dentro do plugin organization**
   (`schema.session.fields.activeOrganizationId`) — em 1.6.26 funcionava no
   topo (`session.fields`); em 1.7 o plugin sobrescreve a session schema e o
   `fieldName` top-level é ignorado. Removida a entrada duplicada no topo.
5. **Client regenerado**: `prisma generate` (o check lê o datamodel do client
   gerado — sem regenerar, `metadata` continuava "faltando" mesmo com a coluna
   no banco).

**Validado**: boot local + container sem schema mismatch; sign-up/sign-in/
get-session/sign-out; create-organização + set-active (200); v1 404; v2 vivo;
expo route 400; `/docs/openapi.json` continua com os paths `/api/auth/*`.
Suites: unit 121 files/633 tests; integration 12 files/58 tests. tsc limpo.

> **Dívida pré-existente (NÃO do upgrade):** 16 spec e2e (companies, complaints,
> perfis etc.) falham com `401 — missing authorization token`. Elas usam o JWT
> legado `app.jwt.sign({ sub, user })`, que o `verify-session` atual (better-auth,
> desde `1514fb1`) não valida. Regressão do trabalho de migração (T01–T04), não
> do 1.7.3. Escopo do T06: migrar essas specs pra sessão better-auth real.

## Testes

N/A neste repo — validação acontece nos repos web/mobile.
