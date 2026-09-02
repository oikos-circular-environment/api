# T04 — Trilha de auditoria + banir usuário a partir de uma denúncia

**Status:** [ ] Não iniciado
**Depende de:** T02, T03
**Módulos:** `prisma/schema.prisma`, `src/modules/moderation/`
**Fecha o que resta de:** api#61 (M05)

## Contexto

`/v2/moderation/users` (`moderation-user-routes.ts`) **já cobre** listar, criar, banir, desbanir,
trocar papel, revogar sessão e remover usuário — todos atrás de `requireRole("moderator")`. Isso
veio pronto do épico `api#8`/`organizacoes-papeis`, não é trabalho deste ticket.

O que falta de api#61, checado nesta re-análise:

1. Nenhuma ação de moderação registra **quem** decidiu, **quando** e **por quê** — nem
   `SupportRequest` nem `Denunciation` têm campo de auditoria.
2. Não existe caminho de "a partir desta denúncia, banir o usuário denunciado" — as primitivas de
   ban existem (`BanUserUseCase`), mas nada liga uma `Denunciation` a um usuário alvo.

## Passo 1 — `prisma/schema.prisma`: auditoria

Em `SupportRequest` e `Denunciation`, adicionar:

```prisma
  moderated_by String?
  moderator    User?    @relation("ModeratedSupportRequests", fields: [moderated_by], references: [id], onDelete: SetNull)
  moderated_at DateTime?
  reason       String?
```

(nome da relação reversa em `Denunciation` distinto: `"ModeratedDenunciations"`, pra não colidir
no `User`). Em `model User`, adicionar as duas relações reversas junto de `members`/`sent_invitations`.

`npm run migrate:generate` + `npm run migrate:dev`.

## Passo 2 — Preencher auditoria nas transições de status existentes

`UpdateSupportRequestStatusUseCase` (T02) e `UpdateDenunciationStatusUseCase` (T03) passam a
receber `moderatorId: string` (do `request.authV2User.id`, já disponível via `verifySession`) e
gravar `moderated_by`/`moderated_at = now()` junto da mudança de status. `reason` fica opcional,
passado no body do `PATCH .../status` (`reason?: string`, adicionar aos dois DTOs de body).

Isso é retroativo aos dois use-cases já implementados em T02/T03 — ajustar assinatura, não
recriar.

## Passo 3 — `Denunciation` ganha alvo (usuário denunciado)

`Denunciation` precisa saber *quem* está sendo denunciado pra que o ban faça sentido. Adicionar:

```prisma
  reported_user_id String?
  reported_user    User?   @relation("ReportedInDenunciations", fields: [reported_user_id], references: [id], onDelete: SetNull)
```

`createDenunciationSchema` (T03) ganha `reported_user_id?: string` opcional — nem toda denúncia
tem um usuário identificável como alvo (pode ser sobre um golpe genérico, uma company sem dono
claro no momento do reporte).

## Passo 4 — `ModerateDenunciationBanUseCase` (novo)

```
src/modules/moderation/use-cases/moderate-denunciation-ban-use-case.ts  + .spec.ts
```

Recebe `DenunciationsRepository`, `BanUserUseCase`, `RevokeUserSessionsUseCase` (injeção via
construtor, mesmo padrão dos demais use-cases). `execute({ denunciationId, moderatorId, banReason, banExpiresIn })`:

1. Busca a denúncia; `DENUNCIATION_NOT_FOUND` (404) se não existir.
2. `DENUNCIATION_HAS_NO_TARGET_USER` (422) se `reported_user_id` for nulo — não dá pra banir
   "ninguém".
3. Chama `banUserUseCase.execute({ userId: reported_user_id, banReason, banExpiresIn })` (reaproveita
   o use-case existente em `use-cases/admin/ban-user-use-case.ts`, não recria lógica de ban).
4. Chama `revokeUserSessionsUseCase.execute(reported_user_id)`.
5. Marca a denúncia como `CLOSED`, grava `moderated_by = moderatorId`, `moderated_at = now()`,
   `reason = banReason`.

## Passo 5 — Rota

`POST /v2/moderation/denunciations/:id/ban` — `requireRole("moderator")`, corpo
`{ ban_reason: string, ban_expires_in?: number }`, resposta `{ denunciation, user }`. Registrar em
`moderation-denunciation-routes.ts` (T03) ou em `moderation-user-routes.ts` — decidir no momento da
implementação pelo que ficar mais coeso (rota fala de denúncia, then acessa lógica de usuário;
tende a fazer mais sentido em `moderation-denunciation-routes.ts`, consistente com "a partir da
denúncia").

## Fora de escopo

- Remoção/ocultação do conteúdo denunciado além do próprio registro `Denunciation` (ex.: remover
  perfil de company, apagar avaliação) — a issue original deixava o alvo em aberto ("definir o
  alvo: complaint, anexo, perfil"); sem um alvo de conteúdo concreto ainda modelado no domínio
  (companies, avaliações), fica registrado como trabalho futuro quando esse alvo existir. Este
  ticket resolve só o alvo que já existe hoje: o usuário.
- Ban a partir de um `SupportRequest` — não fazia parte do pedido original (M05 fala de "usuário
  denunciado", contexto é denúncia).

## Verificação

- `npm run test -- moderate-denunciation-ban` — specs cobrindo: denúncia sem alvo (422), denúncia
  não encontrada (404), fluxo feliz (ban + revoke + status `CLOSED` + auditoria gravada).
- `npm run test -- support-request` e `denunciation` — specs de `UpdateStatus` atualizados pra
  cobrir `moderated_by`/`moderated_at`/`reason`.
- Usuário sem papel `moderator` → 403 na rota nova.
- `npx tsc --noEmit`, `npm run lint`, `npm run test` completos.
