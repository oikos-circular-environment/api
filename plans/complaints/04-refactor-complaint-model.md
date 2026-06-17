# Refatoração do Modelo Complaint

## Contexto e Objetivo

Simplificar o modelo de denúncia para refletir o escopo real da aplicação: **mapeamento de descarte irregular de resíduos**. A comunidade (usuários) é o agente de resolução via quorum de votos — não há órgão validado. O usuário identifica resíduos presentes no local ao denunciar.

---

## Mudanças no Schema (Prisma)

### 1. Remover `ComplaintType` completamente
- Enum `ComplaintType` removido do schema
- Campo `type` removido do model `Complaint`
- Impacto de migração: drop da coluna `type` e do enum

### 2. Simplificar `ComplaintStatus`
- Remover `IN_PROGRESS` e `REJECTED`
- Manter apenas: `OPEN | RESOLVED | CANCELED`
- Impacto de migração: registros existentes com `IN_PROGRESS` ou `REJECTED` precisam ser migrados
  - `IN_PROGRESS` → `OPEN`
  - `REJECTED` → `CANCELED`

### 3. Nova relação M2M: `Complaint` ↔ `WasteCategory`
- Novo model `ComplaintWasteCategory` (join table)
- `Complaint` passa a ter `waste_categories ComplaintWasteCategory[]`
- `WasteCategory` passa a ter `complaints ComplaintWasteCategory[]`
- Mínimo de 1 categoria obrigatória ao criar denúncia

```prisma
model ComplaintWasteCategory {
  complaint_id      String
  waste_category_id String

  complaint      Complaint     @relation(fields: [complaint_id], references: [id], onDelete: Cascade)
  waste_category WasteCategory @relation(fields: [waste_category_id], references: [id], onDelete: Restrict)

  @@id([complaint_id, waste_category_id])
  @@map("complaint_waste_categories")
}
```

---

## Mapa de Impacto por Arquivo

| Arquivo | Tipo de mudança |
|---|---|
| `prisma/schema.prisma` | Remove enum `ComplaintType`, campo `type`, statuses `IN_PROGRESS`/`REJECTED`, adiciona `ComplaintWasteCategory` |
| `dtos/complaints-dto.ts` | Remove `complaintTypeSchema`, atualiza `complaintStatusSchema`, remove `type` de todos os schemas, adiciona `waste_category_ids` no create/update, adiciona `categories` nos schemas de retorno, remove `pending`/`rejected` do `complaintResumeSchema` |
| `repositories/complaints-repository.ts` | Atualiza assinaturas (remove `ComplaintType`, `CreateComplaint` carrega `waste_category_ids`) |
| `repositories/prisma/complaints-repository-prisma.ts` | Remove filtro por `type`, inclui `waste_categories` nos selects, refaz `getDashboardByUserId` sem `pending`/`rejected`, cria relação M2M no `createForUser` |
| `repositories/in-memory/in-memory-complaints-repository.ts` | Remove `IN_PROGRESS`/`REJECTED` do count, adiciona `categories` ao modelo interno |
| `use-cases/create-complaint-use-case.ts` | Propaga `waste_category_ids` |
| `use-cases/update-complaint-use-case.ts` | Remove `type` do input |
| `use-cases/get-complaints-use-case.ts` | Remove filtro por `type` |
| `use-cases/get-map-complaints-use-case.ts` | Remove filtro por `type` |
| `complaint-routes.ts` | Remove param `type` das rotas de criação, update e filtros |
| Todos os `*.spec.ts` e `*.integration.spec.ts` | Remove `type` dos fixtures, remove assertions em `IN_PROGRESS`/`REJECTED`, adiciona `waste_category_ids` onde necessário |

---

## Ordem de Execução

```
1. prisma/schema.prisma
   └── migration (renomear statuses conflitantes + nova tabela)

2. dtos/complaints-dto.ts
   └── base de tipos para tudo abaixo

3. repositories/complaints-repository.ts (interface)

4. repositories/prisma/complaints-repository-prisma.ts
   repositories/in-memory/in-memory-complaints-repository.ts
   (podem ser feitos em paralelo)

5. use-cases/* (todos impactados)

6. complaint-routes.ts

7. *.spec.ts / *.integration.spec.ts
```

---

## Pontos de Atenção

- **`quorum-logic.ts`** — sem impacto, já usa apenas `OPEN` e `RESOLVED`
- **`cancel-complaint-use-case.ts`** — sem impacto, já usa `CANCELED`
- **`getDashboardByUserId`** — o campo `pending` no DTO público precisa ser removido; o frontend que consome isso precisará de ajuste
- **`updateComplaintSchema`** — o `refine` que valida "ao menos um campo" precisa ser revisado após remover `type`; com apenas `date`, `observations` e `geospatial` restando, a lógica continua válida mas deve ser conferida
- **Categorias no retorno** — shape sugerido para os DTOs de saída: `{ id, name, hazard_levels }[]` — o suficiente para o front renderizar ícones/badges de periculosidade
