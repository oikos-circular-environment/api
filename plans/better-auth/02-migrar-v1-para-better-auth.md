# Migrar `/v1/auth` e rotas de recurso para better-auth (api#115)

Continuação do item 9 ("futuro") de [`01-technical-plan.md`](./01-technical-plan.md): "migrar recurso+mobile p/ v2; aposentar `/v1/auth`".

## Decisão

Substituir totalmente a implementação de `/v1/auth/*` (JWT + refresh token próprio) por better-auth, **sem remover os paths** `/v1/auth/login`, `/v1/auth/refresh`, `/v1/auth/logout` do router — o app mobile ainda aponta pra eles e vai trocar de endpoint numa migração separada (vai integrar a lib Expo do better-auth). Sem manter compatibilidade de contrato de resposta: `/v1/auth/login` agora devolve `{token, user}` (sessão better-auth) em vez de `{token, refreshToken}`; `/v1/auth/refresh` não rotaciona mais nada, só devolve a sessão atual pro bearer token apresentado (sessão better-auth renova sozinha).

Junto disso, toda rota de recurso que usava `verify-jwt.ts`/`request.user.sub` migrou pra `verify-session.ts`/`request.authV2User` — era isso ou quebrar completamente, já que `/v1/auth/login` para de emitir JWT: `complaints`, `companies`, `profiles`, `accounts` (`/users/me/*`, incluindo `change-password` que agora delega pro `ChangePasswordUseCase` v2 e não devolve mais token novo, `204`).

## Verificação de e-mail

Sem mudança: `REQUIRE_EMAIL_VERIFICATION` já tinha default `false` (beta aberto). Não precisou de ação nesta migração.

## Bug de geração de id descoberto durante a execução

O better-auth por padrão gera ids num formato próprio (base62, ex. `PBiEiZnjmwePKSTCbEPVP2s5nmITIWBL`), diferente do UUID que todo o resto do schema usa (`@default(uuid())` em `User`/`Account`/`Session`/`Verification`/`Organization`/`Member`/`Invitation`). Isso quebrava qualquer schema Zod de resposta que valide um id de usuário como `z.uuid()` (ex. `profileSchema.user_id`) assim que um usuário real do better-auth passava por ali — `500 FST_ERR_RESPONSE_SERIALIZATION`. Corrigido configurando `advanced.database.generateId: false` em `better-auth.ts`, delegando a geração de id pro default do Prisma (mesmo padrão UUID do resto do app) em vez de reescrever schema Zod por schema Zod.

## Gap conhecido, aceito para o beta

O provider de credencial do better-auth lê de `accounts` (tabela própria), não de `users.password`. Usuário criado pelo endpoint legado `POST /v1/users/register` (`RegisterUserUseCase`, `src/modules/accounts/use-cases/register-user-use-case.ts`) só grava `users.password` — continua sem conseguir logar via `/v1/auth/login` (nem via `/v2/auth/sign-in`) depois desta migração, porque não existe linha em `accounts` pra ele.

Decisão do usuário: não fazer backfill nem corrigir `/users/register` agora — contas de beta não são reais, gente cria conta nova. Se algum dia isso importar, o fix é: (a) `/users/register` passar a chamar `SignUpUseCase` v2 (better-auth) em vez de `RegisterUserUseCase`/`PrismaUsersRepository`, e (b) uma migration de dados que insere em `accounts` (`provider_id = "credential"`) reaproveitando o hash de `users.password` pra quem já existe.

## Limpeza

Removido (zero consumidor restante, confirmado por grep antes de apagar):
- `src/modules/common/middlewares/verify-jwt.ts`
- `src/modules/common/services/auth/token-service.ts`
- `src/modules/common/types/auth-token-payload.ts`, `src/@types/fastify-jwt.d.ts`
- `src/modules/auth/use-cases/v1/{authenticate-user,refresh-token}-use-case.ts` (+ specs)
- `src/modules/auth/repositories/{auth-repository,refresh-token-repository}.ts` (interfaces + prisma + in-memory)
- `src/modules/accounts/use-cases/change-password-use-case.ts` (+ spec)

Mantido intocado, só sem escrita nova: tabela `refresh_tokens` (schema Prisma) — decisão do usuário, sem motivo pra apagar a tabela agora.

## Consistência de sessão

Todo lugar que lia `request.authV2User!.id` (non-null assertion) — inclusive código pré-existente de moderação/support/denunciation, não só o desta migração — passou a usar `requireAuthUser(request)` (`src/modules/common/middlewares/verify-session.ts`), que lança 401 explícito em vez de silenciar o tipo. Motivado por revisão do usuário durante a execução.

## Incidente de execução (registrado por transparência)

Durante a execução original, um tier gratuito da chain do `opencode` dentro do agente `executor` passou dos limites do ticket, e um `git reset` subsequente apagou o trabalho não commitado de 8 tarefas paralelas rodando no mesmo working directory (nada tinha sido commitado ainda). Corrigido em `.claude/agents/executor.md`: orquestrador passa a invocar `executor` sempre com `isolation: "worktree"`, e o agente commita seu próprio ticket assim que tsc/lint/test passam, em vez de deixar tudo pendurado no working tree. O trabalho foi refeito do zero com essa disciplina.

## Fora de escopo

- Trocar endpoint no app mobile (repo separado, tarefa futura, vai usar a lib Expo do better-auth).
- Backfill de `accounts` pra usuário legado (ver "Gap conhecido" acima).
- Login social, RBAC multi-tenant — já fora de escopo do plano original.
