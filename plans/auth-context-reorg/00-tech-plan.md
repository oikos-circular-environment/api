# Reorganização de contextos — admin → moderation, users → accounts

Descoberto ao retomar api#66 (login social): dois pedaços do domínio de auth estão no
lugar errado. Este plano é ortogonal ao E05 — nenhum arquivo se sobrepõe — e roda na
mesma branch `christiancesar/8-adicionar-better-auth-na-api`.

## Decisões

- **Painel admin (`/v2/users`) sai de `auth`, entra em `moderation`.** Não tem relação
  com autenticação — é CRUD de usuários via Better Auth admin plugin. `moderation` já
  existe como módulo e é o lugar natural para gestão de usuários da plataforma.
- **`users` (antigo `/v1/users`) vira `accounts`.** Depois da remoção do JWT legado
  (#67), sobrou só `GET /users/me` (redundante com `/v2/auth/session`) e o ciclo de
  vida de exclusão de conta (LGPD). `accounts` é o contexto de crescimento futuro para
  self-service do usuário logado (segurança, preferências, etc.); `auth` fica restrito
  a autenticação/sessão.
- **Nomes de classe internos não mudam.** `UsersRepository`, `PrismaUsersRepository`,
  `InMemoryUsersRepository`, o tipo `User` e `userSchema` continuam com esse nome —
  eles espelham o model Prisma `User`, que é o mesmo em qualquer módulo. Só o limite
  do módulo (pasta + rotas) muda de `users` para `accounts`. Evita um rename mecânico
  grande e de baixo valor.
- **Rotas de conta sobem de `/v1` para `/v2`.** Já usam `verify-session` (sessão do
  Better Auth) internamente — o prefixo `/v1` era debt de nomenclatura, não refletia
  o mecanismo real.
- **Nota de nomenclatura:** a tabela Prisma `accounts` (Better Auth: credencial/social
  por `provider_id`) e o módulo `src/modules/accounts` (self-service do usuário) são
  conceitos diferentes que passam a compartilhar o nome. Isso é intencional — Christian
  confirmou que "account" aqui é sobre a conta do usuário logado, não a entidade
  `Account` do Better Auth.
- **Sem RBAC novo.** `role="admin"` continua sendo o único gate; separar
  moderador/dono fica para quando o épico de RBAC multi-tenant for priorizado.
- **Sem compat layer.** `/v1/users/*` é removido por completo, não redirecionado.
  Atualização de mobile/web para `/v2/accounts` é sub-issue própria (mesmo padrão
  usado nos outros épicos), fora de escopo aqui.

## Tickets

Ver `tickets/`. T02 depende da estrutura final estar clara mas não depende
tecnicamente de T01 (arquivos não se cruzam) — podem rodar em qualquer ordem, mas
foram sequenciados para reduzir o número de janelas de contexto do executor.

## Verificação (roda no fim de cada ticket)

- `npx tsc --noEmit`
- `npm run lint`
- `npm run test`
- Grep de guarda: `grep -rn "modules/auth/routes/v2/users-admin-routes\|modules/auth/use-cases/v2/admin\|modules/users/" src cli --include=*.ts` deve voltar vazio ao final de T01+T02 (fora de `src/modules/moderation` e `src/modules/accounts`, que são os novos donos).
