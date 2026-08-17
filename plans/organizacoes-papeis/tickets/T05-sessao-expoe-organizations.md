# T05 — `/v2/auth/session` e `/v2/auth/sign-in` passam a retornar `organizations`

**Status:** [x] Concluído
**Depende de:** T01 (precisa de `Member`/`Organization`/`Company.organization_id`)
**Módulos:** `src/modules/auth/dtos/auth-v2-dto.ts`, `src/modules/auth/routes/v2/auth-v2-routes.ts`,
novo repositório em `src/modules/auth/`

## Contexto

O web vai decidir o que renderizar (org switcher, seção de moderação) a partir do payload de
sessão, sem re-perguntar a API a cada render — por isso `organizations` precisa vir junto da
resposta de sign-in e de `/v2/auth/session`.

**Decisão de design: não usar `auth.api.listOrganizations` nem estender `mapUser()`/`AuthUser`.**
Dois motivos:
1. `mapUser()` roda em **todo request autenticado** via `verifySession`
   (`src/modules/common/middlewares/verify-session.ts:26-36`, chamado em quase toda rota
   protegida) — colar uma query de organizations ali seria N+1 em todo request, não só nos dois
   endpoints que precisam disso.
2. A resposta documentada de `GET /organization/list` da Better Auth não deixa claro se inclui o
   `role` do usuário em cada organização (só mostra `id`/`name` no exemplo da doc) — como este
   backend já tem acesso direto ao Prisma, é mais simples e confiável ler `Member`/`Organization`
   direto via uma query própria, sem depender do formato exato de resposta de um endpoint de
   terceiro.

## Passo 1 — novo repositório `src/modules/auth/repositories/user-organizations-repository.ts`

```ts
export type UserOrganizationSummary = {
	id: string;
	companyId: string | null;
	name: string;
	role: string;
};

export interface UserOrganizationsRepository {
	findByUserId(userId: string): Promise<UserOrganizationSummary[]>;
}
```

Implementação Prisma (`repositories/prisma/user-organizations-repository-prisma.ts`):
```ts
async findByUserId(userId: string) {
	const memberships = await prisma.member.findMany({
		where: { user_id: userId },
		include: { organization: { include: { company: true } } },
	});

	return memberships.map((m) => ({
		id: m.organization.id,
		companyId: m.organization.company?.id ?? null,
		name: m.organization.name,
		role: m.role,
	}));
}
```
Mais uma implementação in-memory (`repositories/in-memory/in-memory-user-organizations-repository.ts`), no mesmo padrão dos outros repositórios do repo, pra uso em specs.

## Passo 2 — DTO

`auth-v2-dto.ts`: adicionar
```ts
export const authV2OrganizationSchema = z.object({
	id: z.string(),
	company_id: z.string().nullable(),
	name: z.string(),
	role: z.string(),
});
```
e incluir `organizations: z.array(authV2OrganizationSchema)` em `authV2UserSchema` (`:16-28`).
Isso é **aditivo** ao schema atual — não remove nenhum campo existente.

## Passo 3 — rotas

Em `auth-v2-routes.ts`, nos dois handlers que hoje retornam `authUserResponseMapper(user)`
(sign-in, `:80-100`, e `GET /session`, `:121-138`): depois de montar a resposta base, chamar
`userOrganizationsRepository.findByUserId(user.id)` e anexar o resultado como `organizations` no
objeto retornado. Os outros handlers de `auth-v2-routes.ts` (sign-up, sign-out, change-password,
forgot/reset-password, send-verification-email, verify-email) não mudam — não retornam o usuário
completo.

## Fora de escopo

- `auth-user-response-mapper.ts`/`mapUser()`/`AuthUser`/`AuthUserLike` continuam exatamente como
  estão — este ticket não mexe no que popula `request.authV2User`.

## Verificação

- `npx tsc --noEmit`, `npm run lint`, `npm run test` verdes.
- `npm run test:integration`: usuário sem nenhuma company → `organizations: []`; usuário `owner`
  de uma company → `organizations` com um item, `role: "owner"`, `company_id` preenchido.
- Manual via `/docs` (Scalar): `POST /v2/auth/sign-in` e `GET /v2/auth/session` mostram o novo
  campo no schema de resposta.
