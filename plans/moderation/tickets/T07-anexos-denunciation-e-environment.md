# T07 — Anexos de denúncia (rota faltando) e `environment` com passthrough sanitizado

**Status:** [ ] Não iniciado
**Depende de:** T06
**Módulos:** `src/modules/denunciation/`, `src/modules/support/`, `prisma/schema.prisma`
**Fecha:** parte de api#108

## Checklist

- [ ] Passo 1 — rotas de attachment de denúncia (`POST`/`DELETE /v1/denunciations/:id/attachments`)
- [ ] Passo 2 — `CreateDenunciationAttachmentUseCase` passa a aceitar `metadata` de entrada
- [ ] Passo 3 — `supportEnvironmentSchema` ganha `.passthrough()` sanitizado
- [ ] Passo 4 — sanitização recursiva (chaves perigosas, profundidade, tamanho) reaproveitada nos
      dois campos livres (`environment` extra e `denunciation attachment.metadata`)
- [ ] Passo 5 (opcional, decidir antes de iniciar) — presigned upload direto pro bucket
- [ ] Verificação (`tsc`, `lint`, `test`, `test:integration`, `qa-runner` via Swagger) verde
- [ ] `code-review` aprovado

## Contexto

Dois problemas encontrados ao auditar T01-T05 já mergeados (PR #107):

1. **`POST /v1/denunciations` não tem nenhuma forma de anexar mídia.**
   `CreateDenunciationAttachmentUseCase`/`DeleteDenunciationAttachmentUseCase` existem, têm spec,
   mas nunca foram ligados a uma rota — `grep` confirma que só são importados pelos próprios
   `.spec.ts`. Diferente de `Support` (que já aceita `multipart/form-data` com até 5 imagens na
   própria criação, via `support-routes.ts`), `Denunciation` fica sem meio de subir foto/vídeo.

2. **`supportEnvironmentSchema` é um `z.object()` estrito** — qualquer chave fora de
   `platform/app_version/os_version/screen_size/last_error` é descartada no `.parse()`, mesmo a
   coluna sendo `Json?` no Prisma. O ticket original (T01) já dizia "este schema é o mínimo, não o
   teto do que `environment` pode carregar" — a implementação não cumpre isso. Decisão: manter o
   nome `environment` e o mínimo tipado, mas parar de descartar chaves extras — só sanitizar.

## Passo 1 — Rotas de attachment de denúncia

Em `src/modules/denunciation/denunciation-routes.ts`, seguindo o mesmo padrão de
`src/modules/support/support-routes.ts` (multipart, `app.multipartErrors` pra `FilesLimitError`/
`RequestFileTooLargeError`), **um arquivo por chamada** (mantém a assinatura atual do use-case —
ver decisão abaixo):

| Método | Path | Auth |
|---|---|---|
| `POST` | `/denunciations/:id/attachments` | dono da denúncia (`verifySession` + checar `reporter_user_id`) |
| `DELETE` | `/denunciations/:id/attachments/:attachmentId` | idem |

Reaproveitar `MAX_DENUNCIATION_FILES`/`DENUNCIATION_ATTACHMENT_MAX_SIZE_IN_BYTES` já definidos em
`create-denunciation-attachment-use-case.ts` (exportar de lá, mesmo padrão de
`create-support-use-case.ts` com `MAX_SUPPORT_FILES`). Só aceita enquanto `status === "OPEN"` —
mesma regra de `update-own-denunciation-use-case.ts`.

**Decisão (confirmada com o Christian):** endpoint separado pós-criação, um arquivo por chamada —
bate com a assinatura já escrita do use-case, criação continua só JSON.

## Passo 2 — `metadata` de entrada no use-case

`CreateDenunciationAttachmentUseCase.execute` hoje grava `metadata: null` fixo
(`create-denunciation-attachment-use-case.ts:93`) — o campo existe no schema
(`saveDenunciationAttachmentSchema.metadata: z.record(z.string(), z.unknown()).nullable()`) mas
nunca é alimentado por ninguém. Adicionar `metadata?: Record<string, unknown> | null` no request do
use-case, populado a partir de um campo de formulário opcional na rota (mesma técnica de
`fields.environment` em `support-routes.ts:121-132` — chega como string JSON no multipart, faz
`JSON.parse` e passa pela sanitização do Passo 4 antes de persistir).

## Passo 3 — `environment` com passthrough

```ts
export const supportEnvironmentSchema = z
  .object({
    platform: z.enum(["ios", "android", "web"]),
    app_version: z.string().max(50),
    os_version: z.string().max(50).optional(),
    screen_size: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional(),
    last_error: supportLastErrorSchema.optional(),
  })
  .passthrough();
```

Sem isso, `.passthrough()` sozinho reabre risco de prototype pollution / payload gigante — por
isso o Passo 4 roda **antes** do `.parse()`, sobre o `unknown` bruto vindo do `JSON.parse` do
campo `environment`.

## Passo 4 — Sanitização recursiva (reaproveitada nos dois campos)

Novo helper em `src/modules/common/` (ex. `sanitize-json-input.ts`), usado tanto no `environment`
extra de `Support` quanto no `metadata` de `DenunciationAttachment`:

- Rejeita chaves `__proto__`, `constructor`, `prototype` em qualquer nível (guarda contra
  prototype pollution).
- Limita profundidade (ex. 5 níveis) e tamanho serializado (ex. 32KB) — payload grande vira 400,
  não trava o processo.
- **Não** faz sanitização de HTML/script aqui — o dado sai como JSON puro (nunca é interpretado
  como código no lado da API, não há `eval`/template server-side). A responsabilidade de escapar ao
  renderizar (web#38, painel de moderação) é do consumidor — registrar isso explicitamente no
  ticket do painel quando ele for escrito, pra não presumir que a API já neutraliza XSS.

## Passo 5 (opcional — abrir sub-issue própria se aprovado, não implementar dentro deste ticket)

`StorageProvider.uploadFile` recebe `Buffer` — todo anexo (imagem ou vídeo) passa por dois saltos:
cliente → API (buffer inteiro em memória) → API → MinIO/Supabase. Isso é o gargalo real do upload
lento no mobile, não o tamanho do arquivo (compressão do lado do cliente já ajuda, mas não elimina
o segundo salto). Encaminhamento sugerido, fora do escopo deste ticket:

1. `StorageProvider` ganha `getUploadUrl(filePath, mimeType): Promise<{ url: string; path: string }>`
   (MinIO e Supabase já suportam PUT presigned nativamente).
2. Fluxo passa a ser: `POST /v1/denunciations/:id/attachments/upload-url` devolve a URL presigned;
   cliente sobe direto pro bucket; `POST /v1/denunciations/:id/attachments/confirm` (só metadata,
   sem binário) valida via `checkFileExists` e grava a linha.
3. Isso também resolve o mesmo problema em `Support`, `Complaint` e `Profile` (mesma abstração,
   mesmo padrão de "buffer inteiro em memória" nos outros usos de `StorageProvider`) — vale um
   épico próprio de storage, não encaixar dentro de T07.

## Fora de escopo

- Reescrever upload de `Support`/`Complaint`/`Profile` pra presigned — Passo 5 é só o
  encaminhamento, decisão de abrir ou não fica pro Christian.
- Escapar/sanitizar HTML no painel de moderação (web#38) — responsabilidade do consumidor.

## Verificação

- `npm run test -- denunciation` — specs cobrindo `metadata` sendo persistido (não mais sempre
  `null`), rota de attachment (arquivo válido, tipo inválido, tamanho excedido, denúncia não
  `OPEN`, denúncia de outro usuário → 403/404).
- `npm run test -- support` — `environment` com chave extra sobrevive ao parse; chave
  `__proto__`/payload gigante → 400.
- `npm run test:integration` — `attach`/`updateStatus` com `environment`/`metadata` como JSON no
  Postgres real.
- Conferir no Swagger/Scalar (`/docs`) que a nova rota de attachment aparece com o campo de arquivo
  visível no snippet gerado.
