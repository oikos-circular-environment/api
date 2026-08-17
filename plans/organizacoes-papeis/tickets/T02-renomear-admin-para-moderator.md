# T02 — Renomear o valor de `role` de plataforma: `"admin"` → `"moderator"`

**Status:** [x] Concluído
**Depende de:** nada (independente de T01, mas pode rodar depois por ordem de plano)
**Módulos:** `src/modules/common/middlewares/require-role.ts`,
`src/modules/moderation/moderation-user-routes.ts`, specs afetados

## Contexto

`User.role` é string livre (`schema.prisma:21`, sem enum), hoje só usada como `"user"` (default)
ou `"admin"` (staff da plataforma, único gate de `/v2/moderation/users`). O Christian pediu que
esse papel se chame `moderator`. **Não é RBAC novo nem hierarquia** — é uma troca de nome do
mesmo papel único, mantendo `require-role.ts` como igualdade estrita. Confirmado por grep
(`grep -rn '"admin"' src`) que o literal `"admin"` como valor de `role` aparece em exatamente 2
arquivos de produção — o resto são specs.

**Nota:** o pacote `admin` importado em `better-auth.ts` (plugin `admin()` da Better Auth) e a
pasta `src/modules/moderation/use-cases/admin/` **não mudam de nome** — só o valor da string
`role` muda. Mesma lógica de T02 de `plans/auth-context-reorg/`: nome de plugin/pasta interna
≠ o valor de negócio que ele representa.

## Passo 1 — código de produção

- `src/modules/common/middlewares/require-role.ts`: sem mudança de lógica (continua igualdade
  estrita) — o valor passado é que muda no call site.
- `src/modules/moderation/moderation-user-routes.ts:56`:
  `const requireAdmin = requireRole("admin");` → `const requireModerator = requireRole("moderator");`
  e renomear as 10 referências a `requireAdmin` nos `preHandler: [verifySession, requireAdmin]`
  (linhas 72, 102, 127, 153, 181, 214, 242, 269, 295, 326) para `requireModerator`.

## Passo 2 — dado existente

Se já existir algum `User` com `role = "admin"` em algum banco de dev/seed, escrever e rodar um
`UPDATE "users" SET role = 'moderator' WHERE role = 'admin';` (script ad-hoc em
`scripts/` ou via `prisma db execute`) — não é migração de schema (coluna não muda), é migração
de dado.

## Passo 3 — specs

Trocar `role: "admin"` → `role: "moderator"` e `requireRole("admin")`/`makeEmail("admin")` pelo
equivalente em:
- `require-role.spec.ts`
- `moderation/use-cases/admin/*.spec.ts` (reset-user-password, create-user, revoke-user-sessions,
  get-user, set-user-role, list-users, list-user-sessions, ban-user, remove-user, unban-user)
- `moderation/moderation-admin.e2e.spec.ts`
- `auth/providers/auth/auth-provider-contract.spec.ts`

Não é preciso renomear os nomes dos arquivos/describes desses specs (continuam testando o mesmo
use-case de admin/moderação) — só o valor literal da string.

## Pegadinha real encontrada na implementação (registrar aqui pra quem ler depois)

O plugin `admin()` do Better Auth tem seu **próprio** gate de autorização interno
(`adminRoles`, default `["admin"]`) que protege as implementações reais de
`auth.api.listUsers/setRole/banUser/createUser/...` — é **separado** do `requireRole()` deste
repo. Só trocar o valor do `role` e o `requireRole("moderator")` não é suficiente: sem configurar
o plugin, toda chamada admin real continua exigindo literalmente `role === "admin"` e devolve 403
mesmo com `requireRole` passando. Além disso, `adminRoles` só aceita valores que existem num
`roles` customizado — passar `adminRoles: ["moderator"]` sem isso quebra a inicialização inteira
do `betterAuth()` (`BetterAuthError: Invalid admin roles`), derrubando todo teste e2e que importa
`better-auth.ts`, não só os de moderação. Solução: access control próprio pro plugin `admin`
(`src/modules/auth/providers/auth/better-auth/platform-permissions.ts`, usando
`defaultStatements`/`adminAc` de `better-auth/plugins/admin/access`), passado como
`admin({ ac, adminRoles: ["moderator"], roles: { moderator, user } })`.

## Fora de escopo

- Qualquer hierarquia entre `moderator` e outro papel de plataforma.
- Renomear pastas/classes (`use-cases/admin/`, `CreateUserUseCase`, etc.).

## Verificação

- `npx tsc --noEmit`, `npm run lint`, `npm run test` verdes.
- Grep de guarda: `grep -rn '"admin"' src --include=*.ts` não deve mais retornar nada como valor
  de `role` (só pode sobrar, se sobrar, o nome do plugin `admin()` da Better Auth, que é uma
  string diferente — confirmar visualmente que não é falso-positivo).
