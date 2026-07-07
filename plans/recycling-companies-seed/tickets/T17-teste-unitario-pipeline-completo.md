# T17 — Teste unitário de ponta a ponta (pipeline completo)

**Status:** ✅ Concluído
**Depende de:** T13, T15, T16
**Arquivos:** `scripts/recycling-companies/recycling-seed-pipeline.spec.ts`

## Checklist

- [x] Composto `GenerateCitySeedUseCase` com fakes de `PlacesProvider`/`GeocodingProvider`/`MunicipioProvider` (4 places cobrindo os 4 casos de classificação: ecoponto, cooperativa/ONG, ferro-velho/COLLECTOR, empresa comum) e um `InMemorySeedFileWriter` fake (sem disco, sem rede)
- [x] Assert: todo `CompanySeed` (4 reais + 8 sintéticos, `target: 12`) passa em `companyGeneralRegistrationValidationSchema`, `upsertCompanyAddressSchema`, `upsertCompanyBusinessHoursSchema`, e nas regras de negócio de `wastes`/`services` (unit válido, price/quantity positivos, nomes não duplicados)
- [x] Assert: `company_type` varia (`GOVERNMENT`, `ONG`, `COLLECTOR`, `COMPANY` entre os 4 reais, na ordem esperada)
- [x] Assert: `is_ecoponto` true só para o place de ecoponto; `identity_type` CPF só para o COLLECTOR
- [x] Assert: com `target: 12` maior que as 4 reais, completa com 8 sintéticas
- [x] Assert: nenhuma `identity` se repete entre as 12 empresas
- [x] `npm run test -- recycling-seed-pipeline` passa (1 teste, cobrindo todas as asserções acima)
- [x] Suíte completa do projeto (`npm run test`) — 304 testes, todos passando após a integração
