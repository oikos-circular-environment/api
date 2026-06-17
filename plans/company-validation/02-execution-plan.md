# Company Validation — Plano de Execução

---

## Ordem de Execução

### Lote 1 — Paralelo (fundação, sem dependências entre si)

| # | Ticket | Arquivos | Status |
|---|---|---|---|
| T1 | Schema Prisma + migration | `prisma/schema.prisma`<br>`prisma/migrations/20260603000001_add_company_validation/` | ✅ Concluído |
| T2 | DTOs: correções de input + novos tipos + validation schemas | `src/modules/companies/dtos/companies-dto.ts` | ✅ Concluído |

### Lote 2 — Paralelo (depende de T2)

| # | Ticket | Arquivos | Status |
|---|---|---|---|
| T3 | Validation utils | `src/modules/companies/utils/company-validation-utils.ts` | ✅ Concluído |
| T4 | Interface CompanyValidationRepository | `src/modules/companies/repositories/company-validation-repository.ts` | ✅ Concluído |

### Lote 3 — Paralelo (depende de T3 + T4)

| # | Ticket | Arquivos | Status |
|---|---|---|---|
| T5 | InMemoryCompanyValidationRepository | `src/modules/companies/repositories/in-memory/in-memory-company-validation-repository.ts` | ✅ Concluído |
| T6 | PrismaCompanyValidationRepository | `src/modules/companies/repositories/prisma/company-validation-repository-prisma.ts` | ✅ Concluído |
| T7 | Company mapper: incluir `is_company_valid` | `src/modules/companies/repositories/prisma/mappers/company-mapper.ts` | ✅ Concluído |

### Lote 4 — Sequencial (depende de T5, um use case por vez para evitar conflito)

| # | Ticket | Arquivos | Status |
|---|---|---|---|
| T8 | CreateCompanyUseCase + spec | `src/modules/companies/use-cases/create-company-use-case.ts`<br>`src/modules/companies/use-cases/create-company-use-case.spec.ts` | ✅ Concluído |
| T9 | UpdateCompanyUseCase + spec | `src/modules/companies/use-cases/update-company-use-case.ts`<br>`src/modules/companies/use-cases/update-company-use-case.spec.ts` | ✅ Concluído |
| T10 | UpsertCompanyAddressUseCase + spec | `src/modules/companies/use-cases/company-addresses/upsert-company-address-use-case.ts`<br>`src/modules/companies/use-cases/company-addresses/upsert-company-address-use-case.spec.ts` | ✅ Concluído |
| T11 | UpsertCompanyBusinessHoursUseCase + spec | `src/modules/companies/use-cases/company-business-hours/upsert-company-business-hours-use-case.ts`<br>`src/modules/companies/use-cases/company-business-hours/upsert-company-business-hours-use-case.spec.ts` | ✅ Concluído |
| T12 | UpsertCompanyWastesUseCase + spec | `src/modules/companies/use-cases/company-wastes/upsert-company-wastes-use-case.ts`<br>`src/modules/companies/use-cases/company-wastes/upsert-company-wastes-use-case.spec.ts` | ✅ Concluído |
| T13 | UpsertCompanyServicesUseCase + spec | `src/modules/companies/use-cases/company-services/upsert-company-services-use-case.ts`<br>`src/modules/companies/use-cases/company-services/upsert-company-services-use-case.spec.ts` | ✅ Concluído |

### Lote 5 — Testes de validação (depende de T3)

| # | Ticket | Arquivos | Status |
|---|---|---|---|
| T14 | Spec dos validation utils + schemas | `src/modules/companies/utils/company-validation-utils.spec.ts` | ✅ Concluído |

### Lote 6 — Integração com Market (depende de T1 + T6)

| # | Ticket | Arquivos | Status |
|---|---|---|---|
| T15 | MarketRepositoryPrisma: filtrar `is_company_valid = true` | `src/modules/market/repositories/prisma/market-repository-prisma.ts` | Pendente — próximo passo |

---

## Grafo de Dependências

```
T1 ──────────────────────────────────────────────────────→ T6 ──→ T15
T2 ──┬──→ T3 ──┬──→ T5 ──→ T8  ──→ T9 ──→ T10 ──→ T11 ──→ T12 ──→ T13
     │         └──→ T6 ──→ T7       └──→ T14
     └──→ T4 ──┘
```

---

## Notas de Implementação

- **T1 (migration)**: popular `company_validations` para empresas existentes com todos os campos `false`. Não tentar recalcular o estado real das empresas já cadastradas — isso evita complexidade na migration.
- **T2 (phones)**: `phones: z.array(z.string().min(1)).min(1)` — breaking change no schema de input. Verificar se há seeds ou factories de teste que passam `phones: []` e corrigir.
- **T2 (lat/lng)**: remover `.optional().nullable()` de `latitude` e `longitude` em `createCompanyAddressSchema`. Verificar impacto em `updateCompanyAddressSchema` (que usa `.partial()`) e em seeds/factories.
- **T5 (in-memory)**: o in-memory **não** recalcula `is_company_valid` em `Company` — apenas atualiza o campo em `CompanyValidation`. Suficiente para testar a lógica dos use cases.
- **T6 (Prisma)**: `updateField` executa dentro de `prisma.$transaction`. Usar `computeIsCompanyValid` importado dos utils.
- **T15 (Market)**: adicionar `AND c.is_company_valid = true` na query `$queryRaw` do Market. Verificar se os testes de market precisam de empresas com `is_company_valid = true` nos seeds.
