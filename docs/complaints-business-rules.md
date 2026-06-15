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
