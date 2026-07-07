# T11 — Writer de seed (interface + JSON)

**Status:** ✅ Concluído
**Depende de:** T1
**Arquivos:** `writers/seed-file-writer.ts`, `writers/json-seed-file-writer.ts`

## Checklist

- [x] `writers/seed-file-writer.ts` — interface `SeedFileWriter`
- [x] `writers/json-seed-file-writer.ts` — `class JsonSeedFileWriter`, `citySlug(ctx)` inclui UF
- [x] Grava em `prisma/seeds/recycling-companies/<slug>.json`
- [x] Cache "pula se já existe" (a menos que `opts.force`)
- [x] Teste manual: rodado 2x sem `--force` — confirmado que a segunda chamada retorna `written: false` sem sobrescrever
