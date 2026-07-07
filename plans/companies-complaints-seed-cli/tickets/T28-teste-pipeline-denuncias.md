# T28 — Teste de pipeline ponta a ponta (denúncias)

**Status:** ⬜ Pendente
**Depende de:** T21, T23 (pipeline completo implementado e integrado)
**Arquivos:** `cli/complaints/complaint-seed-pipeline.spec.ts`

## Checklist

- [ ] Compõe `GenerateCityComplaintsUseCase` com fakes de todos os providers/writers envolvidos (`ResolveCityUseCase`/`ResolveCityResidentsUseCase` fakeados ou com fakes de IBGE/Geocoding reaproveitados do spec de empresas; writer em memória, sem disco/rede)
- [ ] Assert: todo `geospatial` gerado valida contra `geospatialSchema` real (import de `src/modules/complaints/entities/complaint-entity.js`)
- [ ] Assert: toda categoria em `waste_category_names` existe em `CATEGORIES`
- [ ] Assert: nenhum voto duplica `resident_index` na mesma denúncia; autor nunca aparece em `votes[]`
- [ ] Assert: toda denúncia `OPEN` fica abaixo do quórum (fórmula duplicada usada para verificar) e toda `RESOLVED` o atinge
- [ ] Assert: `resolution_hint: "PREFER_COMPANY"` só aparece quando o `resident_index` da resolução está no `residentsWithCompany` passado ao gerador
- [ ] Assert: nenhuma resolução duplica `resident_index` na mesma denúncia
- [ ] `npm run test -- complaint-seed-pipeline` passa
