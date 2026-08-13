# Organizações e papéis — base pro login universal do web

O epic `api#8` trouxe o Better Auth mas deixou RBAC multi-tenant fora de escopo
(`plans/auth-context-reorg/00-tech-plan.md`, `plans/better-auth/01-technical-plan.md`). O web vai
ganhar login agora (issue web#8) e esse login precisa nascer já em cima do modelo de acesso
modular que vai sustentar o futuro módulo pago (dashboard/funcionalidades avançadas liberadas por
organização) — sem isso o front seria construído sobre um papel que já se sabe que vai ser
refeito. Este plano é a Trilha A do plano cross-repo aprovado em
`/home/ccrs/.claude/plans/aproveitando-que-estamos-mexendo-quiet-octopus.md` — só a parte da API.
Roda na mesma branch `christiancesar/8-adicionar-better-auth-na-api`.

## Decisões

- **Organização = plugin `organization` do Better Auth** (`^1.6.26`, já instalado, nunca
  importado — confirmado via grep). Sem tabela de membership feita à mão: o plugin já cria
  `Organization`/`Member`/`Invitation`, já resolve "owner não pode ser removido", já resolve
  convites (mesmo sem UI de convite agora — ver "Fora de escopo").
- **`Company` continua sendo a entidade de domínio; `Organization` é só a casca de controle de
  acesso.** `Company` guarda identidade (CPF/CNPJ), tipo, endereço, horários, resíduos, serviços,
  validação — nada disso pertence ao Better Auth. `Organization`/`Member` só sabem quem é membro
  e com qual papel. Os dois vivem em 1:1, criados juntos: o use-case de criar `Company`
  (`src/modules/companies`) passa a, na mesma operação, chamar `auth.api.createOrganization` e
  gravar o id retornado em `Company.organization_id` — o criador vira `owner` no `Member`.
- **`Company.organization_id String @unique`, não PK compartilhada.** Reaproveitar o mesmo valor
  de id nas duas tabelas dependeria de o Better Auth aceitar id customizado na criação (não
  confirmado) e acopla demais ao schema interno do plugin. FK única deixa aberto, sem migração
  dolorosa, o caso futuro de uma organização com várias companies — basta relaxar o `@unique`.
- **Organização não nasce no sign-up.** Nasce quando o usuário cria a primeira `Company`. Um
  usuário sem company não tem organização — é o caso de `christiancnp@gmail.com` no seed (ver
  T04). Por isso `better-auth.ts` NÃO ganha hook de `organizationCreation` automático.
- **Papéis de organização: `owner` / `admin` / `user`.** O plugin não tem um "rename" direto de
  `member` — a chave `"user"` só existe se for uma role definida via `createAccessControl` +
  `ac.newRole(...)` e passada em `organization({ roles: { owner, admin, user } })` (sem a chave
  `"member"`). Isso troca o *nome* da role, mas o campo `Member.role` no schema interno do plugin
  ainda tem `defaultValue: "member"` embutido — então toda criação de `Member` daqui pra frente
  precisa passar `role` explicitamente (`creatorRole: "owner"` já cobre a criação via
  `createOrganization`; qualquer `addMember`/convite futuro precisa lembrar disso, ver T01).
- **`role` de plataforma (staff) renomeia de `"admin"` para `"moderator"`.** Continua sendo string
  livre no schema (`User.role`, sem enum — não muda aqui), único papel de staff, sem hierarquia
  nova. É ortogonal ao papel de organização — um `moderator` gerencia usuários da plataforma via
  `/v2/moderation/users`; um `owner`/`admin`/`user` de organização gerencia uma company
  específica. Os dois sistemas não se cruzam num único middleware (ver T02).
- **Ownership de company migra de `user_id` direto pra papel na organização vinculada.**
  `company-routes.ts` hoje faz `request.authV2User.id === company.user_id` em toda mutação. Isso
  passa a checar o papel do usuário na `Organization` ligada à company (via API do plugin). Hoje
  o comportamento é idêntico (só existe `owner`, criado junto com a company) — a mudança é só
  estrutural, prepara pro dia em que existirem membros `admin`/`user`.
- **Sessão expõe `organizations`.** `authV2UserSchema` e o mapper de resposta ganham uma lista
  (`id`, `company_id`, `name`, `role`) — é o que o web vai usar pra decidir org switcher e seção
  de moderação sem re-perguntar a API a cada render.
- **Seed fixo corrigido e expandido.** `prisma/seeds/shared/upsert-user.ts` está quebrado hoje —
  referencia `User.password`, removido do schema desde a migração pro Better Auth (commit
  `54da76b`). Corrigir pra criar via `auth.api.signUpEmail` + `auth.api.setRole`, e adicionar dois
  usuários fixos, pré-verificados, fora do pipeline de dados aleatórios de cidade:
  `christiancnp@gmail.com` (`role: "user"`, sem company) e `christian.cesar@oikos.company`
  (`role: "moderator"`, dono de uma company — logo `owner` da organização pareada).

## Fora de escopo

- Campo de grupo/plataforma no usuário (removido do plano original depois de discussão — só
  `role` restringe acesso por enquanto).
- UI/endpoint de convite de membros `admin`/`user` numa organização (o próprio Christian marcou
  como "futuro, não agora" — o plugin já suporta, só não é exposto ainda).
- Separar o módulo de suporte da moderação (mencionado pelo Christian como possível erro de
  posicionamento, mas os planos existentes mostram que foi deliberado — precisa de decisão própria
  antes de mexer, vira ticket de backlog separado).
- Hierarquia entre `moderator` e qualquer outro papel de plataforma — continua um papel só.

## Tickets

Ver `tickets/`:

- **T01** — plugin `organization` + schema (`Organization`/`Member`/`Invitation` +
  `Company.organization_id`). Pré-requisito de tudo abaixo.
- **T02** — renomear `"admin"` → `"moderator"` (papel de plataforma). Independente, pode rodar a
  qualquer momento.
- **T03** — ownership de `Company` migra de `user_id` direto pra membership na organização
  (depende de T01).
- **T04** — `CreateCompanyUseCase` passa a criar a `Organization` pareada (depende de T01).
- **T05** — `/v2/auth/session` e `/v2/auth/sign-in` retornam `organizations` (depende de T01;
  mais simples de testar fim-a-fim depois de T04 existir, mas não depende tecnicamente dele).
- **T06** — corrige o seed quebrado + cria os dois usuários fixos (depende de T01, T02 e T04 —
  precisa do papel `moderator` e do fluxo real de criação de company/organização).

Ordem sugerida pra reduzir janelas de contexto do executor: T01 → T02 → T03 → T04 → T05 → T06.

## Verificação (roda no fim de cada ticket)

- `npx tsc --noEmit`
- `npm run lint`
- `npm run test`
- `npm run test:integration` (organização criada junto com a company, `organization_id` único,
  owner não removível via `auth.api.removeMember`)
- `npm run seed` roda sem erro e cria os dois usuários fixos
- Grep de guarda: `grep -rn '"admin"' src --include=*.ts` não deve mais aparecer como valor de
  `role` de plataforma fora de comentário/teste histórico — só `"moderator"`.
