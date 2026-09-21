# T2 — Remover `base64` de `ComplaintAttachment`

**Status:** [x] Concluído
**Depende de:** nada (T1 deve estar concluído antes por ordem de execução, não por dependência técnica)
**Módulos:** `prisma/schema.prisma`, `src/modules/complaints`, `src/modules/accounts` (spec de integração)

## Contexto

Mesmo padrão do T1, agora na tabela `complaint_attachments`
(anexos da denúncia original, não da resolução — resolução é o T3).
Ver [`00-epic-brief.md`](../00-epic-brief.md).

`complaintAttachmentSchema` é usado tanto em `complaintSchema` quanto em
`publicComplaintSchema` — expõe `base64` na resposta pública hoje. Confirmar
de novo com grep, mas já validado no épico: nem mobile nem web leem esse
campo.

`mapAttachmentSchema` (uso no endpoint de mapa) **já** faz
`.omit({ base64: true, path: true, metadata: true })` — depois de tirar
`base64` de `complaintAttachmentSchema`, essa chave some do shape e o
`.omit({ base64: true, ... })` vira erro de tipo. Tirar `base64: true` desse
`.omit` também.

## Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | Remover linha `base64 String` do model `ComplaintAttachment` (~linha 412) |
| `src/modules/complaints/entities/complaint-entity.ts:61` | Remover `base64: z.string()` de `complaintAttachmentSchema` |
| `src/modules/complaints/dtos/complaints-dto.ts:79` | Remover `base64: z.string().min(1, "base64 is required")` de `saveComplaintAttachmentSchema` |
| `src/modules/complaints/dtos/complaints-dto.ts:152` | Remover `base64: true` do `.omit({...})` de `mapAttachmentSchema` |
| `src/modules/complaints/use-cases/create-complaint-attachment-use-case.ts:97` | Remover `base64: file.content.toString("base64"),` |
| `src/modules/complaints/repositories/prisma/complaints-repository-prisma.ts` | Remover `base64` do type `PrismaComplaintPayload` (~46), do `mapComplaint` (~76), do `create` de `attachByComplaintId` (~250) e do mapper do `findPublicComplaint`-like (~436) |
| `src/modules/complaints/repositories/in-memory/in-memory-complaints-repository.ts` | Remover `base64` do type local de attachment (~43) e dos dois pontos de map/save (~216, ~358) — **não mexer** nas linhas equivalentes de `ResolutionAttachment` (~65, ~571, ~631), isso é T3 |
| `src/modules/complaints/use-cases/delete-complaint-attachment-use-case.spec.ts` | Ajustar fixtures que hoje esperam `base64` |
| `src/modules/accounts/workers/account-deletion-worker.integration.spec.ts:149` | Remover `base64: "data:image/jpeg;base64,dGVzdA=="` do `createComplaintWithAttachment` |

Confirmar com grep se sobrou algum outro ponto:
`grep -rn "base64" src/modules/complaints` (deve só sobrar ocorrências de
`ComplaintResolutionAttachment`, que é o T3).

## Migration

```bash
docker compose up -d postgresql
npm run migrate:dev -- --name remove_base64_from_complaint_attachments
```

## Checklist

- [x] Editar `prisma/schema.prisma` (remover coluna do model `ComplaintAttachment`)
- [x] Rodar migration, conferir SQL gerado (só essa tabela) — `20260908143915_remove_base64_from_complaint_attachments`, só `ALTER TABLE "complaint_attachments" DROP COLUMN "base64"`
- [x] Remover `base64` de entity (`complaintAttachmentSchema`) e do `.omit` de `mapAttachmentSchema`
- [x] Remover `base64` de `saveComplaintAttachmentSchema` e do use-case de criação
- [x] Remover `base64` da prisma repository (3 pontos) e da in-memory repository (3 pontos, só os de `ComplaintAttachment`)
- [x] Ajustar `delete-complaint-attachment-use-case.spec.ts` e `account-deletion-worker.integration.spec.ts`
- [x] `npm run test -- complaints` verde — 27 arquivos, 132 testes
- [x] `npm run test -- account-deletion` verde — rodado via `npm run test:integration -- account-deletion` com `test:infra:up`, 2 arquivos, 4 testes
- [x] `npx tsc --noEmit` sem erro (após `npm run migrate:generate`)
- [x] `npm run lint` limpo no que foi tocado (avisos remanescentes em `complaints-repository-prisma.ts` são `noExplicitAny` pré-existentes, fora do escopo)
- [x] `grep -rn "base64" src/modules/complaints` só retorna linhas de `ComplaintResolutionAttachment` (T3)

## Testes

Unitários do módulo `complaints`. `account-deletion-worker.integration.spec.ts`
é integration (precisa DB de teste) — rodar se o ambiente tiver
`.env`/`test:infra:up`; senão reportar como pulado.
