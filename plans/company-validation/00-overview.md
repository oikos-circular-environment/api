# Company Validation — Visão Geral

Uma empresa só pode ser listada no módulo de Market se possuir um **perfil válido**. A validade é calculada automaticamente a cada operação de criação ou atualização de dados da empresa.

---

## Tabela `CompanyValidation`

Relacionamento 1:1 com `Company`. Cada coluna é um boolean que reflete o estado atual daquele aspecto do perfil.

| Campo                | Tipo    | Regra de negócio                                                                 |
|----------------------|---------|----------------------------------------------------------------------------------|
| `general_registration` | Boolean | Dados gerais válidos (ver campos abaixo)                                         |
| `address`            | Boolean | Endereço completo, incluindo lat/lng obrigatórios                                |
| `business_hours`     | Boolean | Ao menos 1 dia com `is_open = true` e ao menos 1 slot de atendimento            |
| `wastes`             | Boolean | Ao menos 1 resíduo cadastrado                                                    |
| `services`           | Boolean | Ao menos 1 serviço cadastrado                                                    |

---

## Campo `is_company_valid` na tabela `Company`

```
is_company_valid = general_registration
               AND address
               AND business_hours
               AND (wastes OR services)
```

`wastes` e `services` são individualmente independentes — a empresa pode não oferecer serviços mas receber resíduos (ou vice-versa). Porém ao menos um dos dois deve ter itens cadastrados.

---

## Decisões de Design

### Validação com Zod (schemas dedicados)
Schemas de validação são derivados dos schemas de input já existentes. Não reutilizam o schema de input diretamente — criam variantes mais estritas que expressam as regras de negócio do perfil válido. Ficam no arquivo `companies-dto.ts`.

### Schemas de input atualizados
Duas correções nos schemas de input existentes:
- `phones`: `z.array(...).min(1)` — ao menos 1 telefone obrigatório
- `latitude` / `longitude`: removido `.optional().nullable()` — passam a ser `z.number()` obrigatórios (o frontend sempre fornece via mapa)

### Arquitetura: CompanyValidationRepository
Repositório dedicado injetado em cada use case. Responsável por:
1. Atualizar o campo booleano específico em `CompanyValidation`
2. Recalcular e persistir `is_company_valid` em `Company` (dentro de uma transação)

### Inicialização automática
Ao criar uma empresa, `CompanyValidation` é criada automaticamente com `general_registration: true` (os dados gerais acabaram de ser validados pelo schema de input) e demais campos `false`. `is_company_valid` começa como `false`.

---

## Fluxo por operação

| Operação                          | Campo atualizado       |
|-----------------------------------|------------------------|
| `CreateCompanyUseCase`            | cria `CompanyValidation` com `general_registration: true` |
| `UpdateCompanyUseCase`            | `general_registration` |
| `UpsertCompanyAddressUseCase`     | `address`              |
| `UpsertCompanyBusinessHoursUseCase` | `business_hours`     |
| `UpsertCompanyWastesUseCase`      | `wastes`               |
| `UpsertCompanyServicesUseCase`    | `services`             |

---

## Impacto no Market

O `ListMarketUseCase` filtra apenas empresas com `is_company_valid = true`. O filtro é aplicado na query do `MarketRepository` (Prisma) via `WHERE companies.is_company_valid = true`.
