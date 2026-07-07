# T7 — Writer do pool de moradores (`exists`/`write`/`read`)

**Status:** ⬜ Pendente
**Depende de:** T5
**Arquivos:** `cli/shared/writers/city-residents-file-writer.ts` (+spec)

## Checklist

- [ ] Interface `CityResidentsFileWriter { exists(ctx): ExistsResult; write(ctx, residents, meta, opts?): WriteResult; read(ctx): CityResidentSeed[] }` — `read` é a única API nova em relação aos writers existentes (`SeedFileWriter`/`ComplaintSeedFileWriter` só têm `exists`/`write`)
- [ ] Implementação `JsonCityResidentsFileWriter`: grava/lê `prisma/seeds/city-residents/<slug>-<uf>.json`, mesmo helper `citySlug(ctx)` já usado pelos outros writers (considerar extrair `citySlug` para `shared/` se ainda não estiver lá após T1)
- [ ] `read()` lança erro claro se chamado quando o arquivo não existe (contrato: só chamar depois de confirmar `exists().exists === true`)
- [ ] Spec cobre: `write` cria o diretório se não existir; `exists` reflete corretamente antes/depois do `write`; `read` retorna exatamente o array gravado (round-trip)
