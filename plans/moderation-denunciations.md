# Plano: Moderation — Denunciations (Denúncia interna do app)

> **Registrado como issue**: este plano virou [api#59](https://github.com/oikos-circular-environment/api/issues/59) (M02), sub-issue do épico de Moderação [api#57](https://github.com/oikos-circular-environment/api/issues/57). O lado mobile é [mobile#39](https://github.com/oikos-circular-environment/mobile/issues/39) (M03). Mapa do épico: [`epics/01-moderation.md`](./epics/01-moderation.md).

## Contexto

O Oikos já possui um módulo de **complaints** (denúncias ambientais) com geolocalização, categorias de resíduos, votação e quórum. Esta nova funcionalidade é diferente: trata-se de um sistema de **moderação interna do aplicativo**, onde usuários denunciam conteúdo, postagens ou perfis inadequados. O fluxo é simplificado — apenas título, descrição e imagens — sem votação, sem categorias de resíduos, com status gerenciado internamente pela moderação.

---

## 1. Prisma Schema

**Arquivo:** `prisma/schema.prisma`

Adicionar enum `DenunciationStatus` e modelos `Denunciation` + `DenunciationAttachment`:

- **`DenunciationStatus`**: `PENDING | REVIEWED | CLOSED | DISMISSED`
- **`Denunciation`**: `id`, `title`, `description`, `status` (default PENDING), `reporter_email?`, `latitude?`, `longitude?`, `created_at`, `updated_at`, `attachments[]`
- **`DenunciationAttachment`**: `id`, `url`, `file_name`, `path`, `base64`, `metadata?`, `type` (reutiliza enum `ComplaintCaptureMode` — PHOTO/VIDEO), `denunciation_id` (FK cascade), `created_at`

GPS armazenado como `Float?` simples (sem PostGIS — não há busca por raio). Sem FK para `User` — denunciations podem ser anônimas.

Rodar `npm run migrate:dev` após alteração.

---

## 2. Estrutura do módulo

```
src/modules/moderation/
  entities/denunciation-entity.ts
  dtos/denunciations-dto.ts
  repositories/
    denunciations-repository.ts
    in-memory/in-memory-denunciations-repository.ts
    prisma/denunciations-repository-prisma.ts
  use-cases/
    create-denunciation-use-case.ts          + .spec.ts
    get-denunciation-use-case.ts             + .spec.ts
    get-denunciations-use-case.ts            + .spec.ts
    update-denunciation-status-use-case.ts   + .spec.ts
    create-denunciation-attachment-use-case.ts  + .spec.ts
    delete-denunciation-attachment-use-case.ts  + .spec.ts
  factories/make-denunciation.ts
  moderation-routes.ts
```

---

## 3. Entidade e DTOs

**`entities/denunciation-entity.ts`** — Zod schemas para `Denunciation`, `DenunciationAttachment`, `DenunciationStatus` (padrão de `complaint-entity.ts`)

**`dtos/denunciations-dto.ts`** — re-exporta entidades + define schemas de input:

| Schema | Campos |
|---|---|
| `createDenunciationSchema` | `title` (1-200 chars), `description` (min 1), `reporter_email?` (email), `latitude?` (-90..90), `longitude?` (-180..180) |
| `updateDenunciationStatusSchema` | `status` (REVIEWED \| CLOSED \| DISMISSED) — não permite voltar a PENDING |
| `getDenunciationsQuerySchema` | `status?`, `cursor?` (datetime), `limit` (1-100, default 20) |
| `saveDenunciationAttachmentSchema` | `url`, `file_name`, `path`, `base64`, `metadata?`, `type` (PHOTO \| VIDEO) |

---

## 4. Repository interface

**`repositories/denunciations-repository.ts`**

```
findMany({ status?, cursor?, limit }) → Denunciation[]
findById(denunciationId) → Denunciation | null
create(data: CreateDenunciation) → Denunciation
updateStatus(denunciationId, status) → Denunciation | null
attachByDenunciationId(denunciationId, data) → Denunciation | null
deleteAttachment(denunciationId, attachmentId) → void
```

Sem `userId` na maioria dos métodos — denunciations são anônimo-friendly.

---

## 5. Use-cases

| Use-case | Lógica |
|---|---|
| **CreateDenunciationUseCase** | Cria denunciation com status PENDING. Recebe `DenunciationsRepository`. |
| **GetDenunciationUseCase** | Busca por ID, lança `DENUNCIATION_NOT_FOUND` (404) se null. |
| **GetDenunciationsUseCase** | Listagem paginada por cursor (fetch `limit+1`, padrão de `GetComplaintsUseCase`). Filtro por status. |
| **UpdateDenunciationStatusUseCase** | Valida existência + transições: PENDING→qualquer, REVIEWED→CLOSED/DISMISSED, CLOSED/DISMISSED→erro `DENUNCIATION_ALREADY_FINALIZED` (422). |
| **CreateDenunciationAttachmentUseCase** | Segue exatamente o padrão de `CreateComplaintAttachmentUseCase`: valida MIME (jpeg, png, mp4, mov, webm), max 10MB, upload para `denunciations/{denunciationId}/{timestamp}.{ext}`, salva base64. Recebe `DenunciationsRepository` + `StorageProvider`. |
| **DeleteDenunciationAttachmentUseCase** | Busca denunciation, valida attachment, deleta do storage + DB. Recebe `DenunciationsRepository` + `StorageProvider`. |

---

## 6. Rotas

**`moderation-routes.ts`** — registrado em `app.ts` com `prefix: "/v1"`

| Método | Path | Auth | Descrição |
|---|---|---|---|
| `POST` | `/denunciations` | Pública | Cria denunciation. Se JWT presente, extrai email do token; senão, usa body ou null. |
| `POST` | `/denunciations/:id/attachments` | Pública | Upload de imagem (multipart). |
| `GET` | `/denunciations` | JWT | Lista denunciations (paginado, filtro por status). |
| `GET` | `/denunciations/:id` | JWT | Detalhes de uma denunciation. |
| `PATCH` | `/denunciations/:id/status` | JWT | Atualiza status (moderação). |
| `DELETE` | `/denunciations/:id/attachments/:attachmentId` | JWT | Deleta attachment. |

Swagger tags: `"Moderation"`, `"Moderation / Attachments"`

Hook `onRequest` com `config: { public: true }` para rotas públicas (mesmo padrão de `complaint-routes.ts:114-117`).

---

## 7. Registro em `app.ts`

Adicionar:
```typescript
import { moderationRoutes } from "./modules/moderation/moderation-routes.js";
app.register(moderationRoutes, { prefix: "/v1" });
```

---

## 8. Factory

**`factories/make-denunciation.ts`** — `makeDenunciation(overrides?)` usando `faker` + `randomUUID`, com status default `PENDING` e `attachments: []`.

---

## 9. Ordem de implementação

1. Prisma schema + migration
2. `entities/denunciation-entity.ts`
3. `dtos/denunciations-dto.ts`
4. `repositories/denunciations-repository.ts` (interface)
5. `repositories/in-memory/in-memory-denunciations-repository.ts`
6. `factories/make-denunciation.ts`
7. Use-cases + specs (TDD, um por vez):
   - CreateDenunciationUseCase
   - GetDenunciationUseCase
   - GetDenunciationsUseCase
   - UpdateDenunciationStatusUseCase
   - CreateDenunciationAttachmentUseCase
   - DeleteDenunciationAttachmentUseCase
8. `repositories/prisma/denunciations-repository-prisma.ts`
9. `moderation-routes.ts`
10. Registro em `app.ts`

---

## 10. Verificação

1. `npm run test -- denunciation` — testes unitários do módulo
2. `npm run test` — suite completa
3. `npm run lint` — sem erros de lint
4. `npm run dev` — servidor sobe sem erros
5. Testar via Swagger (`/docs`) os endpoints:
   - Criar denunciation anônima (sem JWT)
   - Criar denunciation autenticada (com JWT → email extraído)
   - Upload de imagem
   - Listar denunciations com paginação
   - Atualizar status
   - Deletar attachment

---

## Arquivos existentes reutilizados

- `src/modules/common/errors/app-error.ts` — classe `AppError`
- `src/modules/common/providers/storage/storage.ts` — interface `StorageProvider`
- `src/modules/common/providers/storage/make-storage-provider.ts` — factory
- `src/modules/common/middlewares/verify-jwt.ts` — middleware JWT
- `src/modules/common/types/openapi-security.ts` — `withBearerAuth`
- `src/modules/complaints/use-cases/create-complaint-attachment-use-case.ts` — padrão de referência para attachment
