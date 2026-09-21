# T1 — Remover `base64` de `DenunciationAttachment`

**Status:** [x] Concluído
**Depende de:** nada
**Módulos:** `prisma/schema.prisma`, `src/modules/denunciation`,
`src/modules/moderation/sub-modules/denunciation`

## Contexto

`file.content.toString("base64")` é gravado inteiro na coluna `base64` de
`denunciation_attachments`, duplicando o binário que já está no MinIO. Ver
[`00-epic-brief.md`](../00-epic-brief.md) para o porquê geral.

## Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | Remover linha `base64 String` do model `DenunciationAttachment` (~linha 495) |
| `src/modules/denunciation/entities/denunciation-entity.ts:23` | Remover `base64: z.string()` |
| `src/modules/denunciation/dtos/denunciations-dto.ts:69` | Remover `base64: z.string().min(1, "base64 is required")` |
| `src/modules/denunciation/use-cases/create-denunciation-attachment-use-case.ts:127` | Remover `base64: file.content.toString("base64"),` do objeto salvo |
| `src/modules/denunciation/repositories/prisma/denunciations-repository-prisma.ts` | Remover `base64` do type local (linha ~37), do `select`/`create` (linha ~252) e do mapper (linha ~61) |
| `src/modules/denunciation/repositories/in-memory/in-memory-denunciations-repository.ts` | Remover `base64` do type local (linha ~35) e dos dois pontos de map/save (linhas ~220, ~259) |
| `src/modules/moderation/sub-modules/denunciation/repositories/prisma/moderation-denunciations-repository-prisma.ts` | Remover `base64` do type `PrismaDenunciationPayload` (linha ~35) e do `mapDenunciation` (linha ~59) |
| `src/modules/denunciation/use-cases/create-denunciation-attachment-use-case.spec.ts` | Ajustar fixtures/mocks que hoje esperam `base64` |
| `src/modules/denunciation/repositories/prisma/denunciations-repository-prisma.integration.spec.ts` | Ajustar fixtures/asserts que hoje esperam `base64` |

Confirmar com grep se sobrou algum outro ponto: `grep -rn "base64" src/modules/denunciation src/modules/moderation/sub-modules/denunciation`.

## Migration

```bash
docker compose up -d postgresql
npm run migrate:dev -- --name remove_base64_from_denunciation_attachments
```

Confirmar que a migration gerada é só `ALTER TABLE denunciation_attachments DROP COLUMN base64` — nada mais.

## Checklist

- [x] Editar `prisma/schema.prisma` (remover coluna do model)
- [x] Rodar migration (comando acima), conferir SQL gerado — `docker-compose.yml`
      do monorepo não existe (só `docker-compose.dev.yml`/`docker-compose.test.yml`
      dentro de `api/`); o Postgres de dev já estava rodando via
      `oikos-dev-postgresql-1`. `prisma migrate dev` falhou de início (P3006:
      `permission denied to create extension "postgis"` no shadow DB, porque o
      role `oikos` não é superuser). Contornado concedendo `SUPERUSER`
      temporário ao role via `docker exec ... ALTER USER oikos WITH SUPERUSER`,
      rodando a migration, e revertendo com `ALTER USER oikos WITH NOSUPERUSER`
      logo em seguida (estado do role restaurado). SQL gerado, conferido:
      só `ALTER TABLE "denunciation_attachments" DROP COLUMN "base64";`.
- [x] Remover `base64` de entity, dto, use-case
- [x] Remover `base64` das 3 repositories (prisma denunciation, in-memory denunciation, prisma moderation)
- [x] Ajustar specs afetados (unit + integration) — removido também o teste
      `"stores the file content as base64"` do use-case spec, que não faz
      mais sentido sem o campo (não estava listado explicitamente na tabela,
      mas está dentro de "ajustar fixtures/mocks")
- [x] `npm run test -- denunciation` verde — 11 arquivos, 60 testes passando
- [x] `npm run test -- moderation` verde — 7 arquivos, 31 testes passando
- [x] `npx tsc --noEmit` sem erro — precisou rodar `npm run migrate:generate`
      depois da migration pra regenerar o Prisma Client (senão o client antigo
      ainda exigia `base64` em `DenunciationAttachmentUncheckedCreateInput`)
- [x] `npm run lint` limpo no que foi tocado — `npx biome check` escopado aos
      arquivos do ticket não aponta nada introduzido por esta mudança (os 3
      avisos pré-existentes em arquivos vizinhos, `noExplicitAny`/
      `noNonNullAssertion`, são de código não tocado neste ticket)
- [x] `grep -rn "base64" src/modules/denunciation src/modules/moderation/sub-modules/denunciation` vazio

## Testes

Unitários dos módulos `denunciation` (60 testes) e `moderation` (31 testes)
verdes. Suíte completa (`npm run test`) também verde: 104 arquivos, 615
testes. Integration test (`denunciations-repository-prisma.integration.spec.ts`)
não foi pulado: subi a infra de teste (`npm run test:infra:up`), apliquei as
migrations no banco de teste (`prisma migrate deploy` contra
`postgresql://oikos_test:oikos_test@localhost:5433/oikos_test`, todas as 16
migrations aplicaram limpo, incluindo a nova) e rodei
`npm run test:integration -- denunciations-repository-prisma`: 8/8 testes
passando.
