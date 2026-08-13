# T03 — Migrar ownership de `Company` de `user_id` direto pra membership na `Organization`

**Status:** [ ] Pendente
**Depende de:** T01 (schema precisa ter `Company.organization_id` + `Member`)
**Módulos:** `src/modules/companies/repositories/`

## Contexto

Todo acesso a uma company específica (`GET/PUT/PATCH/DELETE /companies/:id` e sub-recursos —
endereço, horários, resíduos, serviços, avatar, validação) passa pelo mesmo ponto único:
`CompaniesRepository.findByUserAndCompanyId(userId, companyId)`, chamado por 13 use-cases
diferentes (`update-company-use-case.ts`, `toggle-company-status-use-case.ts`,
`upload-company-avatar-use-case.ts`, os `get-`/`upsert-` de `company-addresses`,
`company-business-hours`, `company-wastes`, `company-services`, `company-validations`). Hoje a
implementação Prisma (`companies-repository-prisma.ts:28-35`) faz
`prisma.company.findFirst({ where: { id: companyId, user_id: userId } })` — é o único lugar que
precisa mudar. Nenhum dos 13 use-cases muda (mesma assinatura, mesmo contrato).

## Passo 1 — `companies-repository-prisma.ts`

Trocar o `where` de `findByUserAndCompanyId` pra resolver via organização vinculada em vez de
`user_id` direto:

```ts
async findByUserAndCompanyId(userId: string, companyId: string) {
	const company = await prisma.company.findFirst({
		where: {
			id: companyId,
			organization: { members: { some: { user_id: userId } } },
		},
		include: { avatar: true },
	});

	return companyMapper(company ?? null);
}
```

## Passo 2 — `in-memory-companies-repositories.ts`

Ajustar a implementação in-memory equivalente pra checar membership em vez de `user_id` direto
— como hoje o repositório in-memory de companies não tem noção de `Organization`/`Member`, a
forma mais simples é o repositório in-memory continuar guardando `organization_id` na company
fake e receber (via construtor ou setter usado pelos specs) o conjunto de memberships
`{ organizationId, userId }[]` a checar. Ajustar os specs que usam este repositório (ver grep
abaixo) pra popular esse novo dado de teste.

## Passo 3 — limitação conhecida, aceita por agora

`findByUserAndCompanyId` não distingue papel dentro da organização — qualquer membro (owner,
admin ou user) passa. Hoje só existe `owner` na prática (sem convites ainda), então o
comportamento observável não muda. Quando convites de `admin`/`user` existirem, pode ser
necessário diferenciar leitura (qualquer membro) de escrita (só `owner`/`admin`) — **não
implementar isso agora**, só deixar a nota no código (comentário curto, não redigir a decisão de
novo) e no ticket de convites quando ele for aberto.

## Fora de escopo

- `findByUserId` (usado por `GET /companies`, lista "minhas empresas") continua filtrando por
  `Company.user_id` direto — não migra pra membership neste ticket. `Company.user_id` não é
  removido, continua existindo como o criador original.

## Verificação

- `npx tsc --noEmit`, `npm run lint` verdes.
- `npm run test` — specs de todos os 13 use-cases que chamam `findByUserAndCompanyId` continuam
  passando (grep: `grep -rln "findByUserAndCompanyId" src/modules/companies`).
- `npm run test:integration` — teste novo: usuário que **não** é membro da organização da company
  recebe 404 (mesmo comportamento de hoje pra "não é o dono"); usuário que é `owner` continua
  funcionando igual a antes da mudança.
