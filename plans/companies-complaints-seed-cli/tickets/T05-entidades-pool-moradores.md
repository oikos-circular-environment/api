# T5 — Entidades do pool de moradores (`CityResidentSeed`)

**Status:** ⬜ Pendente
**Depende de:** T1, T2
**Arquivos:** `cli/shared/entities/city-resident.ts`

## Checklist

- [ ] `CityResidentSeed { full_name, display_name, phone, email, address: AddressSeed }`
- [ ] `CityResidentsFileMeta { generated_at, total, city, state_code }`
- [ ] `CityResidentsFile { _meta: CityResidentsFileMeta, residents: CityResidentSeed[] }`
- [ ] Import de `AddressSeed` de `./address-seed.js`
- [ ] Nenhuma lógica neste arquivo — só tipos, mesmo padrão de `entities/company-seed.ts`
