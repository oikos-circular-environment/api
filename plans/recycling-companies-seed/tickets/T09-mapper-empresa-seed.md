# T9 — Mapper de empresa real → seed

**Status:** ✅ Concluído
**Depende de:** T8
**Arquivos:** `services/company-seed-mapper.ts` (+spec)

## Checklist

- [x] `class CompanySeedMapper` injetando address-parser, classifier, gap-filler, waste-service-generator, identity-generator via construtor
- [x] `map(place, ctx) -> CompanySeed` completo
- [x] **Correção de rota**: `companyAddressSchema`/`companyBusinessHoursValidationSchema`/`companyWastesValidationSchema`/`companyServicesValidationSchema` exigem campos pós-persistência (`id`, `created_at`/`updated_at`, `waste_category_id` uuid) que o JSON de seed pré-inserção nunca tem — não são os schemas certos para validar aqui. Usados os schemas de **criação**:
  - `companyGeneralRegistrationValidationSchema` (aplica 1:1: `identity, identity_type, company_type, business_name, corporate_name, phones, started_activity_in`)
  - `upsertCompanyAddressSchema` (endereço sem `id`/timestamps — bate 1:1 com `AddressSeed`)
  - `upsertCompanyBusinessHoursSchema` (`{ business_hours: [...] }`, sem `id` por slot — bate 1:1 com `BusinessHourSeed[]`)
  - Para `wastes`/`services`: nenhum schema exportado serve (todos exigem `waste_category_id: uuid`, que só existe depois da resolução por nome no consumidor — T15). Validado via asserts de regra de negócio: nomes não duplicados, `price >= 0`, `quantity > 0`, `unit` ∈ `measurementSchema`, `waste_category_name` não-vazio.
- [x] **Bug real encontrado e corrigido**: a validação real contra `upsertCompanyAddressSchema` rejeitou o endereço com `latitude`/`longitude: null` — o schema exige `number` obrigatório. Corrigido em T4 (`address-parser.ts` agora usa `ctx.center` como fallback; `AddressSeed.latitude`/`longitude` deixaram de ser nullable)
- [x] `npm run test -- company-seed-mapper` passa (4 testes, cobrindo COMPANY/GOVERNMENT-ecoponto/COLLECTOR/fallback de nome)
