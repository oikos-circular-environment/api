# T03 — Rotas do usuário: criar, listar, atualizar e cancelar seus pedidos/denúncias

**Status:** [ ] Não iniciado (execução interrompida pelo usuário em 2026-09-03, ~16:30 — sem
nenhum arquivo de código tocado ainda, agente morto ainda na fase de leitura. Sessão reiniciada
pra ativar `.claude/agents/executor.md` de verdade em vez do stand-in `general-purpose` usado em
T01/T02. Próximo passo: retomar T03 do zero, executor real.)
**Depende de:** T01 ✅, T02 ✅ (ambos concluídos, revisados e commitados nesta branch —
commits `3e482ff` T01, `c6909b1` T02)
**Módulos:** `src/modules/moderation/`
**Substitui:** `POST /v1/moderation/support` atual (sai do prefixo `/moderation`)

## Checklist

- [ ] Passo 1 — DTOs (`moderation-dto.ts`, `denunciations-dto.ts`)
- [ ] Passo 2 — use-cases (8: get-own/get-own-list/update-own/cancel-own × support/denunciation) + specs
- [ ] Passo 3 — repositórios: `findByIdAndOwner`/`findManyByOwner`/`update`
- [ ] Passo 4 — rotas (`support-routes.ts`, `denunciations-routes.ts`)
- [ ] Passo 5 — registro em `app.ts`/routes principal
- [ ] Verificação (`tsc`, `lint`, `test`, `test:integration`) verde
- [ ] `code-review` aprovado
- [ ] `qa-runner` validou rotas (Swagger/curl)

## Contexto

Hoje a única rota que existe é `POST /v1/moderation/support` — o usuário que abre um pedido
compartilha prefixo de URL com a moderação, e não tem nenhuma forma de ver o que aconteceu com o
que enviou. Ver decisão em `00-tech-plan.md`: rota do usuário e rota de moderação são contextos
diferentes, sem verbo de criação na de moderação.

Este ticket cria o namespace do **reporter**: `/v1/support` e `/v1/denunciations` (`Support` é o
nome pós-rename de T01 — sem "request"). Criação continua pública (com ou sem sessão); listar/
ver-detalhe/atualizar/cancelar exigem sessão, porque só faz sentido "meus pedidos" pra quem está
identificado (ver decisão sobre denúncia/suporte anônimo não ser rastreável depois).

## Passo 1 — DTOs (`dtos/moderation-dto.ts`, `dtos/denunciations-dto.ts`)

```ts
export const updateOwnSupportBodySchema = z.object({
  title: safeTextSchema({ min: 1, max: MAX_SUPPORT_TITLE_LENGTH, ... }).optional(),
  description: safeTextSchema({ min: 1, max: MAX_SUPPORT_DESCRIPTION_LENGTH, ... }).optional(),
});

export const paginatedSupportsSchema = z.object({
  supports: z.array(supportSchema),
  nextCursor: z.string().datetime().nullable(),
});
```

Mesma forma pra `updateOwnDenunciationBodySchema` (`title?`, `description?`) e
`paginatedDenunciationsSchema` em `dtos/denunciations-dto.ts`. `getOwnQuerySchema` compartilhado
(`cursor?`, `limit` 1-100 default 20) — sem filtro de `status`/`type` aqui, é "tudo que é meu",
filtro fica do lado da moderação (T04).

## Passo 2 — Use-cases (um por arquivo, `.spec.ts` co-localizado, TDD)

Suporte (`use-cases/`):

| Use-case | Lógica |
|---|---|
| `GetOwnSupportsUseCase` | `execute({ userId, cursor, limit })` — pagina por cursor em `created_at` (`limit + 1`, padrão `GetComplaintsUseCase`), filtra por `user_id`. |
| `GetOwnSupportUseCase` | `execute({ userId, supportId })` — busca por id; `SUPPORT_NOT_FOUND` (404) se null **ou** se `user_id` não bater com `userId` (não vaza existência de pedido de outro usuário). |
| `UpdateOwnSupportUseCase` | Mesma checagem de dono; `SUPPORT_ALREADY_MODERATED` (422) se `status !== "OPEN"` — depois que a moderação mexeu, o reporter não edita mais. |
| `CancelOwnSupportUseCase` | Mesma checagem de dono; seta `status: "CANCELLED"`; `SUPPORT_ALREADY_MODERATED` (422) se `status !== "OPEN"`. |

Denúncia (`use-cases/`), espelhando os quatro acima com `Denunciation`/`reporter_user_id`:
`GetOwnDenunciationsUseCase`, `GetOwnDenunciationUseCase`, `UpdateOwnDenunciationUseCase`,
`CancelOwnDenunciationUseCase` (mesmos códigos de erro, prefixo `DENUNCIATION_`).

`CreateSupportUseCase` (T01) e `CreateDenunciationUseCase` (T02) já existem — só ganham consumidor
HTTP aqui.

## Passo 3 — Repositórios: métodos que faltam

`SupportsRepository` e `DenunciationsRepository` ganham:

```ts
findByIdAndOwner(id: string, userId: string): Promise<T | null>;
findManyByOwner(userId: string, filters: { cursor?: Date; limit: number }): Promise<T[]>;
update(id: string, data: { title?: string; description?: string }): Promise<T | null>;
// updateStatus já existe (ou é adicionado aqui se T04 rodar depois) — cancelamento usa o mesmo método com status "CANCELLED"
```

Implementar em ambos os repositórios in-memory e Prisma.

## Passo 4 — Rotas

`support-routes.ts` (novo arquivo, fora de `moderation-support-routes.ts` que agora é só
moderação — ver T04):

| Método | Path | Auth | Descrição |
|---|---|---|---|
| `POST` | `/support` | Pública | Cria. Sessão opcional via Bearer — com sessão, `user_id`/`reporter_email` vêm dela (valor de `reporter_email` no body é ignorado); sem sessão, `reporter_email` é obrigatório no body (`SUPPORT_EMAIL_REQUIRED` se ausente). |
| `POST` | `/support/:id/attachments` | Pública | Upload (multipart) — só se `user_id` do pedido bater com o da sessão, quando o pedido tiver dono; sem dono, segue liberado (mesma janela de quem criou anônimo). |
| `GET` | `/support` | `verifySession` (sem `requireRole`) | Lista as próprias, paginado. |
| `GET` | `/support/:id` | `verifySession` | Detalhe do próprio, incluindo `status`, `severity`, e a explicação da moderação (`reason`) quando existir. |
| `PATCH` | `/support/:id` | `verifySession` | Atualiza `title`/`description` do próprio, só enquanto `OPEN`. |
| `POST` | `/support/:id/cancel` | `verifySession` | Cancela o próprio, só enquanto `OPEN`. |

`denunciations-routes.ts` (novo arquivo) — mesmas seis rotas, prefixo `/denunciations`.

Extração de sessão na criação segue o padrão de `moderation-user-routes.ts` (usar `auth.api.
getSession`); sessão ausente ou inválida na criação não é erro. Nas rotas `GET`/`PATCH`/`cancel`,
sessão é **obrigatória** (`verifySession`, sem papel específico — qualquer usuário autenticado,
não só moderador).

## Passo 5 — Registro

Novo arquivo `reports-routes.ts` (ou incluso em `moderation-routes.ts` mesmo, ao lado de
`moderationSupportRoutes`/`moderationDenunciationRoutes` — decidir no momento pela convenção de
`app.ts`) registra:

```ts
await app.register(supportRoutes, { prefix: "/v1" });
await app.register(denunciationsRoutes, { prefix: "/v1" });
```

Removendo o registro antigo de `POST /v1/moderation/support` de `moderation-support-routes.ts`
(esse arquivo passa a só ter as rotas de moderação, ver T04).

## Fora de escopo

- Rotas de moderação (listar tudo, responder, mudar status/severidade) — T04.
- Notificar o usuário quando o status muda (push/e-mail) — fica pra quando houver canal de
  notificação, fora deste épico.
- Rastreio de pedido anônimo (sem sessão) — quem cria sem token não lista/atualiza/cancela depois.

## Verificação

- `npm run test -- support` e `denunciation` — specs dos oito use-cases novos com repositório
  in-memory, cobrindo dono-correto vs dono-errado (404) e `OPEN` vs já-moderado (422).
- `npm run test:integration` cobrindo `findByIdAndOwner`/`findManyByOwner`/`update` nos dois
  repositórios Prisma.
- Teste manual via Swagger: criar sem token (não lista depois), criar com token (aparece em
  `GET /support`), atualizar/cancelar próprio, tentar cancelar de outro usuário → 404, tentar
  atualizar depois de moderado → 422.
- `npx tsc --noEmit`, `npm run lint`, `npm run test` completos.
