# Market Module — Plano Técnico

## Problema & Contexto

Criação do módulo `market` — ponto de entrada para o marketplace geolocalizado da plataforma Oikos. O banco não possui PostGIS habilitado. Como parte deste trabalho será ativado o PostGIS e adicionada a coluna `location geography(Point, 4326)` ao modelo `Address`, derivada de `latitude`/`longitude` já existentes. Os campos `lat`/`lon` são mantidos — a coluna `location` é preenchida pela camada de repositório quando lat/lon estiverem presentes, sem expor mudanças nas rotas existentes.

---

## Análise: PostGIS + Prisma

**Referências:**
- Prisma extensions: https://www.prisma.io/docs/orm/prisma-schema/postgresql-extensions
- Supabase PostGIS guide: https://supabase.com/docs/guides/database/extensions/postgis

### Como o Prisma lida com tipos PostGIS

- Campos `geography`/`geometry` não têm tipo nativo no Prisma — declarados como `Unsupported("geography(Point, 4326)")`.
- Campos `Unsupported` são **invisíveis** para o Prisma Client: não aparecem nos tipos gerados, não podem ser selecionados nem filtrados via API Prisma.
- Toda operação envolvendo `location` exige `$queryRaw` ou `$executeRaw`.

### Performance

| Camada | Avaliação |
|---|---|
| Banco de dados | Excelente — PostGIS com índice GIST é referência para geo queries. `ST_DWithin` usa o índice sem full table scan. |
| ORM / DX | Reduzida — `$queryRaw` retorna `unknown[]`, exige mapeamento manual e perde type-safety gerada pelo Prisma. |

**Conclusão:** Performance em banco superior a qualquer alternativa sem PostGIS. O custo é de DX: a query do módulo `market` é SQL raw com mapeamento manual, isolado no repositório — o restante da aplicação não é afetado.

### Compatibilidade entre provedores

A extensão PostGIS deve funcionar de forma idêntica em qualquer provedor PostgreSQL (local, AWS RDS, Supabase), com uma diferença de convenção:

| Provedor | Prefixo das funções | Observação |
|---|---|---|
| PostgreSQL padrão / RDS | Sem prefixo: `ST_DWithin(...)` | Funções em `public` schema |
| Supabase | `extensions.ST_DWithin(...)` | PostGIS instalado no schema `extensions` |

**Solução para portabilidade:** usar funções sem prefixo + garantir que o `search_path` inclua o schema onde PostGIS está instalado. No Supabase, `search_path` já inclui `extensions` por padrão, então as chamadas sem prefixo funcionam. Em ambiente local e RDS, PostGIS fica no schema `public` — também sem prefixo.

> A documentação do Supabase usa o operador `<->` (KNN) para ordenação por distância. Para este projeto foi escolhido `ST_Distance` por ser mais explícito e compatível com qualquer provedor sem configuração adicional.

### Ativação da extensão — via migration SQL

O generator do projeto usa `provider = "prisma-client"` (Prisma v6+). Para garantir compatibilidade, a extensão é ativada na migration SQL diretamente, não declarada no schema:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

## Abordagem Arquitetural

### Filtragem geográfica via PostGIS

```sql
-- Filtro por raio (usa índice GIST)
ST_DWithin(
  a.location,
  ST_SetSRID(ST_Point($lon, $lat), 4326),
  $radius
)

-- Distância em metros para ordenação e retorno ao frontend
ST_Distance(
  a.location,
  ST_SetSRID(ST_Point($lon, $lat), 4326)
) AS distance_in_meters
```

> `ST_Point` recebe `(longitude, latitude)` — ordem X, Y (eixo cartesiano).

### Cursor de paginação — offset codificado em base64

Como a ordenação é por `distance_in_meters` (campo computado, não armazenado), o cursor encoda o offset em base64:

- `cursor = btoa("20")` → pula os primeiros 20 resultados
- `cursor = null` → não há mais páginas

**Trade-off documentado:** possíveis gaps se empresas entrarem/saírem do raio entre requisições de páginas subsequentes. Aceitável para o caso de uso de descoberta local.

### Isolamento do SQL raw

Todo o SQL espacial fica encapsulado no `MarketRepositoryPrisma`. O use-case e a route interagem apenas via interface tipada `MarketRepository` — não sabem da existência de `$queryRaw`.

### Sem breaking changes nas rotas existentes

Os repositórios de endereço de `companies` e `profiles` recebem apenas um `$executeRaw` adicional (após `create`/`update`) para setar `location` quando lat/lon estão presentes. Interfaces públicas e rotas permanecem idênticas.

---

## Modelo de Dados

### Adição ao schema `Address`

```prisma
model Address {
  // todos os campos existentes mantidos sem alteração
  latitude  Float?
  longitude Float?
  location  Unsupported("geography(Point, 4326)")?
}
```

### Migration

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "addresses"
  ADD COLUMN "location" geography(Point, 4326);

CREATE INDEX "addresses_location_gist_idx"
  ON "addresses" USING GIST ("location");

-- Backfill dos registros existentes
UPDATE "addresses"
SET "location" = ST_SetSRID(ST_Point("longitude", "latitude"), 4326)
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
```

---

## Arquitetura de Componentes

### Estrutura do módulo

```
src/modules/market/
├── market-routes.ts
├── dtos/
│   └── market-dto.ts
├── repositories/
│   ├── market-repository.ts                    # interface
│   ├── prisma/
│   │   └── market-repository-prisma.ts         # $queryRaw com PostGIS
│   └── in-memory/
│       └── in-memory-market-repository.ts      # testes (Haversine)
└── use-cases/
    ├── list-market-use-case.ts
    └── list-market-use-case.spec.ts
```

### Interface do repositório

```typescript
interface MarketRepository {
  findMany(params: {
    lat: number
    lon: number
    radius: number
    q?: string
    category?: 'services' | 'waste'
    offset: number
    limit: number
  }): Promise<{ companies: MarketCompany[]; total: number }>
}
```

### Fluxo de dados

```
Route
  → ListMarketUseCase(repo)
    → repo.findMany(params)        # PostGIS filtra + ordena + calcula distância
  ← { companies[], total }
  → monta next_cursor (base64 offset)
← { companies[], next_cursor }
```

### Registro no app.ts

```typescript
app.register(marketRoutes, { prefix: "/v1" });
```

---

## Impacto nos Arquivos Existentes

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | Adicionar campo `location` ao modelo `Address` |
| `prisma/migrations/...` | Nova migration: extensão PostGIS + coluna + índice GIST + backfill |
| `companies/repositories/prisma/addresses-repository-prisma.ts` | `create` e `update`: `$executeRaw` para setar `location` quando lat/lon presentes |
| `profiles/repositories/prisma/addresses-repository-prisma.ts` | Idem |
| `src/app.ts` | Registrar `marketRoutes` com prefix `/v1` |
