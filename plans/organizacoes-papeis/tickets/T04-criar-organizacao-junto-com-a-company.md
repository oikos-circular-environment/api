# T04 — `CreateCompanyUseCase` cria a `Organization` pareada

**Status:** [x] Concluído
**Depende de:** T01 (schema/plugin)
**Módulos:** `src/modules/companies/use-cases/create-company-use-case.ts`,
`src/modules/companies/repositories/`, `src/modules/companies/dtos/companies-dto.ts`,
`src/modules/companies/company-routes.ts`

## Contexto

Hoje `CreateCompanyUseCase.execute()` (`create-company-use-case.ts:19-32`) só chama
`companiesRepository.create({ ...data, user_id: userId })` e cria a validação de completude. Este
ticket faz o use-case, na mesma operação, criar a `Organization` pareada (dono = `owner`) e gravar
`organization_id` na company — é o ponto único de nascimento de uma organização (ver decisão no
`00-tech-plan.md`: nada é criado automaticamente no sign-up).

## Passo 1 — porta `OrganizationProvider` (novo)

`src/modules/companies/providers/organization-provider.ts`:
```ts
export interface OrganizationProvider {
	createOrganization(args: {
		name: string;
		userId: string;
	}): Promise<{ organizationId: string }>;
}
```
Implementação real (`providers/better-auth-organization-provider.ts`), injetando o `auth`
instanciado (`better-auth.ts`):
```ts
async createOrganization({ name, userId }) {
	const slug = `${slugify(name)}-${userId.slice(0, 8)}`; // unicidade simples, sem checar colisão
	const org = await auth.api.createOrganization({
		body: { name, slug, userId }, // userId explícito porque não há sessão HTTP aqui — é chamada server-to-server
	});
	if (!org) throw new AppError("Failed to create organization", "ORGANIZATION_CREATE_FAILED", 500);
	return { organizationId: org.id };
}
```
**Conferir na implementação real se `auth.api.createOrganization` aceita `userId` no body pra
criação server-side sem headers de sessão** (a rota pública do plugin normalmente resolve o
criador pela sessão; criar em nome de um `userId` arbitrário — que é o caso aqui, dentro de uma
requisição autenticada por sessão v2, não pela sessão nativa do Better Auth usada pelo plugin —
pode exigir passar `headers` da própria requisição em vez de `userId` solto. Ajustar conforme o
que a chamada realmente aceitar; é o único ponto de incerteza deste ticket.)
Também criar um fake in-memory (`providers/fake-organization-provider.ts`) pros specs do
use-case.

## Passo 2 — `companies-dto.ts` e repositório

- `CreateCompany` (dto) ganha `organization_id: z.string()`.
- `CompaniesRepository.create` já recebe `CreateCompany` inteiro — só precisa que a implementação
  Prisma (`companies-repository-prisma.ts:37-52`) inclua `organization_id: data.organization_id`
  no `data` do `prisma.company.create`.

## Passo 3 — `CreateCompanyUseCase`

```ts
constructor(
	private readonly companiesRepository: CompaniesRepository,
	private readonly validationRepository: CompanyValidationRepository,
	private readonly organizationProvider: OrganizationProvider,
) {}

async execute({ userId, data }: CreateCompanyUseCaseRequest): Promise<Company> {
	const { organizationId } = await this.organizationProvider.createOrganization({
		name: data.business_name,
		userId,
	});

	const company = await this.companiesRepository.create({
		...data,
		user_id: userId,
		organization_id: organizationId,
	});

	await this.validationRepository.create(
		company.id,
		isGeneralRegistrationValid(company),
	);

	return company;
}
```
Se a criação da company falhar depois da organização já ter sido criada, a organização fica órfã
(sem company) — aceitável por agora (não há UI que liste organizações soltas), mas registrar como
limitação conhecida no código (comentário curto). Não implementar rollback/saga neste ticket.

## Passo 4 — `company-routes.ts`

Instanciar `BetterAuthOrganizationProvider` (usa o `auth` já importado no arquivo) e passar ao
`new CreateCompanyUseCase(companiesRepository, validationRepository, organizationProvider)`.

## Fora de escopo

- Tratar o caso de nome de company duplicado gerando slug de organização colidente — usar sufixo
  simples (trecho do `userId`) é suficiente por agora, sem checar unicidade ativa.
- Rollback transacional entre criar organização e criar company.

## Verificação

- `npx tsc --noEmit`, `npm run lint`, `npm run test` (specs do use-case com o fake provider)
  verdes.
- `npm run test:integration`: criar uma company gera exatamente uma `Organization` +um `Member`
  com `role: "owner"` apontando pro criador; `Company.organization_id` bate com o id da
  organização criada.
