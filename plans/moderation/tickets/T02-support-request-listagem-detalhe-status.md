# T02 — Gestão de support requests (listagem, detalhe, transição de status)

**Status:** [ ] Não iniciado
**Depende de:** T01 (response já expõe `type`/`environment`)
**Módulos:** `src/modules/moderation/`
**Fecha:** api#58 (M01)

## Contexto

`SupportRequest.status` existe desde sempre mas nenhuma rota lê ou transiciona — a web coleta
pedidos que ninguém consegue ver pela API. A issue original previa proteger provisoriamente com
`verify-jwt` até o papel de moderador existir; ele já existe (`requireRole("moderator")`, ver
`00-tech-plan.md`), então essas rotas nascem direto com o padrão final, sem passo intermediário.

## Passo 1 — `repositories/support-requests-repository.ts`: novos métodos

```ts
export interface SupportRequestsRepository {
  create(data: CreateSupportRequest): Promise<SupportRequest>;
  findById(supportRequestId: string): Promise<SupportRequest | null>;
  findMany(filters: {
    status?: ModerationStatus;
    type?: SupportRequestType;
    cursor?: Date;
    limit: number;
  }): Promise<SupportRequest[]>;
  updateStatus(
    supportRequestId: string,
    status: ModerationStatus,
  ): Promise<SupportRequest | null>;
  attach(supportRequestId: string, data: SaveSupportRequestAttachment): Promise<SupportRequest | null>;
}
```

Implementar em `repositories/in-memory/in-memory-support-requests-repository.ts` e
`repositories/prisma/support-requests-repository-prisma.ts` (paginação por cursor em
`created_at`, mesmo padrão de `ComplaintsRepository`/`GetComplaintsUseCase`: busca `limit + 1` pra
saber se há próxima página, sem `OFFSET`).

## Passo 2 — `dtos/moderation-dto.ts`: schemas de listagem/transição

```ts
export const getSupportRequestsQuerySchema = z.object({
  status: moderationStatusSchema.optional(),
  type: supportRequestTypeSchema.optional(),
  cursor: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateSupportRequestStatusBodySchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]), // não permite voltar a PENDING
});

export const paginatedSupportRequestsSchema = z.object({
  supportRequests: z.array(supportRequestSchema),
  nextCursor: z.string().datetime().nullable(),
});
```

## Passo 3 — Use-cases (um por arquivo, `.spec.ts` co-localizado, TDD)

| Use-case | Lógica |
|---|---|
| `GetSupportRequestsUseCase` | Pagina por cursor, filtra por `status`/`type`. Mesmo formato de `GetComplaintsUseCase`. |
| `GetSupportRequestUseCase` | Busca por id, lança `AppError("Support request not found", "SUPPORT_REQUEST_NOT_FOUND", 404)` se null. |
| `UpdateSupportRequestStatusUseCase` | Valida existência; se `status` atual já é `APPROVED`/`REJECTED`, lança `SUPPORT_REQUEST_ALREADY_FINALIZED` (422) — estado final não volta pra `PENDING` nem troca de um final pro outro. |

## Passo 4 — `moderation-support-routes.ts`: novas rotas

Reaproveitar `verifySession`/`requireRole("moderator")` (mesmo padrão de
`moderation-user-routes.ts:59-61`, instanciar uma vez no topo da função de rotas):

| Método | Path | Auth |
|---|---|---|
| `GET` | `/moderation/support` | `requireRole("moderator")` |
| `GET` | `/moderation/support/:id` | `requireRole("moderator")` |
| `PATCH` | `/moderation/support/:id/status` | `requireRole("moderator")` |

Tag Swagger: `"Moderation / Support"` (já existe). `withBearerAuth(...)` no schema das três rotas
novas (a rota `POST` pública, linha 30-113, não muda).

## Fora de escopo

- Notificar o usuário dono do pedido quando o status muda (fica pra quando houver canal de
  notificação — fora deste épico).

## Verificação

- `npm run test -- support-request` — specs dos três use-cases com repositório in-memory.
- `npm run test:integration` cobrindo `findMany` (cursor + filtro) e `updateStatus` no repositório
  Prisma.
- Transição inválida → 422 com `SUPPORT_REQUEST_ALREADY_FINALIZED`; id inexistente → 404.
- Usuário sem papel `moderator` → 403 nas três rotas.
- `npx tsc --noEmit`, `npm run lint`, `npm run test` completos.
