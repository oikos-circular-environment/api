# Market Module — Guia TDD

## Filosofia

A implementação segue TDD (Test-Driven Development). Os testes são escritos **antes** da implementação, especialmente para validar o comportamento de geolocalização — que é onde problemas de compatibilidade com PostGIS tendem a aparecer (SRID errado, ordem lat/lon invertida, raio em graus vs metros, etc.).

Iniciando pelos testes com repositório in-memory, validamos a lógica de negócio e a contrato da interface antes de conectar o PostGIS. Quando o repositório Prisma for implementado, os mesmos cenários de teste servem como contrato de integração.

---

## Dados de Teste

Os dados de seed em `prisma/seeds/recycling-companies.json` contêm **48 empresas reais** de Rondonópolis/MT com coordenadas GPS, horários de funcionamento, serviços e resíduos. Esses dados devem ser utilizados como base para os testes unitários.

**Ponto de referência central (centro de Rondonópolis):**
```
lat: -16.4707, lon: -54.6375
```

**Exemplos de empresas do seed com coordenadas:**

| Empresa | Latitude | Longitude | Dist. aprox. do centro |
|---|---|---|---|
| Bio Ecologica | -16.4757009 | -54.6684927 | ~3.3km |
| (demais empresas variam de ~500m a ~15km do centro) | | | |

Os testes devem importar subsets do JSON para montar cenários controlados — não usar todos os 48 registros em cada teste.

---

## Estratégia do Repositório In-Memory

O `InMemoryMarketRepository` implementa `MarketRepository` com dados em memória. O cálculo de distância usa a **fórmula de Haversine** (sem PostGIS) apenas para os testes — não é exposto ao domínio nem ao use-case.

```typescript
// Apenas no in-memory — não vaza para o domínio
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

Isso garante que o in-memory e o PostGIS produzam os mesmos resultados para as mesmas entradas, tornando a suíte de testes um **contrato verificável** da implementação Prisma.

---

## Cenários de Teste — `list-market-use-case.spec.ts`

### Setup padrão

```typescript
// Ponto de busca: centro de Rondonópolis
const ORIGIN = { lat: -16.4707, lon: -54.6375 }

// Bio Ecologica (seed) está a ~3.3km do centro
const BIO_ECOLOGICA = {
  lat: -16.4757009,
  lon: -54.6684927,
  business_name: "Bio Ecologica",
  wastes: ["Papel e Papelão", "Plástico", ...],
  services: []
}
```

### Cenários

| # | Cenário | Input | Resultado Esperado |
|---|---|---|---|
| 1 | **Lista empresas dentro do raio** | `radius: 5000` (5km) | Bio Ecologica (~3.3km) aparece |
| 2 | **Exclui empresas fora do raio** | `radius: 1000` (1km) | Bio Ecologica (~3.3km) não aparece |
| 3 | **Ordena por distância crescente** | múltiplas empresas em distâncias diferentes | retorno ordenado do mais próximo para o mais distante |
| 4 | **Filtra por texto — match em business_name** | `q: "Bio"` | retorna Bio Ecologica |
| 5 | **Filtra por texto — match em waste** | `q: "Plástico"` | retorna empresas que aceitam Plástico |
| 6 | **Filtra por texto — match em service** | `q: "coleta"` | retorna empresas com serviço contendo "coleta" |
| 7 | **Filtra por texto — sem match** | `q: "inexistente"` | retorna lista vazia |
| 8 | **Filtra por categoria `waste`** | `category: "waste"` | retorna apenas empresas com ao menos 1 resíduo |
| 9 | **Filtra por categoria `services`** | `category: "services"` | retorna apenas empresas com ao menos 1 serviço |
| 10 | **Retorna `distance_in_meters` correto** | Bio Ecologica no dataset | campo `distance_in_meters` ≈ 3300 (tolerância ±100m) |
| 11 | **Retorna `business_hours[]`** | empresa com horários no seed | campo presente e não vazio |
| 12 | **Paginação — primeira página** | `limit: 2`, 5 empresas no raio | `next_cursor` não é null |
| 13 | **Paginação — última página** | `limit: 10`, 5 empresas no raio | `next_cursor` é null |
| 14 | **Paginação — cursor navega corretamente** | página 1 com cursor → página 2 | sem duplicatas, próximas 2 empresas por distância |
| 15 | **Empresa sem endereço** | empresa sem lat/lon no dataset | excluída silenciosamente |
| 16 | **Lista vazia** | nenhuma empresa no raio | `{ companies: [], next_cursor: null }` |
| 17 | **Texto + categoria combinados** | `q: "Plástico"`, `category: "waste"` | interseção dos dois filtros |
| 18 | **Raio padrão (1000m)** | sem `radius` | aplica 1000m como default |

---

## Ordem de Implementação (TDD)

```
1. Escrever InMemoryMarketRepository (interface + Haversine)
2. Escrever list-market-use-case.spec.ts com todos os cenários — TUDO FALHANDO
3. Implementar list-market-use-case.ts até todos os testes passarem
4. Implementar market-routes.ts + market-dto.ts
5. Habilitar PostGIS (migration + schema)
6. Atualizar addresses-repository-prisma.ts (companies + profiles) para setar location
7. Implementar MarketRepositoryPrisma com $queryRaw PostGIS
8. Verificar manualmente que o comportamento do Prisma bate com os testes in-memory
```

> A etapa 7 é onde problemas de compatibilidade PostGIS costumam aparecer (ordem lat/lon, SRID, unidade do raio). Os testes in-memory servem como referência do comportamento esperado.

---

## Validação de Compatibilidade PostGIS

Após implementar o `MarketRepositoryPrisma`, executar manualmente as seguintes verificações:

```sql
-- 1. Verificar que a extensão está ativa
SELECT extname FROM pg_extension WHERE extname = 'postgis';

-- 2. Verificar que a coluna location foi criada e indexada
SELECT column_name, udt_name FROM information_schema.columns
WHERE table_name = 'addresses' AND column_name = 'location';

-- 3. Verificar backfill — todos os registros com lat/lon devem ter location
SELECT COUNT(*) FROM addresses
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;
-- Esperado: 0

-- 4. Testar query com Bio Ecologica (seed) a partir do centro de Rondonópolis
-- Deve retornar a empresa com distance_in_meters ≈ 3300
SELECT
  c.business_name,
  ST_Distance(
    a.location,
    ST_SetSRID(ST_Point(-54.6375, -16.4707), 4326)
  ) AS distance_in_meters
FROM companies c
JOIN addresses a ON a.id = c.address_id
WHERE ST_DWithin(
  a.location,
  ST_SetSRID(ST_Point(-54.6375, -16.4707), 4326),
  5000
)
ORDER BY distance_in_meters;
```
