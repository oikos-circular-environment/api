# T2 — Relocar `AddressSeed` e `fake-phone.ts` para `shared/`

**Status:** ⬜ Pendente
**Depende de:** T1
**Arquivos:** `cli/shared/entities/address-seed.ts`, `cli/shared/services/fake-phone.ts`

## Checklist

- [ ] Extrair `AddressSeed` de `cli/companies/entities/company-seed.ts` para `cli/shared/entities/address-seed.ts` (shape idêntico, sem mudança de campos)
- [ ] `company-seed.ts` passa a importar `AddressSeed` de `../../shared/entities/address-seed.js`
- [ ] `git mv cli/companies/services/fake-phone.ts cli/shared/services/fake-phone.ts`
- [ ] Ajustar imports em todos os consumidores atuais de `fake-phone.ts`: `company-gap-filler.ts`, `company-seed-repairer.ts`, `synthetic-company-generator.ts`
- [ ] Specs existentes desses três arquivos continuam passando sem alteração de asserção (só o import muda)
