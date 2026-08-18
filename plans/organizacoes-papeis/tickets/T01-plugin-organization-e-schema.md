# T01 — Ligar o plugin `organization` do Better Auth + `Company.organization_id`

**Status:** [x] Concluído
**Depende de:** nada
**Módulos:** `prisma/schema.prisma`, `src/modules/auth/providers/auth/better-auth/`

## Contexto

`better-auth` (`^1.6.26`) já está instalado e o plugin `organization` nunca foi importado
(confirmado por grep em `src/modules`). Hoje só `admin()` e `bearer()` estão em
`plugins: [...]` (`better-auth.ts:99-116`). Este ticket liga o plugin, define os papéis
`owner`/`admin`/`user` (a nomenclatura nativa é `owner`/`admin`/`member` — ver decisão no
`00-tech-plan.md`) e cria a coluna que liga `Company` à organização pareada. Não cria nenhuma
organização ainda — isso é T04 (seed) e o use-case de criar company (fora deste ticket, mas
citado como próximo passo).

## Passo 1 — `src/modules/auth/providers/auth/better-auth/organization-permissions.ts` (novo arquivo)

```ts
import { createAccessControl } from "better-auth/plugins/access";

const statement = {
	organization: ["update", "delete"],
	member: ["create", "update", "delete"],
	invitation: ["create", "cancel"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
	organization: ["update", "delete"],
	member: ["create", "update", "delete"],
	invitation: ["create", "cancel"],
});

export const admin = ac.newRole({
	organization: ["update"],
	member: ["create", "update", "delete"],
	invitation: ["create", "cancel"],
});

export const user = ac.newRole({
	organization: [],
	member: [],
	invitation: [],
});
```

Permissões espelham os papéis default do plugin (`ownerAc`/`adminAc`/`memberAc` em
`better-auth/plugins/organization/access/statement.ts`), sem o recurso `team`/`ac` (não usamos
teams). `user` fica sem nenhuma permissão de gestão — é só membro comum, consistente com "futuro,
não agora" pras ações de admin/user dentro da organização.

## Passo 2 — `better-auth.ts`: registrar o plugin

- Import: `import { organization } from "better-auth/plugins/organization";` e
  `import { ac, admin as orgAdmin, owner, user } from "./organization-permissions.js";`
  (renomear o import pra não colidir com `admin` do plugin de admin de plataforma, já importado
  na linha 4).
- Adicionar `session.fields.activeOrganizationId: "active_organization_id"` ao objeto `session`
  existente (`better-auth.ts:82-91`) — o plugin `organization` estende a sessão com esse campo
  (`SessionDefaultFields.activeOrganizationId`).
- Adicionar ao array `plugins` (depois de `bearer()`, `better-auth.ts:115`):
  ```ts
  organization({
  	ac,
  	creatorRole: "owner",
  	roles: { owner, admin: orgAdmin, user },
  	schema: {
  		organization: {
  			fields: { createdAt: "created_at", updatedAt: "updated_at" },
  		},
  		member: {
  			fields: {
  				organizationId: "organization_id",
  				userId: "user_id",
  				createdAt: "created_at",
  			},
  		},
  		invitation: {
  			fields: {
  				organizationId: "organization_id",
  				inviterId: "inviter_id",
  				expiresAt: "expires_at",
  				createdAt: "created_at",
  			},
  		},
  	},
  }),
  ```
  Segue o mesmo padrão de field-mapping já usado pra `user`/`account`/`session`/`verification`
  nesse arquivo (DB em snake_case, Better Auth em camelCase).

## Passo 3 — `prisma/schema.prisma`: novos models + FK em `Company`

Adicionar depois do model `Verification` (mesma vizinhança dos outros models do Better Auth):

```prisma
model Organization {
  id         String    @id @default(uuid())
  name       String
  slug       String    @unique
  logo       String?
  created_at DateTime  @default(now())
  updated_at DateTime?

  members     Member[]
  invitations Invitation[]
  company     Company?

  @@map("organizations")
}

model Member {
  id         String   @id @default(uuid())
  role       String   @default("member")
  created_at DateTime @default(now())

  organization_id String
  organization    Organization @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  user_id String
  user    User   @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([organization_id])
  @@index([user_id])
  @@map("members")
}

model Invitation {
  id         String    @id @default(uuid())
  email      String
  role       String
  status     String    @default("pending")
  expires_at DateTime?
  created_at DateTime  @default(now())

  organization_id String
  organization    Organization @relation(fields: [organization_id], references: [id], onDelete: Cascade)

  inviter_id String
  inviter    User   @relation("InvitationInviter", fields: [inviter_id], references: [id], onDelete: Cascade)

  @@index([organization_id])
  @@map("invitations")
}
```

Em `model User` (`schema.prisma:15-40`), adicionar duas relações reversas junto de `accounts`/
`sessions`:
```prisma
  members           Member[]
  sent_invitations  Invitation[] @relation("InvitationInviter")
```

Em `model Session` (`schema.prisma:63-78`), adicionar `active_organization_id String?` (coluna
pro campo mapeado no Passo 2).

Em `model Company` (`schema.prisma:123-154`), adicionar:
```prisma
  organization_id String       @unique
  organization    Organization @relation(fields: [organization_id], references: [id])
```
**Checar o estado real da tabela `companies` antes de decidir se `organization_id` entra direto
como `NOT NULL @unique`** (branch de feature, mas pode já ter dado de dev/seed rodado). Se houver
linha existente, adicionar como nullable primeiro, rodar um script de backfill (criar uma
`Organization` + `Member` `owner` pra cada `Company.user_id` existente, na mesma lógica que o
use-case de criação vai usar depois), depois alterar pra `NOT NULL`. Se a tabela estiver vazia,
pode entrar `NOT NULL @unique` direto.

## Passo 4 — gerar e aplicar migração

- `npm run migrate:generate` (regenera o client) e `npm run migrate:dev` (cria a migração
  `add_organization_member_invitation` ou nome equivalente).
- Conferir que o client gerado em `src/generated/prisma` expõe `prisma.organization`,
  `prisma.member`, `prisma.invitation`.

## Fora de escopo

- Criar organização de fato em algum use-case (isso é responsabilidade do use-case de criação de
  `Company`, que passa a chamar `auth.api.createOrganization` — ticket próprio, fora da Trilha A
  descrita aqui, ou pode ser adicionado como T05 se o Christian quiser nesta mesma trilha).
- Endpoints de convite/gestão de membros (plugin já os expõe via `auth.api.*`, só não são
  chamados por nenhuma rota própria da aplicação ainda).

## Verificação

- `npx tsc --noEmit` limpo.
- `npm run migrate:dev` roda sem erro, `npm run test` continua verde (nada deveria quebrar —
  ticket é só aditivo).
- Teste manual: `auth.api.createOrganization({ body: { name: "Teste", slug: "teste" }, headers })`
  via um script ad-hoc ou teste de integração cria `Organization` + `Member` com `role: "owner"`.
