# T6 — Gerador de moradores + `computeResidentPoolSize`

**Status:** ⬜ Pendente
**Depende de:** T5
**Arquivos:** `cli/shared/services/city-resident-generator.ts` (+spec)

## Checklist

- [ ] `CityResidentGenerator.generate(ctx: CityContext, count: number): CityResidentSeed[]` — nome/display_name via `faker.person.*`, telefone via `generateFakePhone()` (T2), endereço fabricado dentro de `ctx.bounds` (mesmo padrão de endereço sintético já usado em `synthetic-company-generator.ts`), email único dentro do array (`<slug-nome>.<index>.<city-slug>@oikos.seed`, evitando colisão entre cidades/execuções)
- [ ] `computeResidentPoolSize(opts: { companiesTarget?: number; complaintsTarget?: number }): number` — função pura exportada, `MIN_RESIDENTS_PER_CITY = 10`, `forCompanies = ceil(companiesTarget / 2)`, `forComplaints = ceil(complaintsTarget * 0.6)`, retorna o maior dos três
- [ ] Spec cobre: quantidade de moradores gerada bate com `count`; todo email é único dentro do array; toda coordenada de endereço cai dentro de `ctx.bounds`; `computeResidentPoolSize` cobre os três cenários (só companies, só complaints, ambos) e o piso mínimo
