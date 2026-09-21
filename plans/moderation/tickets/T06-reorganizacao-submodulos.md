# T06 — Extrair `support`/`denunciation` de `moderation/` e criar sub-módulos do moderador

**Status:** [ ] Não iniciado
**Depende de:** T01-T05 (já mergeados)
**Módulos:** `src/modules/moderation/` → `src/modules/support/`, `src/modules/denunciation/`, `src/modules/moderation/sub-modules/`
**Fecha:** parte de api#108

## Checklist

- [x] Passo 1 — criar `src/modules/support/` (entidade, dtos, repositório, use-cases próprios do
      usuário, rota `/v1/support`)
- [x] Passo 2 — criar `src/modules/denunciation/` (entidade, dtos, repositório, use-cases próprios
      do usuário, rota `/v1/denunciations`)
- [x] Passo 3 — criar `src/modules/moderation/sub-modules/{support,denunciation,users}/` (só o que
      é exclusivo do moderador)
- [x] Passo 4 — ajustar imports cruzados (moderação → `support`/`denunciation` via repositório).
      `moderationStatusSchema`/`moderationSeveritySchema` (vocabulário compartilhado pelas duas
      entidades) extraídos pra `src/modules/common/dtos/moderation-status-dto.ts` — antes
      `denunciation-entity.ts` importava de `support-entity.ts`, cross-import errado entre dois
      módulos agora independentes.
- [x] Passo 5 — atualizar `moderation-routes.ts` e o registro em `app.ts` (`app.ts` não mudou —
      só registra `moderationRoutes`, que por sua vez já registra os módulos novos)
- [x] Passo 6 — mover specs junto (co-localizados, mesmo caminho do arquivo movido)
- [x] Verificação — `tsc --noEmit` limpo, `lint` sem warning novo (mesmos pré-existentes, só
      relocados), `test` 626/626, `test:integration` 58/58, `test:e2e` 182/182 — mesmos números do
      PR #107, confirmando paridade de comportamento
- [ ] Passo 7 (correção pós-revisão) — repositório de moderação isolado do repositório do usuário
      (ver "Correção — repositório de moderação separado" abaixo)
- [ ] `code-review` aprovado

## Correção — repositório de moderação separado (revisão do Christian, pós-commit)

Erro na primeira passada: `moderation/sub-modules/{support,denunciation}/` ficaram importando
`SupportsRepository`/`PrismaSupportsRepository` e `DenunciationsRepository`/
`PrismaDenunciationsRepository` direto de `@/modules/support/` e `@/modules/denunciation/` —
mesma interface, mesma implementação, mesma instância. Isso reacopla os dois contextos: o
moderador passa a depender da superfície inteira do repositório do usuário (`create`,
`findByIdAndOwner`, `findManyByOwner`, `update`, `attach` — nenhum desses é ação de moderador) só
pra usar `findMany`/`findById`/`updateStatus`.

Correção: cada sub-module de moderação ganha **seu próprio repositório**, interface e implementação
Prisma inteiramente à parte — sem importar `SupportsRepository`/`DenunciationsRepository` nem as
classes `Prisma*Repository` do módulo do usuário. Mesmo tabela Postgres por baixo, duas superfícies
de acesso diferentes, cada uma só com o que o seu contexto usa:

```
src/modules/moderation/sub-modules/support/repositories/
  moderation-supports-repository.ts        # interface: findMany, findById, updateStatus
  in-memory/in-memory-moderation-supports-repository.ts
  prisma/moderation-supports-repository-prisma.ts

src/modules/moderation/sub-modules/denunciation/repositories/
  moderation-denunciations-repository.ts    # interface: findMany, findById, updateStatus
  in-memory/in-memory-moderation-denunciations-repository.ts
  prisma/moderation-denunciations-repository-prisma.ts
```

Levantamento do que cada use-case de moderador realmente chama hoje (não adicionar métodos além
disso):

- `GetSupportsUseCase` → `findMany`; `GetSupportUseCase` → `findById`; `ModerateSupportUseCase` →
  `findById` + `updateStatus`.
- `GetDenunciationsUseCase` → `findMany`; `GetDenunciationUseCase` → `findById`;
  `ModerateDenunciationUseCase` → `findById` + `updateStatus`; `ModerateDenunciationBanUseCase` →
  `findById` + `updateStatus` (o `BanUserUseCase`/`RevokeUserSessionsUseCase` que ele também usa já
  são de `moderation/sub-modules/users/`, isolados — não mexer).

O tipo de retorno (`Support`/`Denunciation`, a forma do dado) continua vindo de
`@/modules/support/dtos/support-dto.js` / `@/modules/denunciation/dtos/denunciations-dto.js` — só a
interface/classe de **repositório** (acesso a dado) fica isolada; o formato do dado em si
(`Support`/`Denunciation`) é o contrato público do módulo dono, compartilhar o tipo não é o mesmo
problema que compartilhar a classe de acesso. O mapeamento linha-do-banco → `Support`/`Denunciation`
em `moderation-supports-repository-prisma.ts`/`moderation-denunciations-repository-prisma.ts` é
próprio (não importa `mapSupport`/`mapDenunciation` de dentro de `support`/`denunciation` — mesmo
custo de ~20 linhas duplicadas, isolamento completo é o que foi pedido).

Os 7 arquivos de use-case afetados (`get-support-use-case.ts`, `get-supports-use-case.ts`,
`moderate-support-use-case.ts`, `get-denunciation-use-case.ts`, `get-denunciations-use-case.ts`,
`moderate-denunciation-use-case.ts`, `moderate-denunciation-ban-use-case.ts`) trocam o tipo do
construtor pra `ModerationSupportsRepository`/`ModerationDenunciationsRepository`, e os specs
trocam `InMemorySupportsRepository`/`InMemoryDenunciationsRepository` pelos novos in-memory de
moderação. `moderation-support-routes.ts`/`moderation-denunciation-routes.ts` trocam
`PrismaSupportsRepository`/`PrismaDenunciationsRepository` pelos novos `PrismaModeration*Repository`.

## Contexto

Correção sobre a proposta original deste ticket: **`/v1/support` e `/v1/denunciations` são rotas
do usuário — não são moderação.** `moderation/` deve conter só o que é exclusivo do moderador
(`/v1/moderation/support`, `/v1/moderation/denunciations`, `/v2/moderation/users`), isolado e
protegido por `requireRole("moderator")`. Suporte e denúncia interna viram **módulos de primeiro
nível** em `src/modules/` (irmãos de `complaints`, `profiles`, `companies` etc.), cada um dono da
sua entidade, repositório e regra de negócio do lado do usuário.

`moderation/` continua existindo como módulo — mas o que sobra nele (ações do moderador) organiza-se
em `sub-modules/`, porque a tendência é cada um desses contextos ganhar mais ações de moderador ao
longo do tempo (mais filtros, mais transições de status) e a mistura atual dos três (support,
denunciation, users) num único nível de pastas já dificulta navegação.

Este ticket é **puramente estrutural** — mover arquivo e ajustar import, sem mudar assinatura,
schema ou comportamento de nenhuma rota. As correções funcionais (attachment de denúncia,
`environment`) vão em T07, sobre a estrutura já reorganizada.

## Estrutura alvo

```
src/modules/support/                      # módulo de primeiro nível — dono da entidade Support
  dtos/support-dto.ts                     # (moderation-dto.ts renomeado — só o que é de Support)
  entities/support-entity.ts
  repositories/
    supports-repository.ts                # interface — moderation importa daqui
    in-memory/in-memory-supports-repository.ts
    prisma/supports-repository-prisma.ts
    prisma/supports-repository-prisma.integration.spec.ts
  use-cases/                              # só ações do dono do pedido
    create-support-use-case.ts(+.spec+.e2e.spec)
    get-own-support-use-case.ts / get-own-supports-use-case.ts
    update-own-support-use-case.ts
    cancel-own-support-use-case.ts
  factories/make-support.ts
  support-routes.ts                       # POST/GET/GET:id/PATCH/POST:id/cancel /v1/support

src/modules/denunciation/                 # módulo de primeiro nível — dono da entidade Denunciation
  dtos/denunciations-dto.ts
  entities/denunciation-entity.ts
  repositories/
    denunciations-repository.ts           # interface — moderation importa daqui
    in-memory/in-memory-denunciations-repository.ts
    prisma/denunciations-repository-prisma.ts
    prisma/denunciations-repository-prisma.integration.spec.ts
  use-cases/                              # só ações do dono da denúncia
    create-denunciation-use-case.ts
    create-denunciation-attachment-use-case.ts   # ver T07 — hoje sem rota
    delete-denunciation-attachment-use-case.ts
    get-own-denunciation-use-case.ts / get-own-denunciations-use-case.ts
    update-own-denunciation-use-case.ts
    cancel-own-denunciation-use-case.ts
  factories/make-denunciation.ts
  denunciation-routes.ts                  # /v1/denunciations (renomeado de denunciations-user-routes.ts)

src/modules/moderation/
  moderation-routes.ts                    # aggregator — registra os quatro grupos de rotas
  moderation-admin.e2e.spec.ts

  sub-modules/
    support/                              # só o que é exclusivo do moderador sobre Support
      dtos/moderation-support-dto.ts      # getSupportsQuerySchema, moderateSupportBodySchema
      use-cases/
        get-support-use-case.ts / get-supports-use-case.ts
        moderate-support-use-case.ts
      moderation-support-routes.ts        # GET/GET:id/PATCH /moderation/support

    denunciation/                         # só o que é exclusivo do moderador sobre Denunciation
      dtos/moderation-denunciation-dto.ts # getDenunciationsQuerySchema, moderateDenunciationBodySchema
      use-cases/
        get-denunciation-use-case.ts / get-denunciations-use-case.ts
        moderate-denunciation-use-case.ts
        moderate-denunciation-ban-use-case.ts   # orquestra Denunciation + reaproveita users/
      moderation-denunciation-routes.ts   # GET/GET:id/PATCH/POST:id/ban /moderation/denunciations

    users/                                # 100% exclusivo do moderador — sem contraparte de usuário
      dtos/users-admin-dto.ts
      repositories/
        accounts-repository.ts
        prisma/accounts-repository-prisma.ts
      use-cases/
        ban-user-use-case.ts / unban-user-use-case.ts
        create-user-use-case.ts / get-user-use-case.ts / list-users-use-case.ts / remove-user-use-case.ts
        list-user-sessions-use-case.ts / revoke-user-sessions-use-case.ts
        reset-user-password-use-case.ts / set-user-role-use-case.ts
      moderation-user-routes.ts           # /v2/moderation/users
```

## Decisões desta reorganização

- **Entidade, repositório e DTO "core" (schema completo, ex. `supportSchema`/`denunciationSchema`)
  moram no módulo dono** (`support`/`denunciation`), não em `moderation`. `moderation/sub-modules/*`
  importa o repositório e os tipos de lá — mesmo padrão que já existe no repo (ex.
  `moderation-user-routes.ts` já importa `PrismaProfilesRepository` de
  `@/modules/profiles/repositories/prisma/...`). Import cruzado entre módulos de primeiro nível é
  esperado aqui: `moderation` depende de `support`/`denunciation`, não o inverso.
- **DTOs exclusivos do moderador** (query de listagem, body de moderação —
  `getSupportsQuerySchema`, `moderateSupportBodySchema` e equivalentes de denunciation) ficam em
  `moderation/sub-modules/*/dtos/`, não duplicam o schema core.
- **`moderate-denunciation-ban-use-case.ts` fica em `moderation/sub-modules/denunciation/`** — é
  ação de moderador, orquestra `Denunciation` (via repositório importado de `denunciation/`) +
  `BanUserUseCase`/`RevokeUserSessionsUseCase` (de `moderation/sub-modules/users/`).
- **`create-denunciation-attachment-use-case.ts`/`delete-denunciation-attachment-use-case.ts`
  ficam em `denunciation/use-cases/`** — é o dono da denúncia anexando mídia à própria denúncia,
  não é ação de moderador. Hoje não têm rota nenhuma (endereçado em T07).
- **`moderation/sub-modules/users/` é o único sub-module que mantém repositório e entidade
  próprios** — não existe um módulo "de usuário" pra `accounts`/gestão de conta de plataforma
  (isso é responsabilidade do Better Auth + `requireRole("moderator")`), então não há pra onde
  extrair.
- **`moderation-admin.e2e.spec.ts` fica no nível raiz de `moderation/`** — cobre a superfície
  agregada do moderador (support + denunciation + users), não faz sentido em nenhum sub-module
  isolado.

## Fora de escopo

- Qualquer mudança de schema, DTO ou comportamento de rota — isso é T07.
- Renomear `Support`/`Denunciation` no Prisma — já está feito (T01/T02).
- Mover `src/modules/accounts/` (módulo já existente, contexto diferente — não confundir com
  `moderation/sub-modules/users/repositories/accounts-repository.ts`, que é sobre contas OAuth do
  Better Auth).

## Verificação

- `npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run test:integration` — tudo verde,
  sem diff de comportamento (só path de import muda).
- Conferir que nenhum import relativo (`../`) ficou apontando pro caminho antigo após o move.
- Conferir que `app.ts` só registra `moderationRoutes` (que por sua vez registra `support-routes.ts`
  e `denunciation-routes.ts` dos módulos novos) — não deve sobrar import direto de `moderation/`
  pros módulos novos fora do necessário.
