# Market Module — Plano de Execução

Registro dos tickets de implementação, dependências e status de execução.

---

## Ordem de Execução

### Lote 1 — Paralelo (fundação, sem dependências)

| # | Ticket | Arquivos | Status |
|---|---|---|---|
| T1 | DTOs + interface MarketRepository | `src/modules/market/dtos/market-dto.ts`<br>`src/modules/market/repositories/market-repository.ts` | ✅ Concluído |
| T2 | Schema Prisma + migration PostGIS | `prisma/schema.prisma` (+ `location`)<br>`prisma/migrations/20260525120000_.../migration.sql` | ✅ Concluído |

### Lote 2 — Sequencial TDD (depende de T1)

| # | Ticket | Arquivos | Status |
|---|---|---|---|
| T3 | InMemoryMarketRepository + Haversine | `src/modules/market/repositories/in-memory/in-memory-market-repository.ts` | ✅ Concluído |
| T4 | Spec TDD — 18 cenários (fase red) | `src/modules/market/use-cases/list-market-use-case.spec.ts` | ✅ Concluído |
| T5 | ListMarketUseCase (fase green) | `src/modules/market/use-cases/list-market-use-case.ts` | ✅ Concluído |

### Lote 3 — Paralelo (depende de T5 + T2)

| # | Ticket | Arquivos | Status |
|---|---|---|---|
| T6 | Routes + registro no app.ts | `src/modules/market/market-routes.ts`<br>`src/app.ts` | ✅ Concluído |
| T7 | AddressRepository companies + PostGIS | `src/modules/companies/repositories/prisma/addresses-repository-prisma.ts` | ✅ Concluído |
| T8 | AddressRepository profiles + PostGIS | `src/modules/profiles/repositories/prisma/addresses-repository-prisma.ts` | ✅ Concluído |

### Lote 4 — Sequencial (depende de T5 + T7 + T8)

| # | Ticket | Arquivos | Status |
|---|---|---|---|
| T9 | MarketRepositoryPrisma com `$queryRaw` PostGIS | `src/modules/market/repositories/prisma/market-repository-prisma.ts` | ✅ Concluído |

---

## Grafo de Dependências

```
T1 ──┬──→ T3 ──→ T4 ──→ T5 ──┬──→ T6
     │                        └──→ T9
T2 ──┴──→ T7 ──────────────────────↑
     └──→ T8 ──────────────────────↑
```

---

## Notas de Implementação

- **T4 (testes TDD)**: usar dados de `prisma/seeds/recycling-companies/rondonopolis-mt.json`. Bio Ecologica (lat: -16.4757009, lon: -54.6684927) é referência a ~3.3km do centro de Rondonópolis (lat: -16.4707, lon: -54.6375).
- **T9 (Prisma PostGIS)**: `$queryRaw` retorna `unknown[]` — necessário mapeamento manual para `MarketCompany[]`. Atenção à ordem `ST_Point(longitude, latitude)`.
- **T2 (migration)**: executar `npx prisma migrate dev` ou `npx prisma migrate deploy` antes de testar T9. Requer PostgreSQL com PostGIS instalado.
