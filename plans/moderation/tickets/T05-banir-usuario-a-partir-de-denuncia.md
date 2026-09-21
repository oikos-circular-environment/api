# T05 — Banir usuário a partir de uma denúncia

**Status:** [x] Concluído (commit `e4c223d`)
**Depende de:** T02, T04
**Módulos:** `src/modules/moderation/`
**Fecha o que resta de:** api#61 (M05)

## Checklist

- [x] Passo 1 — `ModerateDenunciationBanUseCase` + spec
- [x] Passo 2 — rota `POST /v1/moderation/denunciations/:id/ban`
- [x] Verificação (`tsc`, `lint`, `test`) verde
- [x] `code-review` aprovado
- [x] `qa-runner` validou fluxo (ban + revoke + status + 403)

## Contexto

`/v2/moderation/users` (`moderation-user-routes.ts`) **já cobre** listar, criar, banir, desbanir,
trocar papel, revogar sessão e remover usuário — todos atrás de `requireRole("moderator")`. Isso
veio pronto do épico `api#8`/`organizacoes-papeis`, não é trabalho deste ticket.

O que falta: não existe caminho de "a partir desta denúncia, banir o usuário denunciado". A
primitiva de ban existe (`BanUserUseCase`); `Denunciation.reported_user_id` já existe desde T02.
Este ticket só liga os dois.

## Passo 1 — `ModerateDenunciationBanUseCase` (novo)

```
src/modules/moderation/use-cases/moderate-denunciation-ban-use-case.ts  + .spec.ts
```

Recebe `DenunciationsRepository`, `BanUserUseCase`, `RevokeUserSessionsUseCase` (injeção via
construtor, mesmo padrão dos demais use-cases). `execute({ denunciationId, moderatorId, banReason, banExpiresIn })`:

1. Busca a denúncia; `DENUNCIATION_NOT_FOUND` (404) se não existir.
2. `DENUNCIATION_ALREADY_FINALIZED` (422) se `status` já for `CLOSED`/`RESOLVED`/`CANCELLED`.
3. `DENUNCIATION_HAS_NO_TARGET_USER` (422) se `reported_user_id` for nulo — não dá pra banir
   "ninguém".
4. Chama `banUserUseCase.execute({ userId: reported_user_id, banReason, banExpiresIn })` (reaproveita
   o use-case existente em `use-cases/admin/ban-user-use-case.ts`, não recria lógica de ban).
5. Chama `revokeUserSessionsUseCase.execute(reported_user_id)`.
6. Marca a denúncia como `RESOLVED`, grava `moderated_by = moderatorId`, `moderated_at = now()`,
   `reason = banReason`, `severity` inalterada (se a moderação já tinha triado antes de banir, o
   valor se mantém; se não, fica `null`).

## Passo 2 — Rota

`POST /v1/moderation/denunciations/:id/ban` — `requireRole("moderator")`, corpo
`{ ban_reason: string, ban_expires_in?: number }`, resposta `{ denunciation, user }`. Registrar em
`moderation-denunciation-routes.ts` (T04) — a rota fala de denúncia, então aciona lógica de
usuário; fica coeso com "a partir da denúncia".

## Fora de escopo

- Remoção/ocultação do conteúdo denunciado além do próprio registro `Denunciation` (ex.: remover
  perfil de company, apagar avaliação) — sem um alvo de conteúdo concreto ainda modelado no
  domínio (companies, avaliações), fica registrado como trabalho futuro quando esse alvo existir.
  Este ticket resolve só o alvo que já existe hoje: o usuário.
- Ban a partir de um `Support` — não fazia parte do pedido original (M05 fala de "usuário
  denunciado", contexto é denúncia).

## Verificação

- `npm run test -- moderate-denunciation-ban` — specs cobrindo: denúncia sem alvo (422), denúncia
  já finalizada (422), denúncia não encontrada (404), fluxo feliz (ban + revoke + status
  `RESOLVED` + auditoria gravada).
- Usuário sem papel `moderator` → 403 na rota nova.
- `npx tsc --noEmit`, `npm run lint`, `npm run test` completos.
