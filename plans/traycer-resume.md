## Resumo Final dos Requisitos

---

### Escopo

- **Dentro:** Denúncia Manual + Refactor do modelo de denúncias + Exposição Pública (mapa, votos, resolução)
- **Fora:** Confiabilidade de perfis/empresas, fórum/comentários, plataforma web, selo pago

---

### Refactor do Modelo de Dados (nova hierarquia)

**`Complaint`** _(novo, substitui o atual `UserComplaint`)_ — agregado raiz:
- `id`, `user_id` (dono), `status`
- `type` (`ComplaintType`) — 1 tipo por denúncia
- `complaint_method` (`AUTOMATIC | MANUAL`) — 1 método por denúncia
- `event_group_id` (uuid, nullable) — preenchido pelo worker de agrupamento
- `location` `geography(Point, 4326)` — coluna aditiva para consultas geoespaciais (índice GiST)
- `created_at`

**`ComplaintCapture`** _(novo, substitui o atual `Complaint`)_ — captura de um momento:
- `id`, `complaint_id`, `date`, `geospatial` (JSON, fonte primária para o mobile), `observations`, `created_at`

**`ComplaintAttachment`** — agora `1:N` com `ComplaintCapture`:
- Adiciona `metadata` (`Json?`) — JSON livre, validado apenas como objeto
- Mantém imutabilidade (sem delete/update após criação)

---

### Use Cases de Criação (dois caminhos)

**Automático** (mobile, ao vivo):
- Cada `ComplaintCapture` cria 1 `ComplaintAttachment`
- `geospatial` completo do `expo-location`

**Manual** (upload):
- Cada `ComplaintCapture` pode ter N `ComplaintAttachment`s
- `geospatial.heading = null`
- `geospatial.location` exige `lat`/`lon`
- `geospatial.addresses` exige `city`, `district`, `street`, `streetNumber`, `postalCode`, `region` (resto opcional)

---

### Geo & PostGIS

- Habilitar extensão PostGIS
- Nova coluna `geography(Point, 4326)` + índice GiST em `Complaint` — aditiva, derivada do `geospatial.location` (centroide das capturas)
- `geospatial.addresses` e `geospatial.location` continuam preenchidos integralmente em `ComplaintCapture` — compatibilidade total com o contrato consumido pelo frontend
- Tabela `Address` não é alterada

---

### Agrupamento por Proximidade (`event_group_id`)

- **Critérios:** raio 15m + mesmo `type` + status compatível (não agrupa com `RESOLVED` / `CANCELED` / `REJECTED`)
- Pré-processado em background (worker), disparado após a criação da denúncia

---

### Votação de Resolução

Duas ações independentes:

- **Voto** (`RESOLVED` ou `NOT_RESOLVED`) — qualquer usuário autenticado, 1 voto por usuário por denúncia, podendo alternar/remover enquanto a denúncia não estiver `RESOLVED`
- **Resolução** (`description`, `resolver` em texto livre, `attachments` opcionais, `rating` 1–5) — 1 resolução por usuário por denúncia, editável enquanto `OPEN`/`IN_PROGRESS`, não deletável

**Pesos:** dono = 2, terceiros = 1

**Fechamento:** status vira `RESOLVED` quando `peso_positivos ≥ 5 + peso_negativos`

> `NOT_RESOLVED` é apenas um tipo de voto — não é estado da denúncia

---

### Endpoint Público do Mapa

- `GET` autenticado
- Consulta por centro (`lat`, `lon`) + raio (metros) + filtros
- **Default:** `OPEN` e `IN_PROGRESS`
- **Filtros opcionais:** `type`, `status`, intervalo de data
- **Limite máximo:** 500 itens por requisição
- Autor anonimizado no retorno público

---

### Compatibilidade de Rotas

- `PATCH /complaints/:id/resolved` muda semântica: passa a registrar voto positivo do dono (peso 2) + exige submissão de uma resolução estruturada no mesmo request
- Demais rotas atuais permanecem, ajustadas ao novo modelo (`Complaint → ComplaintCapture → ComplaintAttachment`)

---

### Infra & Qualidade

**Fila assíncrona:** BullMQ + Redis (Redis novo no ambiente)

Jobs previstos:
- Cálculo de `event_group_id` por proximidade
- Transição de status ao atingir quórum de votos
- Futura extração de EXIF/metadados

**Testes:**
- Unitários por use case com repositórios in-memory (padrão atual)
- Integração para a rota do mapa público com Postgres + PostGIS reais
