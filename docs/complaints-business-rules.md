# Regras de Negócio — Denúncias (Complaints)

## Status

Uma denúncia pode estar em três estados:

| Status     | Descrição                              |
|------------|----------------------------------------|
| `OPEN`     | Aberta, aceita votos e resoluções      |
| `RESOLVED` | Resolvida pelo quorum                  |
| `CANCELED` | Cancelada pelo dono                    |

Denúncias `RESOLVED` ou `CANCELED` são consideradas **fechadas** e não aceitam novos votos, resoluções ou alterações.

---

## Votação

- Qualquer usuário autenticado pode votar em uma denúncia aberta.
- Tipos de voto: `RESOLVED` (resolvida) ou `NOT_RESOLVED` (não resolvida).
- Cada usuário tem **no máximo 1 voto por denúncia**. Votar novamente substitui o voto anterior (upsert).
- O voto do **dono da denúncia** tem peso **2**; todos os demais têm peso **1**.

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/complaints/:id/resolved` | Registra voto `RESOLVED` |
| `DELETE` | `/complaints/:id/resolved` | Remove o próprio voto |

---

## Quorum — Resolução Automática com Janela de 24h

Após cada voto, o sistema avalia o quorum:

```
peso_positivo >= 5 + peso_negativo
```

**Quando o quorum é atingido**, um job com delay de **24 horas** é agendado via BullMQ. A denúncia permanece `OPEN` durante esse período.

**Se durante as 24h alguém votar `NOT_RESOLVED`** e o quorum deixar de ser satisfeito, o job pendente é **removido** da fila.

**Se o quorum for atingido novamente** após remoção, um novo job de 24h começa a contar do zero.

**Após as 24h**, o worker re-verifica o quorum (votos podem ter mudado) e, se ainda satisfeito, atualiza o status para `RESOLVED`.

Esse mecanismo protege contra votos errados — o usuário tem 24h para corrigir antes do fechamento definitivo.

### Exemplos

| Votos RESOLVED (peso) | Votos NOT_RESOLVED (peso) | Resultado              |
|-----------------------|---------------------------|------------------------|
| 5 (usuários normais)  | 0                         | ✅ Agenda job de 24h   |
| 5 (usuários normais)  | 1                         | ❌ Quorum não atingido |
| 6 (usuários normais)  | 1                         | ✅ Agenda job de 24h   |
| Dono (2) + 3 normais  | 0                         | ✅ Agenda job de 24h   |
| Dono (2) + 2 normais  | 0                         | ❌ Quorum não atingido |

### Infraestrutura

A fila usa **BullMQ + Redis**. O job é identificado pelo `jobId = quorum-{complaintId}`, o que garante idempotência: adicionar o mesmo job duas vezes enquanto o primeiro ainda está pendente não cria duplicata — o timer original é mantido.

---

## Resoluções

Uma resolução é um relato de como a situação foi tratada, podendo ser vinculada a uma empresa do usuário.

### Unicidade

A unicidade de uma resolução é definida pelo par **(usuário, empresa)**:

- Usuário sem empresa → no máximo **1 resolução pessoal** por denúncia
- Usuário + empresa A → 1 resolução para empresa A
- Usuário + empresa B → 1 resolução para empresa B (independente de A)
- Mesmo par `(usuário, empresa)` duas vezes → erro `422 RESOLUTION_ALREADY_EXISTS`

Um usuário pode ter **múltiplas resoluções** na mesma denúncia, uma por empresa diferente.

### Regras gerais

- Apenas denúncias `OPEN` aceitam novas resoluções ou atualizações.
- Se `company_id` for fornecido, o usuário deve ser **dono** da empresa informada (`403 COMPANY_NOT_OWNED` caso contrário).
- O campo `company_id` identifica a resolução e **não pode ser alterado** após a criação.

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/complaints/:id/resolutions` | Lista todas as resoluções da denúncia. Requer autenticação. Retorna `is_owner: boolean` em cada item — calculado no backend comparando `resolver_user_id` com o usuário autenticado (sem expor o `user_id` raw). |
| `POST` | `/complaints/:id/resolutions` | Cria uma nova resolução. Falha com `422` se o par (usuário, empresa) já existir. |
| `PATCH` | `/complaints/:id/resolutions/:resolutionId` | Atualiza a `description` de uma resolução existente. Retorna `404` se a resolução não pertencer ao usuário autenticado. |
| `DELETE` | `/complaints/:id/resolutions` | Remove todas as resoluções do usuário autenticado nesta denúncia. |

### Campo `is_owner`

O campo `is_owner` é calculado exclusivamente no backend e presente apenas no payload de resposta do `GET`. Ele indica se a resolução listada pertence ao usuário que fez a requisição, sem expor o `resolver_user_id`.

```json
{
  "resolutions": [
    {
      "id": "...",
      "description": "...",
      "is_owner": true,
      "resolver_user_profile": { ... },
      "resolver_company": null,
      "attachments": [],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

## Fluxo do Dono da Denúncia (`PATCH /complaints/:id/resolved`)

O dono da denúncia pode acionar a resolução diretamente:

1. Cria ou atualiza a própria resolução pessoal (sem empresa, descrição obrigatória).
2. Registra automaticamente um voto `RESOLVED` com peso **2**.
3. Dispara a avaliação de quorum.

Se o quorum for atingido, um job de 24h é agendado. A denúncia permanece `OPEN` até o término da janela.

---

## API Reference

> Este documento é a fonte de verdade para implementação de testes E2E no frontend.
> Um agente sem acesso ao código do backend pode usar esta seção para construir
> todos os requests necessários para cobrir os fluxos de votação e resolução.

### Autenticação

Todos os endpoints abaixo exigem Bearer token JWT no header:

```
Authorization: Bearer <token>
```

**Formato de erro padrão:**

```json
{ "message": "string", "code": "SNAKE_UPPER_CASE", "statusCode": 400 }
```

---

### Votação

#### GET /v1/complaints/:id/votes

Retorna o voto do usuário autenticado nesta denúncia, ou `null` se ainda não votou.

**Response 200:**
```json
{
  "vote": {
    "id": "uuid",
    "complaint_id": "uuid",
    "user_id": "uuid",
    "vote_type": "RESOLVED | NOT_RESOLVED",
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}
```
*(O campo `vote` é `null` quando o usuário não possui voto registrado.)*

---

#### POST /v1/complaints/:id/votes

Registra ou substitui o voto do usuário (upsert — um único voto por usuário por denúncia).

**Body:**
```json
{ "vote_type": "RESOLVED | NOT_RESOLVED" }
```

**Response 200:**
```json
{
  "vote": {
    "id": "uuid",
    "complaint_id": "uuid",
    "user_id": "uuid",
    "vote_type": "RESOLVED | NOT_RESOLVED",
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}
```

| Status | Code | Condição |
|--------|------|----------|
| 404 | `COMPLAINT_NOT_FOUND` | Denúncia não existe |
| 422 | `COMPLAINT_CLOSED` | Denúncia está `RESOLVED` ou `CANCELED` |

---

#### DELETE /v1/complaints/:id/votes

Remove o voto do usuário autenticado.

**Response:** `204 No Content`

---

### Resoluções

#### GET /v1/complaints/:id/resolutions

Lista todas as resoluções da denúncia. O campo `is_owner` é calculado no backend — `true` quando a resolução pertence ao usuário autenticado.

**Response 200:**
```json
{
  "resolutions": [
    {
      "id": "uuid",
      "description": "string",
      "company_id": "uuid | null",
      "is_owner": true,
      "resolver_user_profile": {
        "type": "profile",
        "full_name": "string",
        "display_name": "string",
        "avatar_url": "string | null"
      },
      "resolver_company": {
        "type": "company",
        "corporate_name": "string",
        "business_name": "string",
        "avatar_url": "string | null"
      },
      "attachments": [
        { "id": "uuid", "url": "string", "file_name": "string", "created_at": "ISO8601" }
      ],
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ]
}
```

*(`resolver_company` é `null` quando a resolução é pessoal, sem empresa vinculada.)*

---

#### POST /v1/complaints/:id/resolutions

Cria uma resolução. Unicidade definida pelo par **(usuário, empresa)**: um usuário pode ter múltiplas resoluções na mesma denúncia, uma por empresa diferente; mas não pode repetir o mesmo par.

**Body:**
```json
{ "description": "string (min 1 char)", "company_id": "uuid (opcional)" }
```

**Response:** `204 No Content`

| Status | Code | Condição |
|--------|------|----------|
| 403 | `COMPANY_NOT_OWNED` | `company_id` pertence a outro usuário |
| 404 | `COMPLAINT_NOT_FOUND` | Denúncia não existe |
| 422 | `COMPLAINT_CLOSED` | Denúncia está `RESOLVED` ou `CANCELED` |
| 422 | `RESOLUTION_ALREADY_EXISTS` | Par (usuário, empresa) já tem resolução nesta denúncia |

---

#### PATCH /v1/complaints/:id/resolutions/:resolutionId

Atualiza a `description` de uma resolução própria. Apenas o autor pode editar.

**Body:**
```json
{ "description": "string (min 1 char)" }
```

**Response:** `204 No Content`

| Status | Code | Condição |
|--------|------|----------|
| 404 | `COMPLAINT_NOT_FOUND` | Denúncia não existe |
| 404 | `RESOLUTION_NOT_FOUND` | Resolução não existe ou pertence a outro usuário |
| 422 | `COMPLAINT_CLOSED` | Denúncia está `RESOLVED` ou `CANCELED` |

---

#### DELETE /v1/complaints/:id/resolutions

Remove todas as resoluções do usuário autenticado nesta denúncia.

**Response:** `204 No Content`

| Status | Code | Condição |
|--------|------|----------|
| 404 | `COMPLAINT_NOT_FOUND` | Denúncia não existe |
| 404 | `RESOLUTION_NOT_FOUND` | Usuário não tem resolução nesta denúncia |
| 422 | `COMPLAINT_CLOSED` | Denúncia está `RESOLVED` ou `CANCELED` |

---

### Fluxo do dono: PATCH /v1/complaints/:id/resolved

Exclusivo para o **dono da denúncia**. Em um único request:
1. Cria ou atualiza a resolução pessoal do dono (sem empresa)
2. Registra automaticamente voto `RESOLVED` com peso 2
3. Dispara avaliação de quorum via BullMQ

**Body:**
```json
{ "description": "string (min 1 char)", "company_id": "uuid (opcional)" }
```

**Response 200:**
```json
{
  "complaint": {
    "id": "uuid",
    "status": "OPEN | RESOLVED | CANCELED",
    "date": "ISO8601",
    "observations": "string | null",
    "geospatial": { ... },
    "attachments": [ ... ],
    "categories": [ { "id": "uuid", "name": "string", "hazard_levels": ["LOW | MEDIUM | HIGH | VERY_HIGH"] } ],
    "vote_counts": { "resolved": 0, "not_resolved": 0 },
    "resolution_count": 0,
    "created_at": "ISO8601"
  }
}
```

> **Atenção:** o campo `status` na response pode continuar `"OPEN"` mesmo após chamada bem-sucedida.
> A mudança para `"RESOLVED"` só acontece após a janela de 24h de quorum ser confirmada pelo worker.

| Status | Code | Condição |
|--------|------|----------|
| 404 | `COMPLAINT_NOT_FOUND` | Denúncia não existe |
| 422 | `COMPLAINT_CLOSED` | Denúncia já está fechada |

---

### Cenários críticos para testes E2E no frontend

| # | Cenário | Endpoint | Comportamento esperado |
|---|---------|----------|----------------------|
| 1 | Votação básica | POST /votes | `vote_type: "RESOLVED"` → 200 com objeto `vote` |
| 2 | Upsert de voto | POST /votes (2×) | Segundo voto substitui o primeiro; GET retorna apenas 1 voto |
| 3 | Remover voto | DELETE /votes | 204; GET /votes retorna `vote: null` |
| 4 | Voto em denúncia fechada | POST /votes | 422 `COMPLAINT_CLOSED` para status `RESOLVED` ou `CANCELED` |
| 5 | Resolução pessoal | POST /resolutions (sem company_id) | 204; GET lista a resolução com `is_owner: true` |
| 6 | Duplicidade de resolução | POST /resolutions (2× sem company_id) | Segunda tentativa → 422 `RESOLUTION_ALREADY_EXISTS` |
| 7 | Resolução com empresa própria | POST /resolutions com company_id válido | 204 |
| 8 | Resolução com empresa de terceiro | POST /resolutions com company_id alheio | 403 `COMPANY_NOT_OWNED` |
| 9 | Fluxo do dono | PATCH /resolved | 200; `status` pode ser `"OPEN"` (quorum 24h pendente) |
| 10 | `is_owner` no GET resolutions | GET /resolutions | Resolução do requester tem `is_owner: true`; as demais `false` |
