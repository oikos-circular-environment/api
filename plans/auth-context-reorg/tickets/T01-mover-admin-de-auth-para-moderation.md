# T01 — Mover painel admin de usuários de `auth` para `moderation`

**Status:** [x] Concluído
**Depende de:** nada
**Módulos:** `src/modules/auth`, `src/modules/moderation`, `src/app.ts`

## Contexto

O painel `/v2/users` (list/get/create/set-role/ban/unban/sessions/revoke-sessions/
reset-password/remove) foi implementado dentro de `src/modules/auth/routes/v2/` e
`src/modules/auth/use-cases/v2/admin/`, mas não tem relação com autenticação — é CRUD
de usuários via `auth.api.admin*` (Better Auth admin plugin). `moderation` já existe
como módulo (`src/modules/moderation/`) e é o lugar certo para essa responsabilidade.

`moderation` hoje é um módulo **flat** (sem subpasta `routes/` nem `v2/`): só
`moderation-routes.ts` na raiz, `dtos/`, `entities/`, `use-cases/`, `repositories/`.
Seguir essa convenção ao mover — não recriar a estrutura `routes/v2/` do `auth`.

## O que mover (git mv, preservando histórico)

| De | Para |
|---|---|
| `src/modules/auth/routes/v2/users-admin-routes.ts` | `src/modules/moderation/users-admin-routes.ts` |
| `src/modules/auth/routes/v2/users-admin.e2e.spec.ts` | `src/modules/moderation/users-admin.e2e.spec.ts` |
| `src/modules/auth/dtos/users-admin-dto.ts` | `src/modules/moderation/dtos/users-admin-dto.ts` |
| `src/modules/auth/use-cases/v2/admin/*.ts` (10 use-cases + 10 `.spec.ts`) | `src/modules/moderation/use-cases/admin/*.ts` |

Não mover: `src/modules/auth/dtos/auth-v2-dto.ts`, `src/modules/auth/providers/**`,
`src/modules/auth/routes/v2/auth-v2-routes.ts` — esses continuam em `auth` (é
autenticação/sessão de verdade).

## Ajustes de import

Depois do `git mv`, corrigir imports que quebraram:

1. **`src/modules/moderation/dtos/users-admin-dto.ts`**: `import { authV2UserSchema }
   from "./auth-v2-dto.js"` → `from "@/modules/auth/dtos/auth-v2-dto.js"`.

2. **`src/modules/moderation/use-cases/admin/*.ts`** (não os `.spec.ts` — esses já
   usam alias `@/modules/auth/...` e não mudam): trocar imports relativos
   `../../../providers/auth/auth-provider.js` (e similares, ex.:
   `../../../errors/*.js` se algum use-case importar erro de `auth`) por
   `@/modules/auth/providers/auth/auth-provider.js` (mesmo padrão para outros
   caminhos sob `src/modules/auth/`). Conferir cada um dos 10 arquivos — os imports
   variam entre `AuthProvider` sozinho e tipos adicionais (`AuthUser`, `AuthSession`).

3. **`src/modules/moderation/users-admin-routes.ts`**: trocar todos os imports
   relativos `../../` (que apontavam para dentro de `auth`) por `@/modules/auth/...`:
   - `authV2UserSchema` de `../../dtos/auth-v2-dto.js` → `@/modules/auth/dtos/auth-v2-dto.js`
   - `AuthSession`, `AuthUser` de `../../providers/auth/auth-provider.js` → `@/modules/auth/providers/auth/auth-provider.js`
   - `auth` de `../../providers/auth/better-auth/better-auth.js` → `@/modules/auth/providers/auth/better-auth/better-auth.js`
   - `makeBetterAuthAuthProvider` de `../../providers/auth/better-auth/better-auth-auth-provider.js` → `@/modules/auth/providers/auth/better-auth/better-auth-auth-provider.js`
   - `requireRole` de `../../../common/middlewares/require-role.js` → `@/modules/common/middlewares/require-role.js`
   - `createVerifySession` de `../../../common/middlewares/verify-session.js` → `@/modules/common/middlewares/verify-session.js`
   - `withBearerAuth` de `../../../common/types/openapi-security.js` → `@/modules/common/types/openapi-security.js`
   - `appErrorSchema` de `../../common/errors/app-error.js` → `../common/errors/app-error.js` (mesmo padrão relativo que `moderation-routes.ts` já usa hoje para `common`)
   - Os 10 use-cases: import relativo local `./use-cases/admin/<nome>.js` (local ao módulo agora, sem `../../`)
   - `listUsersAdminQuerySchema`, `userAdminParamsSchema` etc. de `../../dtos/users-admin-dto.js` → `./dtos/users-admin-dto.js`

4. **`src/modules/moderation/users-admin.e2e.spec.ts`**: já usa só imports com alias
   `@/...` — não deve precisar de nenhum ajuste, só confirmar.

5. **`src/app.ts`**: `import { usersAdminRoutes } from
   "./modules/auth/routes/v2/users-admin-routes.js"` → `"./modules/moderation/users-admin-routes.js"`.
   O `app.register(usersAdminRoutes, { prefix: "/v2" })` não muda — a URL
   `/v2/users/*` continua igual, só o módulo dono muda.

## O que NÃO muda

- Nenhuma rota, path, schema de request/response ou comportamento — é puramente
  reorganização de arquivos.
- `role="admin"` continua sendo o gate (`requireRole("admin")`); não introduzir
  conceito novo de moderador vs. admin aqui.

## Verificação

- `npx tsc --noEmit` limpo.
- `npm run lint` sem novos warnings.
- `npm run test` — os 10 `.spec.ts` de use-case devem passar do novo local sem
  alteração de conteúdo (só mudam de pasta).
- `npm run test:e2e -- users-admin` (ou o filtro equivalente) verde.
- Grep de guarda: `grep -rn "modules/auth/routes/v2/users-admin\|modules/auth/use-cases/v2/admin\|modules/auth/dtos/users-admin-dto" src --include=*.ts` deve voltar vazio.
