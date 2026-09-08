# T4 — Faxina final: `convertFileToBase64` morto + grep global

**Status:** [x] Concluído
**Depende de:** T1, T2, T3 concluídos
**Módulos:** `src/modules/common/providers/storage`

## Contexto

Achado durante a investigação (ver [`00-epic-brief.md`](../00-epic-brief.md)):
`StorageProvider.convertFileToBase64()` nunca é chamado por nenhum use-case em
produção — o base64 que estava sendo salvo vinha direto de
`file.content.toString("base64")` no buffer em memória do upload, não desse
método. É código morto desde a introdução da feature, some junto.

Este ticket também roda o grep de confirmação final: depois de T1+T2+T3, não
deve sobrar **nenhuma** ocorrência de `base64` fora de `src/generated/`
(client Prisma gerado, se algum resquício de tipo cacheado sobrar até o
próximo `prisma generate`).

## Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `src/modules/common/providers/storage/storage.ts:15` | Remover `convertFileToBase64: (filePath: string) => Promise<string>;` da interface `StorageProvider` |
| `src/modules/common/providers/storage/minio/minio-bucket.ts` | Remover método `convertFileToBase64` (implementação + import não usado do `GetObjectCommand` se ficar órfão — confirmar, `GetObjectCommand` também é usado pela leitura normal, não remover se ainda usado) |
| `src/modules/common/providers/storage/supabase/supabase-bucket.ts` | Remover método `convertFileToBase64` |
| `src/modules/common/providers/storage/in-memory/in-memory-storage.ts` | Remover método `convertFileToBase64` |
| Specs desses 3 arquivos (se existirem testes cobrindo o método) | Remover os casos de teste do método |

## Checklist

- [x] Remover `convertFileToBase64` da interface `StorageProvider`
- [x] Remover as 3 implementações (Minio, Supabase, InMemory)
- [x] Remover testes específicos do método, se existirem (nenhum spec dedicado dos 3 arquivos existia; ajustado 1 mock de objeto literal em `delete-complaint-attachment-use-case.spec.ts` que quebrava por excess property check após a remoção da interface)
- [x] `npx tsc --noEmit` sem erro (confirma que nada mais implementa/chama o método removido) — passou, 0 erros
- [x] `npm run test` (suíte completa) verde — 104 arquivos, 615 testes, todos passando
- [x] `npm run lint` limpo — exit 0 (só warnings pré-existentes em arquivos fora do escopo deste ticket)
- [x] `grep -rn "base64" src --include="*.ts" | grep -v src/generated` retorna **vazio** — confirmado
- [x] `graphify update .` pra refletir o grafo sem os nós/edges removidos — rodado com sucesso

## Testes

Suíte completa (`npm run test`), não só o módulo `storage` — esse ticket é o
fechamento, confirma que nada ficou quebrado em nenhum módulo depois das
3 migrations e das 3 remoções de campo.
