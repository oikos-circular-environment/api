# T9 — `CompanySeed` ganha `owner_resident_index`

**Status:** ⬜ Pendente
**Depende de:** T2, T5
**Arquivos:** `cli/companies/entities/company-seed.ts`

## Checklist

- [ ] Adicionar campo `owner_resident_index: number` à interface `CompanySeed`
- [ ] Confirmar que `address: AddressSeed` já importa de `../../shared/entities/address-seed.js` (feito em T2 — aqui só validar que nada ficou duplicado)
- [ ] Nenhum service existente (`CompanySeedMapper`, `SyntheticCompanyGenerator`) precisa preencher esse campo ainda — ele é preenchido depois, pelo `CompanyOwnerAssigner` (T10/T11). Confirmar que o TypeScript não quebra silenciosamente em algum lugar que constrói um `CompanySeed` sem esse campo (deve ser erro de compilação até T11 preencher)
