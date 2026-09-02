# T03 — Módulo `Denunciation` (denúncia interna de conteúdo/perfil)

**Status:** [ ] Não iniciado
**Depende de:** nada (pode rodar em paralelo a T01/T02)
**Módulos:** `prisma/schema.prisma`, `src/modules/moderation/`
**Fecha:** api#59 (M02)
**Substitui:** `plans/moderation-denunciations.md` (migrado pra cá, atualizado)

## Contexto

Sistema de **moderação interna do app**: usuário denuncia conteúdo, postagem ou perfil
inadequado — golpe, nome/descrição/imagem imprópria de uma company, etc. Fluxo simples: título,
descrição, anexos, status gerido pela moderação, sem votação.

**Não confundir com `Complaint`** (denúncia ambiental — geolocalização, categorias de resíduo,
votação, quórum). `Denunciation` é sobre o *cadastro/perfil/conteúdo* estar errado ou ser golpe;
`Complaint` é sobre um *problema ambiental real reportado por um cidadão*. Não reaproveitar nome,
schema ou rota de `complaints` — são domínios diferentes que só coincidem em "tem título, descrição
e anexo".

Este plano estava espalhado entre a issue `mobile#39` (repo errado) e
`plans/moderation-denunciations.md`; fica só aqui daqui pra frente.

## Passo 1 — `prisma/schema.prisma`

```prisma
enum DenunciationStatus {
  PENDING
  REVIEWED
  CLOSED
  DISMISSED
}

model Denunciation {
  id             String             @id @default(uuid())
  title          String
  description    String
  status         DenunciationStatus @default(PENDING)
  reporter_email String?
  latitude       Float?
  longitude      Float?
  created_at     DateTime           @default(now())
  updated_at     DateTime           @updatedAt

  attachments DenunciationAttachment[]

  @@map("denunciations")
}

model DenunciationAttachment {
  id         String                @id @default(uuid())
  url        String
  file_name  String
  path       String
  base64     String
  metadata   Json?
  type       ComplaintCaptureMode  @default(PHOTO)
  created_at DateTime              @default(now())

  denunciation_id String
  denunciation    Denunciation @relation(fields: [denunciation_id], references: [id], onDelete: Cascade)

  @@map("denunciation_attachments")
}
```

Reusa `ComplaintCaptureMode` (`PHOTO`/`VIDEO`) só pro enum de tipo de arquivo — não cria FK nem
relação com `Complaint`. GPS como `Float?` simples (sem PostGIS — não há busca por raio aqui). Sem
FK obrigatória pra `User`: denúncia pode ser anônima.

Enum de status é próprio (`DenunciationStatus`), não reaproveita `ModerationStatus` — ver decisão
em `00-tech-plan.md`.

`npm run migrate:generate` + `npm run migrate:dev`.

## Passo 2 — Estrutura do módulo

```
src/modules/moderation/
  entities/denunciation-entity.ts
  dtos/denunciations-dto.ts
  repositories/
    denunciations-repository.ts
    in-memory/in-memory-denunciations-repository.ts
    prisma/denunciations-repository-prisma.ts
  use-cases/
    create-denunciation-use-case.ts             + .spec.ts
    get-denunciation-use-case.ts                + .spec.ts
    get-denunciations-use-case.ts                + .spec.ts
    update-denunciation-status-use-case.ts       + .spec.ts
    create-denunciation-attachment-use-case.ts   + .spec.ts
    delete-denunciation-attachment-use-case.ts   + .spec.ts
  factories/make-denunciation.ts
  moderation-denunciation-routes.ts
```

Arquivo de rotas próprio (`moderation-denunciation-routes.ts`), registrado em `moderation-routes.ts`
junto de `moderationSupportRoutes`/`moderationUsersRoutes` — mesmo padrão dos outros dois.

## Passo 3 — Entidade e DTOs

**`entities/denunciation-entity.ts`** — Zod schemas `Denunciation`, `DenunciationAttachment`,
`DenunciationStatus` (padrão de `support-request-entity.ts`).

**`dtos/denunciations-dto.ts`** — re-exporta entidades + schemas de input:

| Schema | Campos |
|---|---|
| `createDenunciationSchema` | `title` (1-200), `description` (min 1), `reporter_email?` (email), `latitude?` (-90..90), `longitude?` (-180..180) |
| `updateDenunciationStatusSchema` | `status` (`REVIEWED \| CLOSED \| DISMISSED`) — não permite voltar a `PENDING` |
| `getDenunciationsQuerySchema` | `status?`, `cursor?` (datetime), `limit` (1-100, default 20) |
| `saveDenunciationAttachmentSchema` | `url`, `file_name`, `path`, `base64`, `metadata?`, `type` (`PHOTO \| VIDEO`) |

## Passo 4 — Repositório

```ts
export interface DenunciationsRepository {
  findMany(filters: { status?: DenunciationStatus; cursor?: Date; limit: number }): Promise<Denunciation[]>;
  findById(denunciationId: string): Promise<Denunciation | null>;
  create(data: CreateDenunciation): Promise<Denunciation>;
  updateStatus(denunciationId: string, status: DenunciationStatus): Promise<Denunciation | null>;
  attach(denunciationId: string, data: SaveDenunciationAttachment): Promise<Denunciation | null>;
  deleteAttachment(denunciationId: string, attachmentId: string): Promise<void>;
}
```

Sem `userId` na maioria dos métodos — denúncia é anônimo-friendly.

## Passo 5 — Use-cases

| Use-case | Lógica |
|---|---|
| `CreateDenunciationUseCase` | Cria com status `PENDING`. |
| `GetDenunciationUseCase` | Busca por id, `DENUNCIATION_NOT_FOUND` (404) se null. |
| `GetDenunciationsUseCase` | Paginação por cursor (`limit + 1`, padrão `GetComplaintsUseCase`), filtro por status. |
| `UpdateDenunciationStatusUseCase` | Transições: `PENDING` → qualquer; `REVIEWED` → `CLOSED`/`DISMISSED`; `CLOSED`/`DISMISSED` → erro `DENUNCIATION_ALREADY_FINALIZED` (422). |
| `CreateDenunciationAttachmentUseCase` | Segue `CreateComplaintAttachmentUseCase`: valida MIME (jpeg, png, mp4, mov, webm), max 10MB, upload `denunciations/{id}/{timestamp}.{ext}`, salva base64. |
| `DeleteDenunciationAttachmentUseCase` | Busca denúncia, valida attachment, remove do storage + DB. |

## Passo 6 — Rotas (`moderation-denunciation-routes.ts`)

| Método | Path | Auth | Descrição |
|---|---|---|---|
| `POST` | `/moderation/denunciations` | Pública | Cria. Se Bearer token presente e válido, extrai e-mail da sessão; senão usa `reporter_email` do body ou nulo (mesmo padrão de T01, passo 5). |
| `POST` | `/moderation/denunciations/:id/attachments` | Pública | Upload de imagem/vídeo (multipart). |
| `GET` | `/moderation/denunciations` | `requireRole("moderator")` | Lista paginada, filtro por status. |
| `GET` | `/moderation/denunciations/:id` | `requireRole("moderator")` | Detalhe. |
| `PATCH` | `/moderation/denunciations/:id/status` | `requireRole("moderator")` | Atualiza status. |
| `DELETE` | `/moderation/denunciations/:id/attachments/:attachmentId` | `requireRole("moderator")` | Remove anexo. |

Rotas de leitura/gestão nascem direto com `requireRole("moderator")` — sem passo intermediário de
`verify-jwt` (E02 já está fechado, ver `00-tech-plan.md`). Tags Swagger: `"Moderation"`,
`"Moderation / Denunciations"`.

## Passo 7 — Registro

`moderation-routes.ts` ganha:
```ts
await app.register(moderationDenunciationRoutes, { prefix: "/v1" });
```

## Passo 8 — Factory

`factories/make-denunciation.ts` — `makeDenunciation(overrides?)` com `faker` + `randomUUID`,
status default `PENDING`, `attachments: []`.

## Ordem de implementação

1. Schema + migration
2. `entities/denunciation-entity.ts`
3. `dtos/denunciations-dto.ts`
4. `repositories/denunciations-repository.ts` (interface)
5. `repositories/in-memory/in-memory-denunciations-repository.ts`
6. `factories/make-denunciation.ts`
7. Use-cases + specs (TDD, um por vez, ordem da tabela do Passo 5)
8. `repositories/prisma/denunciations-repository-prisma.ts`
9. `moderation-denunciation-routes.ts`
10. Registro em `moderation-routes.ts`

## Fora de escopo

- Banir usuário/perfil denunciado a partir de uma denúncia — entra em T04.
- Trilha de auditoria (`moderated_by`/`moderated_at`/`reason`) — entra em T04.

## Verificação

- `npm run test -- denunciation` — specs dos use-cases.
- `npm run test:integration` do repositório Prisma.
- `npx tsc --noEmit`, `npm run lint`, `npm run test` completos.
- Teste manual via Swagger: denúncia anônima, denúncia autenticada (email extraído da sessão),
  upload de imagem, listagem paginada, transição de status, usuário sem papel `moderator` → 403.
