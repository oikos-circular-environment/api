# T21 — Use-case orquestrador de denúncias

**Status:** ⬜ Pendente
**Depende de:** T8, T19, T20
**Arquivos:** `cli/complaints/use-cases/generate-city-complaints-use-case.ts` (+spec)

## Checklist

- [ ] `GenerateCityComplaintsUseCase(resolveCity, resolveCityResidents, complaintGenerator, writer)` — reaproveita os DOIS use-cases de `shared/` (cidade e moradores), não os reimplementa
- [ ] Fases públicas granulares (mesmo padrão de `GenerateCitySeedUseCase`): `resolveCity`, `resolveResidents`, `checkExisting`, `computeResidentsWithCompany(ctx)` (lê `prisma/seeds/recycling-companies/<slug>.json` da mesma cidade SE existir — usa `fs.existsSync`/leitura direta, sem depender de o pipeline de empresas ter rodado NESTA execução; retorna `Set<number>` vazio se o arquivo não existir), `generateComplaints(ctx, residents, residentsWithCompany, target)`, `writeSeed`, e `execute()` que encadeia tudo
- [ ] Spec cobre: quando existe um `CompanySeedFile` para a cidade (fake em disco temporário ou injeção de uma função de leitura), `residentsWithCompany` reflete os `owner_resident_index` presentes nele; quando não existe, `residentsWithCompany` é um Set vazio e nenhuma resolução gerada é `PREFER_COMPANY`
