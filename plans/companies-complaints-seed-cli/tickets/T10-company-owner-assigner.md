# T10 — Atribuidor de donos de empresa (teto de 2 por morador)

**Status:** ⬜ Pendente
**Depende de:** T9
**Arquivos:** `cli/companies/services/company-owner-assigner.ts` (+spec)

## Checklist

- [ ] `MAX_COMPANIES_PER_RESIDENT = 2` (constante nomeada, não mágica)
- [ ] `CompanyOwnerAssigner.assign(companies: CompanySeed[], residents: CityResidentSeed[]): CompanySeed[]` — round-robin sobre os índices de `residents`, nunca atribui mais de `MAX_COMPANIES_PER_RESIDENT` empresas ao mesmo índice
- [ ] Lança erro descritivo se `companies.length > residents.length * MAX_COMPANIES_PER_RESIDENT` (pool pequeno demais — sinal de dessincronia com `computeResidentPoolSize`)
- [ ] Retorna uma NOVA lista de `CompanySeed` com `owner_resident_index` preenchido (não muta o array de entrada)
- [ ] Spec cobre: distribuição respeita o teto de 2; erro lançado quando o pool é insuficiente; determinismo não é exigido (pode ser aleatório), mas a distribuição deve ser verificável estatisticamente num teste com N grande
