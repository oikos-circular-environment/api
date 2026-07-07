# T1 — Entidades e tipos de domínio

**Status:** ✅ Concluído
**Depende de:** nada
**Arquivos:** `entities/city-context.ts`, `entities/company-seed.ts`, `entities/google-place.ts`, `entities/ibge-municipio.ts`

## Checklist

- [x] Criar `entities/city-context.ts` com `CityContext`, `LatLng`, `LatLngBounds`
- [x] Criar `entities/company-seed.ts` com `CompanySeed`, `SeedFile`, `AddressSeed`, `BusinessHourSeed`, `WasteSeed`, `ServiceSeed`
- [x] Criar `entities/google-place.ts` com `GooglePlace`, `GoogleOpeningHours`, `GooglePeriod`, `GooglePeriodTime` (portado de `fetch-recycling-places.ts`)
- [x] Criar `entities/ibge-municipio.ts` com `IbgeMunicipio`/`IbgeUf` (não previsto originalmente no arquivo único de `types.ts`, separado por clareza — shape real confirmado via chamada real à API, ver T2)
- [x] Conferir 1:1 com os campos que `prisma/seeds/recycling-companies.ts` já espera (`zip_code, street, number, complement, district, city, city_ibge_id, state, state_ibge_id, state_code, latitude, longitude` / `day_of_week, is_open, time_slots` / `name, description, price, unit, waste_category_name, quantity`)
- [x] `npx tsc --noEmit` sem erros
