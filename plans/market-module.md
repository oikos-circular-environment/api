# Contexto

O módulo de cadastramento de empresas por parte do usuário permite expor a empresa para o ecossistema. Deste modo é preciso expor empresas e catadores para que os demais usuários possam pesquisar sobre os pontos de coletas e empresas que efetuam de certa forma a coleta ou reciclagem dos itens que eles procuram.

## Objetivo

Fazendo um paralelo de comparação com as pesquisas realizadas no iFood,os restaurantes são listados de acordo com a localização do usuário, isso faz com que não seja necessário listar todas as empresas de cidades na qual a pessoa nem sabe que existe ou nem deseja. 

Portanto, com os dados que são requisitos de preenchimento que está em Profile, é preciso fazer que a listagem baseada na geolocalização (lat, lon) e um raio (padrão: 1000 metros - 1km). Tempos bibliotecas como geolib (https://github.com/manuelbieh/geolib) que pode facilitar o calculo a serem feitas, o ponto seria criar uma interface como intermediaria, pois caso mudar futuramente o código não irá estar acoplado a lib e sim a interface.

Deve haver filtro principal é a pesquisa de texto, a pesquisa de texto, deve pesquisar por nome fantasia da empresa, serviços e resíduos. A ideia é trazer uma listagem completa dos dados da empresa e seus produtos que no caso são os serviços e resíduos que eles venham a coletar. 
 
E por último filtro de categoria "services" ou "waste".

---

## Especificações

Enquadrar isso dentro de um módulo chamado `ecosystems`:
- endpoint: `v1/ecosystems/*`

---

## Requisitos Levantados

### Endpoint

`GET v1/ecosystems` — requer autenticação JWT.

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

1. Busca todas as Companies com endereço (lat/lon preenchidos).
2. Filtra pelo raio de distância via interface de geolocalização (implementada com `geolib`, mas desacoplada para troca futura).
3. Aplica filtro de texto (case-insensitive) sobre `business_name`, nomes de serviços e nomes de resíduos.
4. Aplica filtro de categoria, excluindo empresas sem itens na categoria solicitada (`services` ou `waste`).
5. Retorna dados completos da empresa incluindo lista de serviços e resíduos.
6. Paginação por cursor (compatível com infinite scroll).

### Dados Retornados por Empresa

`id`, `business_name`, `corporate_name`, `company_type`, `accept_appointments`, `address`, `services[]`, `wastes[]`, `business_hours[]`

O campo `business_hours[]` inclui os horários de funcionamento da empresa para que o frontend possa calcular e exibir se a empresa está aberta ou fechada no momento da consulta.

### Escopo

- Apenas empresas (Companies) — catadores individuais (Profile com `is_collector=true`) fora do escopo desta fase.
- Geolocalização fornecida via query params (`lat`, `lon`) pelo cliente.
