# T06 — Corrigir `upsertUser` (quebrado) + seed fixo de dois usuários

**Status:** [x] Concluído
**Depende de:** T01 (organização), T04 (company cria organização), T02 (papel `moderator`)
**Módulos:** `prisma/seeds/shared/upsert-user.ts`, novo `prisma/seeds/fixed-users.seed.ts`,
`prisma/seeds/index.ts`

## Contexto

`upsertUser` (`prisma/seeds/shared/upsert-user.ts:68-81`) está quebrado hoje — chama
`prisma.user.create({ data: { email, password: passwordHash, ... } })`, mas `User` não tem coluna
`password` desde a migração pro Better Auth (commit `54da76b`). O hash de senha vive na tabela
`Account`, linha com `provider_id: "credential"`, `account_id: <id do próprio usuário>` — é
exatamente como o `sign-up.ts` da própria Better Auth grava (confirmado via doc/source oficial).
`npm run seed` provavelmente falha hoje em runtime nesse ponto (a chamada usada por
`data-generated.ts:245` pra cada morador/dono de empresa gerado).

## Passo 1 — corrigir `upsert-user.ts`

```ts
const created = await prisma.user.create({
	data: {
		email: user.email,
		profile: {
			create: {
				full_name: user.full_name,
				display_name: user.display_name,
				phone: user.phone,
				address_id: address.id,
			},
		},
		accounts: {
			create: {
				account_id: "", // ver nota abaixo — precisa do id do user recém-criado
				provider_id: "credential",
				password: passwordHash,
			},
		},
	},
});
```
**Problema do `account_id` circular**: Better Auth grava `accountId: createdUser.id` (o próprio
id do usuário), mas esse id só existe depois do `create`. Duas opções, usar a mais simples:
(a) gerar o `id` do `User` explicitamente antes (`crypto.randomUUID()`), passar como `data.id` no
`user.create` e reusar o mesmo valor em `account_id`; ou (b) fazer o `create` do `User` sem
`accounts` aninhado, pegar `created.id`, e daí um segundo `prisma.account.create({ data: {
account_id: created.id, provider_id: "credential", password: passwordHash, user_id: created.id }
})`. (b) é mais simples de ler — preferir essa.

Resto da função (endereço, `ST_SetSRID`) não muda.

## Passo 2 — `prisma/seeds/fixed-users.seed.ts` (novo)

Cria os dois usuários fixos do Christian, fora do pipeline de dados aleatórios de cidade, e
retorna cedo se já existirem (mesmo padrão de idempotência do `upsertUser`):

- `christiancnp@gmail.com` — `role: "user"` (default do schema, não precisa setar), `name`,
  `email_verified: true`, senha via `auth.api.setUserPassword` ou inserida direto na `Account`
  igual ao Passo 1 (reaproveitar a mesma lógica, extraída se fizer sentido). **Sem company** —
  não roda `CreateCompanyUseCase`, então não gera organização. Senha de dev: variável de ambiente
  `SEED_FIXED_USER_PASSWORD` com default documentado (ex: `"Oikos@123456"`), nunca hardcoded sem
  fallback de env.
- `christian.cesar@oikos.company` — mesma criação de usuário, com `role: "moderator"` (setado via
  `prisma.user.update({ where: { id }, data: { role: "moderator" } })` — mais simples que passar
  pela API de admin do Better Auth dentro do script de seed), `email_verified: true`, e **uma
  company** criada através do fluxo real (`CreateCompanyUseCase` com os providers Prisma reais,
  os mesmos instanciados em `company-routes.ts`) — é assim que ele ganha uma `Organization` com
  `role: "owner"`, exercitando o caminho "moderator + owner" que o web vai testar.

## Passo 3 — `prisma/seeds/index.ts`

Adicionar a chamada, antes ou depois de `seedGeneratedCityData` (independente — não há
dependência de dado entre os dois):
```ts
await seedFixedUsers(prisma);
```

## Fora de escopo

- Adicionar esses dois usuários ao `seed:prod` (`scripts/seed-prod.ts`) — é seed de
  desenvolvimento, não confundir com dado de produção.

## Verificação

- `npm run seed` roda do zero sem erro (banco limpo) e re-roda sem erro (idempotência) —
  hoje isso provavelmente falha antes deste ticket.
- Depois do seed: login manual via `/docs` (Scalar) com `christiancnp@gmail.com` e a senha de dev
  configurada funciona (`POST /v2/auth/sign-in`), retorna `role: "user"`, `organizations: []`.
- Login com `christian.cesar@oikos.company` retorna `role: "moderator"`, `organizations` com um
  item, `role: "owner"` nesse item.
