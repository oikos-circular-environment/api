# T03 — Aninhar rotas de admin sob `/moderation`

**Status:** [x] Concluído
**Depende de:** T01
**Arquivos:** `src/app.ts`

## Contexto

T01 moveu o *módulo* de `auth` para `moderation`, mas manteve a URL igual
(`/v2/users/*`) — só o dono do arquivo mudou. Christian corrigiu: a URL também
precisa refletir o aninhamento. `moderation` vai ter endpoints públicos (ex.
`/v1/moderation/support`, já existente) e privados — a listagem/gestão de usuários é
obviamente privada (usa `verify-session`/bearer da sessão Better Auth v2), então fica
em `/v2/moderation/users`, não `/v1`.

## Mudança

Em `src/app.ts`, a única linha que muda é o prefixo de registro:

```ts
// antes
app.register(usersAdminRoutes, { prefix: "/v2" });
// depois
app.register(usersAdminRoutes, { prefix: "/v2/moderation" });
```

Não editar `src/modules/moderation/users-admin-routes.ts` — os paths internos lá
(`/users`, `/users/:id`, `/users/:id/role`, etc.) já ficam corretos automaticamente
com o novo prefixo, virando `/v2/moderation/users`, `/v2/moderation/users/:id`, etc.

`/v1/moderation/support` (rota pública, `moderationRoutes`, prefix `/v1`) não muda —
continua onde está.

## Atualizar o e2e spec

`src/modules/moderation/users-admin.e2e.spec.ts` usa `app.inject({ url: "/v2/users"
... })` com o path **hardcoded** (confirmado por grep — não é relativo a nenhuma
constante). Substituir todas as ocorrências de `/v2/users` por `/v2/moderation/users`
nesse arquivo — inclusive as com interpolação (`` `/v2/users/${targetId}` `` etc.).
**Não tocar** nos paths `/v2/auth/sign-up` e `/v2/auth/sign-in` do mesmo arquivo
(setup de sessão, módulo `auth`, não muda).

## Verificação

- `npx tsc --noEmit` limpo.
- `npm run lint` sem novos warnings.
- `npm run test:e2e -- users-admin` verde.
- Manual (Scalar `/docs`): confirmar que o grupo "Users Admin" aparece agora sob
  `/v2/moderation/users/*`.
