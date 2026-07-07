# T15 — Gerador de geospatial sintético

**Status:** ⬜ Pendente
**Depende de:** T12
**Arquivos:** `cli/complaints/services/synthetic-geospatial-generator.ts` (+spec)

## Checklist

- [ ] `SyntheticGeospatialGenerator.generate(ctx: CityContext): Geospatial` — `location.coords.latitude/longitude` dentro de `ctx.bounds`; `heading: null`; `addresses.city/region/country/isoCountryCode/timezone` consistentes com `ctx.city`/`ctx.stateCode`/`"Brasil"`/`"BR"`/`"America/Sao_Paulo"`; demais campos de `addresses` fabricados via Faker (`district`, `streetNumber`, `street`, `postalCode`, `formattedAddress`)
- [ ] Spec importa `geospatialSchema` de `../../../src/modules/complaints/entities/complaint-entity.js` e valida (`.parse()`) todo objeto gerado em N iterações — mesma prática de reaproveitar os schemas Zod reais já usada pelo pipeline de empresas
- [ ] Spec confirma que lat/lng geradas sempre caem dentro de `ctx.bounds.low`/`ctx.bounds.high`
