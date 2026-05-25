# Contexto

O módulo de cadastramento de empresas por parte do usuário permite expor a empresa para o ecossistema. Deste modo é preciso expor empresas e catadores para que os demais usuários possam pesquisar sobre os pontos de coletas e empresas que efetuam de certa forma a coleta ou reciclagem dos itens que eles procuram.

## Objetivo

Fazendo um paralelo de comparação com as pesquisas realizadas no iFood, os restaurantes são listados de acordo com a localização do usuário, isso faz com que não seja necessário listar todas as empresas de cidades na qual a pessoa nem sabe que existe ou nem deseja.

Portanto, com os dados que são requisitos de preenchimento que está em Profile, é preciso fazer que a listagem baseada na geolocalização (lat, lon) e um raio (padrão: 1000 metros - 1km).

Deve haver filtro principal é a pesquisa de texto, a pesquisa de texto, deve pesquisar por nome fantasia da empresa, serviços e resíduos. A ideia é trazer uma listagem completa dos dados da empresa e seus produtos que no caso são os serviços e resíduos que eles venham a coletar.

E por último filtro de categoria "services" ou "waste".

---

## Especificações

Enquadrar isso dentro de um módulo chamado `market`:
- endpoint: `v1/market/*`

---

## Requisitos Levantados

### Endpoint

`GET v1/market` — requer autenticação JWT.

### Query Params

| Param      | Tipo   | Obrigatório | Padrão | Descrição                                                              |
|------------|--------|-------------|--------|------------------------------------------------------------------------|
| `lat`      | float  | sim         | —      | Latitude do usuário                                                    |
| `lon`      | float  | sim         | —      | Longitude do usuário                                                   |
| `radius`   | int    | não         | 1000   | Raio de busca em metros                                                |
| `q`        | string | não         | —      | Texto livre: busca por `business_name`, serviços e resíduos            |
| `category` | enum   | não         | —      | `services` ou `waste` — retorna apenas empresas com itens na categoria |
| `cursor`   | string | não         | —      | Cursor de paginação para infinite scroll                               |
| `limit`    | int    | não         | 20     | Itens por página                                                       |

### Comportamento

1. Filtra empresas por raio de distância usando PostGIS (`ST_DWithin`) diretamente no banco.
2. Ordena por distância crescente (`ST_Distance`) via SQL.
3. Aplica filtro de texto (case-insensitive) sobre `business_name`, nomes de serviços e resíduos.
4. Aplica filtro de categoria, excluindo empresas sem itens na categoria solicitada.
5. Retorna dados completos da empresa incluindo serviços, resíduos, horários e distância.
6. Paginação por offset codificado em base64 como cursor (compatível com infinite scroll).

### Dados Retornados por Empresa

`id`, `business_name`, `corporate_name`, `company_type`, `accept_appointments`, `address`, `services[]`, `wastes[]`, `business_hours[]`, `distance_in_meters`

- `business_hours[]` — horários de funcionamento para o frontend calcular se está aberta/fechada.
- `distance_in_meters` — distância já calculada pelo banco; o frontend exibe direto (ex: "Empresa X está a 2km").

### Escopo

- Apenas empresas (Companies) — catadores individuais (Profile com `is_collector=true`) fora do escopo desta fase.
- Geolocalização fornecida via query params (`lat`, `lon`) pelo cliente.

---

## Plano Técnico

### Problema & Contexto

Criação do módulo `market` — ponto de entrada para o marketplace geolocalizado da plataforma Oikos. Usuários autenticados poderão descobrir empresas de coleta e reciclagem próximas à sua localização, com suporte a busca textual, filtros por categoria e paginação para infinite scroll.

O banco não possui PostGIS habilitado. Como parte deste trabalho será ativado o PostGIS e adicionada a coluna `location geography(Point, 4326)` ao modelo `Address`, derivada de `latitude`/`longitude` já existentes. Os campos `lat`/`lon` são mantidos — a coluna `location` é preenchida pela camada de repositório sempre que lat/lon estiverem presentes, sem expor nenhuma mudança nas rotas existentes.

### Análise: PostGIS + Prisma

A documentação oficial do Prisma (https://www.prisma.io/docs/orm/prisma-schema/postgresql-extensions) aborda suporte a extensões de forma genérica. Os pontos relevantes investigados para este projeto:

**Como o Prisma lida com tipos PostGIS:**
- Campos `geography`/`geometry` não têm tipo nativo no Prisma — são declarados como `Unsupported("geography(Point, 4326)")`.
- Campos `Unsupported` são **invisíveis** para o Prisma Client gerado: não aparecem nos tipos, não podem ser selecionados nem filtrados via API do Prisma.
- Toda operação envolvendo `location` (leitura ou escrita) exige `$queryRaw` ou `$executeRaw`.

**Performance:**

| Camada | Avaliação |
|---|---|
| Banco de dados | Excelente — PostGIS com índice GIST é referência para consultas geoespaciais. `ST_DWithin` usa o índice diretamente. |
| ORM / DX | Reduzida — `$queryRaw` retorna `unknown[]`, exige mapeamento manual e perde type-safety. Mais verboso que queries Prisma padrão. |

**Conclusão:** A performance em banco é superior a qualquer alternativa sem PostGIS (bounding box + app layer). O custo é na experiência de desenvolvimento: a query do módulo `market` será em SQL raw com mapeamento manual, isolado no repositório Prisma. O restante da aplicação não é afetado.

**Ativação da extensão — via migration SQL (não via schema):**

O generator atual do projeto usa `provider = "prisma-client"` (Prisma ORM v6+), que tem comportamento diferente do `prisma-client-js` quanto a `previewFeatures`. Para garantir compatibilidade, a extensão PostGIS é ativada diretamente na migration SQL, não declarada no schema:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Abordagem Arquitetural

**Filtragem geográfica via PostGIS:**

```sql
ST_DWithin(a.location, ST_SetSRID(ST_Point($lon, $lat), 4326), $radius)
```
Usa o índice GIST — sem full table scan. Retorna apenas endereços dentro do raio.

```sql
ST_Distance(a.location, ST_SetSRID(ST_Point($lon, $lat), 4326)) AS distance_in_meters
```
Calcula a distância precisa em metros, usada para ordenação e exibição no frontend.

**Cursor de paginação — offset codificado em base64:**

Como a ordenação é por `distance_in_meters` (campo computado, não armazenado), o cursor encoda o offset em base64. Exemplo: `cursor = btoa("20")` → pula os primeiros 20 resultados. Trade-off conhecido: possíveis gaps se novas empresas entrarem no raio entre páginas — aceitável para descoberta de negócios locais.

**Isolamento do SQL raw:**

Todo o SQL espacial fica encapsulado no `MarketRepositoryPrisma`. O use-case e a route não sabem que há `$queryRaw` por baixo — interagem apenas via interface tipada `MarketRepository`.

**Sem breaking changes nas rotas existentes:**

Os repositórios de endereço de `companies` e `profiles` recebem apenas um `$executeRaw` adicional (após `create`/`update`) para setar `location` quando lat/lon estão presentes. Interfaces públicas e rotas permanecem idênticas.

### Modelo de Dados

**Adição ao schema `Address`:**

```prisma
model Address {
  // campos existentes mantidos sem alteração
  latitude  Float?
  longitude Float?
  location  Unsupported("geography(Point, 4326)")?
}
```

**Migration:**

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

> `ST_Point` recebe `(longitude, latitude)` — ordem X, Y (eixo cartesiano).

### Arquitetura de Componentes

**Novo módulo:** `src/modules/market/`

```
market/
├── market-routes.ts
├── dtos/
│   └── market-dto.ts
├── repositories/
│   ├── market-repository.ts                    # interface
│   ├── prisma/
│   │   └── market-repository-prisma.ts         # $queryRaw com PostGIS
│   └── in-memory/
│       └── in-memory-market-repository.ts      # para testes unitários
└── use-cases/
    ├── list-market-use-case.ts
    └── list-market-use-case.spec.ts
```

**Interface do repositório:**

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

**Fluxo de dados:**
`Route` → `ListMarketUseCase(repo)` → `repo.findMany(params)` → PostGIS filtra + ordena → use-case monta cursor → `{ companies, next_cursor }`

**Registro no `app.ts`:**

```typescript
app.register(marketRoutes, { prefix: "/v1" });
```

**Impacto nos arquivos existentes:**

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | Adicionar campo `location` ao modelo `Address` |
| `prisma/migrations/...` | Nova migration: PostGIS extension + coluna + índice GIST + backfill |
| `companies/repositories/prisma/addresses-repository-prisma.ts` | `create` e `update`: `$executeRaw` para setar `location` quando lat/lon presentes |
| `profiles/repositories/prisma/addresses-repository-prisma.ts` | Idem |
| `src/app.ts` | Registrar `marketRoutes` com prefix `/v1` |

### Testes Unitários

Os testes cobrem o use-case via repositório in-memory, isolando completamente o banco e o PostGIS.

**`list-market-use-case.spec.ts` — cenários planejados:**

| Cenário | Descrição |
|---|---|
| Lista empresas no raio | Retorna apenas empresas dentro do `radius` informado |
| Exclui empresas fora do raio | Empresa além do raio não aparece no resultado |
| Filtra por texto (`q`) | Busca por `business_name`, serviço ou resíduo — match retorna, no-match exclui |
| Filtra por categoria `services` | Retorna apenas empresas com ao menos 1 serviço |
| Filtra por categoria `waste` | Retorna apenas empresas com ao menos 1 resíduo |
| Retorna `distance_in_meters` | Campo presente e correto para cada empresa |
| Paginação — primeira página | `next_cursor` presente quando há mais resultados |
| Paginação — última página | `next_cursor` é `null` quando não há mais resultados |
| Empresa sem endereço | Excluída silenciosamente da listagem |
| Lista vazia | Retorna `companies: []` e `next_cursor: null` sem erro |

**Repositório in-memory (`in-memory-market-repository.ts`):**

Implementa `MarketRepository` com dados em memória. O cálculo de distância no in-memory usa a fórmula de Haversine simples (sem PostGIS) apenas para fins de teste — não é exposto ao domínio.
