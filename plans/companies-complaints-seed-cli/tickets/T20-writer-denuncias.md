# T20 — Writer de denúncias

**Status:** ⬜ Pendente
**Depende de:** T12
**Arquivos:** `cli/complaints/writers/complaint-seed-file-writer.ts` (+spec)

## Checklist

- [ ] Interface `ComplaintSeedFileWriter { exists(ctx): ExistsResult; write(ctx, complaints, meta, opts?): WriteResult }` — mesmo shape de `SeedFileWriter` (companies), sem necessidade de `read()` aqui (diferente do writer de moradores — o arquivo de denúncias não precisa ser recarregado por outro pipeline)
- [ ] Implementação `JsonComplaintSeedFileWriter`: grava `prisma/seeds/complaints/<slug>-<uf>.json`, mesmo `citySlug(ctx)` reaproveitado de `shared/` (ou duplicado localmente se não for extraído — decidir na implementação, preferir reaproveitar)
- [ ] Cache "pula se já existe" antes de qualquer geração cara (mesmo padrão corrigido em T23 do plano original de empresas — aqui já nasce correto, sem o bug histórico)
- [ ] Spec cobre: `write` cria diretório se necessário; `exists` reflete corretamente; `force: true` sobrescreve
