# T3 — Remover `base64` de `ComplaintResolutionAttachment`

**Status:** [x] Concluído
**Depende de:** nada (T1/T2 antes só por ordem de execução, não dependência técnica)
**Módulos:** `prisma/schema.prisma`, `src/modules/complaints`

## Contexto

Mesmo padrão dos anteriores, agora em `complaint_resolution_attachments`.

Diferença importante em relação ao T2: `resolutionAttachmentSchema`
(`complaint-entity.ts:96`) **já não expõe** `base64` (nem `path`) na resposta
pública — só `id, url, file_name, created_at`. Ou seja, o schema de resposta
pública **não muda neste ticket**. O que muda é só o tipo interno
`SaveResolutionAttachment` (usado do use-case até o insert no Prisma) e o
armazenamento em si.

## Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | Remover linha `base64 String` do model `ComplaintResolutionAttachment` (~linha 548) |
| `src/modules/complaints/dtos/complaints-dto.ts:200-205` | Remover `base64: string` do type `SaveResolutionAttachment` |
| `src/modules/complaints/use-cases/add-resolution-attachment-use-case.ts:86` | Remover `base64: file.content.toString("base64"),` |
| `src/modules/complaints/repositories/prisma/complaints-repository-prisma.ts:669` | Remover `base64: data.base64,` do `create` de `addResolutionAttachment` |
| `src/modules/complaints/repositories/in-memory/in-memory-complaints-repository.ts` | Remover `base64` do type local de `ResolutionAttachment` (~65) e dos dois pontos de map/save (~571, ~631) — **não mexer** nas linhas de `ComplaintAttachment` (já tratadas no T2) |
| `src/modules/complaints/use-cases/add-resolution-attachment-use-case.spec.ts` | Ajustar fixtures/mocks que hoje esperam `base64` |
| `src/modules/complaints/use-cases/get-resolutions-use-case.spec.ts` | Ajustar fixtures que hoje esperam `base64` |
| `src/modules/complaints/use-cases/delete-resolution-use-case.spec.ts` | Ajustar fixtures que hoje esperam `base64` |

Confirmar com grep se sobrou algum outro ponto:
`grep -rn "base64" src/modules/complaints` (deve voltar **vazio** depois
deste ticket, já que T2 cobriu `ComplaintAttachment`).

## Migration

```bash
docker compose up -d postgresql
npm run migrate:dev -- --name remove_base64_from_resolution_attachments
```

## Checklist

- [x] Editar `prisma/schema.prisma` (remover coluna do model `ComplaintResolutionAttachment`)
- [x] Rodar migration, conferir SQL gerado (só essa tabela) — `20260908144405_remove_base64_from_resolution_attachments`, `ALTER TABLE "complaint_resolution_attachments" DROP COLUMN "base64"` só
- [x] Remover `base64` do type `SaveResolutionAttachment` e do use-case de criação
- [x] Remover `base64` da prisma repository (1 ponto) e da in-memory repository (2 pontos)
- [x] Ajustar os 3 specs listados acima — `add-resolution-attachment-use-case.spec.ts` já não tinha `base64`, só `get-resolutions-use-case.spec.ts` e `delete-resolution-use-case.spec.ts` precisaram de ajuste
- [x] `npm run test -- complaints` verde — 27 test files, 132 tests passed
- [x] `npx tsc --noEmit` sem erro (após `npm run migrate:generate`, client Prisma estava desatualizado)
- [x] `npm run lint` limpo no que foi tocado — exit 0, 24 warnings/2 infos pré-existentes fora do escopo deste ticket
- [x] `grep -rn "base64" src/modules/complaints` vazio

## Testes

Unitários do módulo `complaints`. Sem integration test próprio pra essa
tabela além do que já roda na suíte principal.
