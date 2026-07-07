# T10 — Gerador de empresa sintética

**Status:** ✅ Concluído
**Depende de:** T5, T6, T7
**Arquivos:** `services/synthetic-company-generator.ts` (+spec)

## Checklist

- [x] `class SyntheticCompanyGenerator.generate(ctx)` — via `faker.helpers.weightedArrayElement`
- [x] Distribuição de `company_type` (COMPANY 55%, ONG 15%, GOVERNMENT 10%, COLLECTOR 20%) com `identity_type` coerente (CPF só para COLLECTOR)
- [x] Endereço/geo sintéticos dentro de `ctx.bounds`
- [x] Spec valida contra os mesmos schemas Zod de T9 (com a correção de rota já aplicada) + confirma distribuição plausível em 100 chamadas + geo dentro dos bounds
- [x] `npm run test -- synthetic-company-generator` passa (4 testes)
