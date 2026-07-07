# T12 — Use-cases de resolução de cidade e busca de empresas

**Status:** ✅ Concluído
**Depende de:** T2, T9
**Arquivos:** `use-cases/resolve-city-use-case.ts` (+spec), `use-cases/fetch-city-companies-use-case.ts` (+spec)

## Checklist

- [x] `class ResolveCityUseCase(municipioProvider, geocodingProvider)` — reutiliza `resolveMunicipio`/`getUf` de `providers/ibge-municipio-provider.ts`
- [x] `class FetchCityCompaniesUseCase(placesProvider, mapper)` — dedupe por `place.id`
- [x] **Ajuste de design**: `FetchCityCompaniesUseCase` depende de uma interface `PlaceMapper` (não da classe concreta `CompanySeedMapper`) — classes com campos privados no construtor não são estruturalmente compatíveis com fakes por duck typing, então uma interface mínima foi extraída para permitir fakes em teste
- [x] Spec de `ResolveCityUseCase` com fakes/stubs de provider, sem rede real (inclui caso de match ignorando acento/caixa e caso de cidade não encontrada)
- [x] Spec de `FetchCityCompaniesUseCase` com fake `PlacesProvider` (dedupe entre múltiplas queries + array vazio)
- [x] `npm run test -- resolve-city-use-case fetch-city-companies-use-case` passa (5 testes)
