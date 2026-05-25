# Market Module — Overview

## Contexto

O módulo de cadastramento de empresas por parte do usuário permite expor a empresa para o ecossistema. Deste modo é preciso expor empresas para que os demais usuários possam pesquisar sobre os pontos de coletas e empresas que efetuam de certa forma a coleta ou reciclagem dos itens que eles procuram.

## Objetivo

Fazendo um paralelo com o iFood, restaurantes são listados de acordo com a localização do usuário — não é necessário exibir empresas de cidades que a pessoa não conhece nem deseja. O módulo `market` traz o mesmo conceito para o ecossistema circular: listagem geolocalizada de empresas de coleta e reciclagem próximas ao usuário.

## Especificações

- Módulo: `market`
- Endpoint base: `v1/market/*`

---

## Requisitos

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

| Campo               | Descrição                                                              |
|---------------------|------------------------------------------------------------------------|
| `id`                | Identificador da empresa                                               |
| `business_name`     | Nome fantasia                                                          |
| `corporate_name`    | Razão social                                                           |
| `company_type`      | Tipo: `ONG`, `COMPANY`, `GOVERNMENT`, `COLLECTOR`                     |
| `accept_appointments` | Se aceita agendamentos                                               |
| `address`           | Endereço completo                                                      |
| `services[]`        | Lista de serviços cadastrados                                          |
| `wastes[]`          | Lista de resíduos aceitos                                              |
| `business_hours[]`  | Horários de funcionamento (frontend calcula aberto/fechado)           |
| `distance_in_meters`| Distância calculada pelo banco — exibir direto (ex: "a 2km")          |

### Escopo desta fase

- Apenas empresas (`Company`) — catadores individuais (`Profile.is_collector = true`) fora do escopo.
- Geolocalização fornecida via query params pelo cliente (não usa endereço do perfil autenticado).
