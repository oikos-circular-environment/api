# T04 — Rotas de moderação: listar, responder, mudar status e severidade

**Status:** [ ] Não iniciado
**Depende de:** T01, T02
**Módulos:** `prisma/schema.prisma`, `src/modules/moderation/`
**Fecha:** api#58 (M01) e a parte de gestão de api#59 (M02)

## Checklist

- [ ] Passo 1 — `schema.prisma`: auditoria (`moderated_by`/`moderated_at`/`reason`)
- [ ] Passo 2 — repositórios: `updateStatus` com auditoria
- [ ] Passo 3 — DTOs (query + moderate body, support e denunciation)
- [ ] Passo 4 — use-cases (6: get-list/get-one/moderate × support/denunciation) + specs
- [ ] Passo 5 — rotas (`moderation-support-routes.ts`, `moderation-denunciation-routes.ts`)
- [ ] Verificação (`tsc`, `lint`, `test`, `test:integration`) verde
- [ ] `code-review` aprovado
- [ ] `qa-runner` validou rotas (403 sem papel, transição inválida)

## Contexto

A moderação **não abre** pedido de suporte nem denúncia — só recebe o que a rota do usuário (T03)
já criou, lista, responde (comentário/explicação da decisão) e toma ação, atualizando `status`
(`OPEN|CLOSED|CANCELLED|RESOLVED`, compartilhado entre as duas entidades — ver `00-tech-plan.md`)
e `severity` (`LOW|MEDIUM|HIGH|CRITICAL`). Por isso este ticket **não tem nenhum `POST` de
criação** — só `GET` e `PATCH`.

Este ticket também introduz a trilha de auditoria (`moderated_by`/`moderated_at`) nas duas
entidades, na mesma migração — planos anteriores previam isso espalhado em tickets diferentes;
juntar faz mais sentido porque as duas entidades ganham o campo ao mesmo tempo.

## Passo 1 — `prisma/schema.prisma`: auditoria

Em `Support` (nome pós-rename de T01) e `Denunciation`, adicionar:

```prisma
  moderated_by String?
  moderated_at DateTime?
  reason       String?
```

Em `Support`:
```prisma
  moderator User? @relation("ModeratedSupports", fields: [moderated_by], references: [id], onDelete: SetNull)
```

Em `Denunciation`:
```prisma
  moderator User? @relation("ModeratedDenunciations", fields: [moderated_by], references: [id], onDelete: SetNull)
```

Em `model User`, adicionar as duas relações reversas junto de `members`/`sent_invitations`.

`npm run migrate:generate` + `npm run migrate:dev`.

## Passo 2 — Repositórios: `updateStatus` com auditoria

```ts
updateStatus(id: string, data: {
  status: ModerationStatus;
  severity?: ModerationSeverity;
  reason?: string;
  moderatedBy: string;
}): Promise<T | null>;
```

Grava `moderated_by = moderatedBy`, `moderated_at = now()` junto da mudança — em ambos
`SupportsRepository` e `DenunciationsRepository` (in-memory + Prisma). Se T03 já tiver adicionado
uma versão sem auditoria desse método (cancelamento do próprio usuário não passa `moderatedBy`),
ajustar a assinatura pra `moderatedBy` ser opcional — cancelamento do reporter não audita como
"moderado", só marca `CANCELLED` sem `moderated_by`.

## Passo 3 — DTOs (`dtos/moderation-dto.ts`, `dtos/denunciations-dto.ts`)

```ts
export const getSupportsQuerySchema = z.object({
  status: moderationStatusSchema.optional(),
  severity: moderationSeveritySchema.optional(),
  type: supportTypeSchema.optional(),
  cursor: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const moderateSupportBodySchema = z.object({
  status: z.enum(["CLOSED", "RESOLVED"]), // moderação não reabre nem cancela — cancelamento é ação do reporter (T03)
  severity: moderationSeveritySchema.optional(),
  reason: z.string().max(2000).optional(),
});
```

Espelhar em `dtos/denunciations-dto.ts` (`getDenunciationsQuerySchema`,
`moderateDenunciationBodySchema` — mesmos valores de `status` permitidos).

## Passo 4 — Use-cases (um por arquivo, `.spec.ts` co-localizado, TDD)

| Use-case | Lógica |
|---|---|
| `GetSupportsUseCase` | Pagina por cursor, filtra por `status`/`severity`/`type`. |
| `GetSupportUseCase` | Busca por id, `SUPPORT_NOT_FOUND` (404) se null. |
| `ModerateSupportUseCase` | Valida existência; `SUPPORT_ALREADY_FINALIZED` (422) se `status` atual já é `CLOSED`/`RESOLVED`/`CANCELLED` — estado final não é revisitado. Grava `status`/`severity`/`reason`/`moderated_by`/`moderated_at`. |
| `GetDenunciationsUseCase` | Espelha o de suporte. |
| `GetDenunciationUseCase` | Espelha o de suporte, `DENUNCIATION_NOT_FOUND`. |
| `ModerateDenunciationUseCase` | Espelha `ModerateSupportUseCase`, `DENUNCIATION_ALREADY_FINALIZED`. |

## Passo 5 — Rotas

`moderation-support-routes.ts` (arquivo existente — perde a rota `POST` antiga, que migrou pra T03,
e ganha):

| Método | Path | Auth |
|---|---|---|
| `GET` | `/moderation/support` | `requireRole("moderator")` |
| `GET` | `/moderation/support/:id` | `requireRole("moderator")` |
| `PATCH` | `/moderation/support/:id` | `requireRole("moderator")` |

O path `/moderation/support` não muda — já é esse hoje (só a rota `POST` sai dele). Só perde
`POST` e ganha `GET`/`GET :id`/`PATCH`.

`moderation-denunciation-routes.ts` (novo arquivo) — mesmas três rotas, prefixo
`/moderation/denunciations`.

Reaproveitar `verifySession`/`requireRole("moderator")` (mesmo padrão de
`moderation-user-routes.ts:59-61`, instanciar uma vez no topo da função de rotas). Tags Swagger:
`"Moderation / Support"`, `"Moderation / Denunciations"` (já existem/previstas). `withBearerAuth`
nas rotas novas.

## Fora de escopo

- Rotas de criação/leitura-própria/cancelamento — T03.
- Ação "banir usuário a partir de denúncia" — T05.
- Notificar o reporter quando o status muda — fica pra quando houver canal de notificação.

## Verificação

- `npm run test -- support` e `denunciation` — specs dos seis use-cases com repositório in-memory,
  cobrindo auditoria (`moderated_by`/`moderated_at`/`reason` gravados).
- `npm run test:integration` cobrindo `findMany` (cursor + filtros) e `updateStatus` (com
  auditoria) nos dois repositórios Prisma.
- Transição inválida (já finalizado) → 422; id inexistente → 404; usuário sem papel `moderator` →
  403 nas seis rotas.
- `npx tsc --noEmit`, `npm run lint`, `npm run test` completos.
