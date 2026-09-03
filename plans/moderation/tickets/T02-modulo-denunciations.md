# T02 — Módulo `Denunciation` (denúncia interna de conteúdo/perfil)

**Status:** [x] Concluído
**Depende de:** nada (pode rodar em paralelo a T01)
**Módulos:** `prisma/schema.prisma`, `src/modules/moderation/`
**Fecha:** api#59 (M02)
**Substitui:** `plans/moderation-denunciations.md` (migrado pra cá, atualizado)

## Checklist

- [x] Passo 1 — `schema.prisma`: `Denunciation` + `DenunciationAttachment`
- [x] Passo 2 — estrutura do módulo (pastas/arquivos)
- [x] Passo 3 — entidade e DTOs
- [x] Passo 4 — `repositories/denunciations-repository.ts` (interface)
- [x] Passo 5 — use-cases (create, attachment, delete-attachment) + specs
- [x] Passo 6 — `factories/make-denunciation.ts`
- [x] Verificação (`tsc`, `lint`, `test`, `test:integration`) verde
- [x] `code-review` aprovado (1 ajuste: desacoplado import cruzado de `complaintCaptureModeSchema`, enum próprio `denunciationAttachmentTypeSchema` local)

## Contexto

Sistema de **moderação interna do app**: usuário denuncia conteúdo, postagem ou perfil
inadequado — golpe, nome/descrição/imagem imprópria de uma company, etc. Fluxo simples: título,
descrição, anexos, status/severidade geridos pela moderação, sem votação.

**Não confundir com `Complaint`** (denúncia ambiental — geolocalização, categorias de resíduo,
votação, quórum). `Denunciation` é sobre o *cadastro/perfil/conteúdo* estar errado ou ser golpe;
`Complaint` é sobre um *problema ambiental real reportado por um cidadão*. Não reaproveitar nome,
schema ou rota de `complaints`.

Este ticket cobre só **modelo de dados + use-cases de criação/anexo**. A rota pública de criação e
as rotas de leitura/cancelamento do usuário ficam em T03; as rotas de moderação ficam em T04; a
ação de banir a partir de uma denúncia fica em T05.

`status` e `severity` são os mesmos enums compartilhados que T01 define pra `Support`
(`ModerationStatus`, `ModerationSeverity`) — ver decisão em `00-tech-plan.md` (reverte o enum
próprio `DenunciationStatus` do plano anterior). `title`/`description`/`reporter_email`
(obrigatórios) e anexos (opcional) seguem o mesmo contrato de campo de `Support` (T01) — ver
"Contrato de campo compartilhado" em `00-tech-plan.md`. `reporter_email` é obrigatório na
aplicação (auto-preenchido da sessão quando logado, exigido no body quando anônimo — mesma regra
de `Support`), mas fica `String?` no schema Prisma (não vale a pena um `NOT NULL` de banco pra uma
regra que já é garantida na camada de use-case).

## Passo 1 — `prisma/schema.prisma`

```prisma
model Denunciation {
  id               String              @id @default(uuid())
  title            String
  description      String
  status           ModerationStatus    @default(OPEN)
  severity         ModerationSeverity?
  reporter_email   String?
  latitude         Float?
  longitude        Float?
  created_at       DateTime            @default(now())
  updated_at       DateTime            @updatedAt

  reporter_user_id String?
  reporter         User?   @relation("ReporterOfDenunciations", fields: [reporter_user_id], references: [id], onDelete: SetNull)

  reported_user_id String?
  reported_user    User?   @relation("ReportedInDenunciations", fields: [reported_user_id], references: [id], onDelete: SetNull)

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

Requer `ModerationStatus`/`ModerationSeverity` de T01 (rodar T01 primeiro se ambos forem
sequenciais; se rodarem em paralelo, alinhar quem cria os dois enums na migração pra não
duplicar).

`reporter_user_id` é novo em relação ao plano anterior — antes só existia `reporter_email` solto;
agora, igual ao `Support` (T01), se a criação vier com Bearer token válido o `user_id` do
denunciante é gravado (necessário pra rota "minhas denúncias" em T03). `reported_user_id` (quem
está sendo denunciado) também nasce aqui, não é bolt-on posterior — é o que T05 usa pra banir.
Nomes de relação reversa distintos (`"ReporterOfDenunciations"`, `"ReportedInDenunciations"`) pra
não colidir no `model User`. Nenhum dos dois é obrigatório: denúncia pode ser anônima e pode ser
sobre um golpe genérico sem usuário identificável como alvo.

Reusa `ComplaintCaptureMode` (`PHOTO`/`VIDEO`) só pro enum de tipo de arquivo — não cria FK nem
relação com `Complaint`. GPS como `Float?` simples (sem PostGIS — não há busca por raio aqui).

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
    create-denunciation-attachment-use-case.ts   + .spec.ts
    delete-denunciation-attachment-use-case.ts   + .spec.ts
  factories/make-denunciation.ts
```

Sem arquivo de rotas neste ticket — nasce em T03 (usuário) e T04 (moderação).

## Passo 3 — Entidade e DTOs

**`entities/denunciation-entity.ts`** — Zod schemas `Denunciation`, `DenunciationAttachment`
(padrão de `support-entity.ts`), reaproveitando `moderationStatusSchema` e
`moderationSeveritySchema` de lá.

**`dtos/denunciations-dto.ts`** — re-exporta entidades + schemas de input:

| Schema | Campos |
|---|---|
| `createDenunciationSchema` | `title` (1-200), `description` (min 1), `reporter_email?` (email, opcional no schema Zod — obrigatoriedade condicional à sessão é validada na rota, igual T01), `reported_user_id?` (uuid), `latitude?` (-90..90), `longitude?` (-180..180) |
| `saveDenunciationAttachmentSchema` | `url`, `file_name`, `path`, `base64`, `metadata?`, `type` (`PHOTO \| VIDEO`) |

Sem schema de transição de status/severidade aqui — isso é `dtos/moderation-dto.ts`, usado pelas
rotas de moderação em T04.

## Passo 4 — Repositório

```ts
export interface DenunciationsRepository {
  findMany(filters: { status?: ModerationStatus; cursor?: Date; limit: number }): Promise<Denunciation[]>;
  findManyByReporter(reporterUserId: string, filters: { cursor?: Date; limit: number }): Promise<Denunciation[]>;
  findById(denunciationId: string): Promise<Denunciation | null>;
  create(data: CreateDenunciation): Promise<Denunciation>;
  updateStatus(denunciationId: string, data: { status: ModerationStatus; severity?: ModerationSeverity; reason?: string; moderatedBy?: string }): Promise<Denunciation | null>;
  attach(denunciationId: string, data: SaveDenunciationAttachment): Promise<Denunciation | null>;
  deleteAttachment(denunciationId: string, attachmentId: string): Promise<void>;
}
```

`findManyByReporter` é o que a rota "minhas denúncias" (T03) usa — só quem tem `reporter_user_id`
preenchido consegue listar as próprias (ver decisão em `00-tech-plan.md`: denúncia anônima não é
rastreável depois).

## Passo 5 — Use-cases

| Use-case | Lógica |
|---|---|
| `CreateDenunciationUseCase` | Cria com status `OPEN`, sem severidade. Recebe `reporter_email` já resolvido (sessão ou body) — `DENUNCIATION_EMAIL_REQUIRED` (400) se nenhum dos dois existir, validado na rota (T03) antes de chamar o use-case, mesmo padrão de `SUPPORT_EMAIL_REQUIRED` em T01. |
| `CreateDenunciationAttachmentUseCase` | Segue `CreateComplaintAttachmentUseCase`: valida MIME (jpeg, png, mp4, mov, webm), max 10MB, upload `denunciations/{id}/{timestamp}.{ext}`, salva base64. |
| `DeleteDenunciationAttachmentUseCase` | Busca denúncia, valida attachment, remove do storage + DB. |

`GetDenunciationUseCase`/`GetDenunciationsUseCase` (leitura por id/moderador) e
`UpdateDenunciationStatusUseCase` (transição pela moderação) ficam em T04 — leitura "minha
denúncia"/"minhas denúncias" e cancelamento ficam em T03, com use-cases próprios lá
(`GetOwnDenunciationUseCase`, `GetOwnDenunciationsUseCase`, `CancelDenunciationUseCase`) pra não
misturar autorização de dono com autorização de moderador no mesmo use-case.

## Passo 6 — Factory

`factories/make-denunciation.ts` — `makeDenunciation(overrides?)` com `faker` + `randomUUID`,
status default `OPEN`, `attachments: []`.

## Ordem de implementação

1. Schema + migration (após T01, se sequencial)
2. `entities/denunciation-entity.ts`
3. `dtos/denunciations-dto.ts`
4. `repositories/denunciations-repository.ts` (interface)
5. `repositories/in-memory/in-memory-denunciations-repository.ts`
6. `factories/make-denunciation.ts`
7. Use-cases + specs (TDD, um por vez)
8. `repositories/prisma/denunciations-repository-prisma.ts`

## Fora de escopo

- Toda rota HTTP (criação/leitura/cancelamento em T03; listagem/gestão em T04; ban em T05).
- Trilha de auditoria (`moderated_by`/`moderated_at`) — entra em T04, na mesma migração que faz o
  mesmo pra `Support`.
- Banir usuário/perfil denunciado a partir de uma denúncia — entra em T05.

## Verificação

- `npm run test -- denunciation` — specs dos use-cases.
- `npm run test:integration` do repositório Prisma (`findMany`, `findManyByReporter`, `create`,
  `attach`, `deleteAttachment`).
- `npx tsc --noEmit`, `npm run lint`, `npm run test` completos.
