# Company Validation — Plano Técnico

---

## 1. Prisma Schema

### Mudanças em `Company`
```prisma
model Company {
  // ... campos existentes ...
  is_company_valid Boolean           @default(false)
  validation       CompanyValidation?
}
```

### Novo model `CompanyValidation`
```prisma
model CompanyValidation {
  id                   String  @id @default(uuid())
  general_registration Boolean @default(false)
  address              Boolean @default(false)
  business_hours       Boolean @default(false)
  wastes               Boolean @default(false)
  services             Boolean @default(false)

  company_id String  @unique
  company    Company @relation(fields: [company_id], references: [id], onDelete: Cascade)

  @@map("company_validations")
}
```

### Migration
- Arquivo: `prisma/migrations/20260603000001_add_company_validation/migration.sql`
- Adiciona coluna `is_company_valid BOOLEAN DEFAULT false` em `companies`
- Cria tabela `company_validations`
- Popula um registro em `company_validations` para cada empresa existente (todos os campos `false`)

---

## 2. DTOs (`companies-dto.ts`)

### Correções nos schemas de input

```typescript
// phones: ao menos 1 telefone obrigatório
phones: z.array(z.string().min(1, "Phone is required")).min(1, "At least one phone is required"),

// latitude/longitude: obrigatórios no createCompanyAddressSchema
latitude: z.number(),
longitude: z.number(),
```

### Novos tipos

```typescript
export type CompanyValidationField =
  | 'general_registration'
  | 'address'
  | 'business_hours'
  | 'wastes'
  | 'services';

export const companyValidationSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  general_registration: z.boolean(),
  address: z.boolean(),
  business_hours: z.boolean(),
  wastes: z.boolean(),
  services: z.boolean(),
});

export type CompanyValidation = z.infer<typeof companyValidationSchema>;
```

### Atualização em `companySchema`

```typescript
export const companySchema = createCompanyInputSchema.extend({
  id: z.string(),
  is_company_valid: z.boolean(),
  avatar: z.object({ ... }).nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});
```

### Validation schemas (derivados dos existentes)

```typescript
// general_registration: pick dos campos obrigatórios + phones.min(1) já garantido pelo schema corrigido
export const companyGeneralRegistrationValidationSchema = companySchema
  .pick({
    identity: true,
    identity_type: true,
    company_type: true,
    business_name: true,
    corporate_name: true,
    phones: true,
    started_activity_in: true,
  })
  .extend({
    phones: z.array(z.string()).min(1),
  });

// address: lat/lng obrigatórios (não nullable)
export const companyAddressValidationSchema = companyAddressSchema.extend({
  latitude: z.number(),
  longitude: z.number(),
});

// business_hours: ao menos 1 dia aberto com time_slot
export const companyBusinessHoursValidationSchema = z
  .array(businessHourSchema)
  .refine(
    (hours) => hours.some((h) => h.is_open && h.time_slots.length > 0),
    { message: "At least one open day with a time slot is required" },
  );

// wastes e services: ao menos 1 item
export const companyWastesValidationSchema = z.array(companyWasteSchema).min(1);
export const companyServicesValidationSchema = z.array(companyServiceSchema).min(1);
```

---

## 3. Validation Utils (`utils/company-validation-utils.ts`)

Wrappers finos sobre os validation schemas. Recebem os dados já persistidos (domain types).

```typescript
import type { Company, CompanyAddress, BusinessHour, CompanyWaste, CompanyService, CompanyValidation } from '../dtos/companies-dto.js';
import {
  companyGeneralRegistrationValidationSchema,
  companyAddressValidationSchema,
  companyBusinessHoursValidationSchema,
  companyWastesValidationSchema,
  companyServicesValidationSchema,
} from '../dtos/companies-dto.js';

export function isGeneralRegistrationValid(data: Company): boolean {
  return companyGeneralRegistrationValidationSchema.safeParse(data).success;
}

export function isAddressValid(data: CompanyAddress | null): boolean {
  if (!data) return false;
  return companyAddressValidationSchema.safeParse(data).success;
}

export function isBusinessHoursValid(data: BusinessHour[]): boolean {
  return companyBusinessHoursValidationSchema.safeParse(data).success;
}

export function isWastesValid(data: CompanyWaste[]): boolean {
  return companyWastesValidationSchema.safeParse(data).success;
}

export function isServicesValid(data: CompanyService[]): boolean {
  return companyServicesValidationSchema.safeParse(data).success;
}

export function computeIsCompanyValid(v: CompanyValidation): boolean {
  return (
    v.general_registration &&
    v.address &&
    v.business_hours &&
    (v.wastes || v.services)
  );
}
```

---

## 4. Repository Interface (`repositories/company-validation-repository.ts`)

```typescript
import type { CompanyValidation, CompanyValidationField } from '../dtos/companies-dto.js';

export interface CompanyValidationRepository {
  create(companyId: string, generalRegistration: boolean): Promise<CompanyValidation>;
  updateField(companyId: string, field: CompanyValidationField, value: boolean): Promise<void>;
  findByCompanyId(companyId: string): Promise<CompanyValidation | null>;
}
```

---

## 5. In-Memory Repository (`repositories/in-memory/in-memory-company-validation-repository.ts`)

- Armazena `CompanyValidation[]` em memória
- `create`: push novo registro com `general_registration` recebido, restantes `false`
- `updateField`: encontra pelo `company_id`, atualiza o campo, **não** precisa recalcular `is_company_valid` no in-memory (não tem acesso a `Company` em memória — cada repositório é independente)
- `findByCompanyId`: find simples

> Nota: o recálculo de `is_company_valid` em `Company` é responsabilidade do repositório Prisma, dentro de uma transação. O in-memory omite isso por simplicidade — é suficiente para testar os use cases.

---

## 6. Prisma Repository (`repositories/prisma/company-validation-repository-prisma.ts`)

```typescript
async updateField(companyId: string, field: CompanyValidationField, value: boolean): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Atualiza o campo específico
    const updated = await tx.companyValidation.update({
      where: { company_id: companyId },
      data: { [field]: value },
    });

    // 2. Recalcula is_company_valid
    const isValid = computeIsCompanyValid(updated);

    // 3. Persiste em Company
    await tx.company.update({
      where: { id: companyId },
      data: { is_company_valid: isValid },
    });
  });
}
```

---

## 7. Atualização dos Use Cases

Cada use case recebe `CompanyValidationRepository` como dependência extra no construtor.

### `CreateCompanyUseCase`
```typescript
const company = await this.companiesRepository.create({ ...data, user_id: userId });
await this.validationRepository.create(company.id, isGeneralRegistrationValid(company));
return company;
```

### `UpdateCompanyUseCase`
```typescript
const company = await this.companiesRepository.update(companyId, data);
if (company) {
  await this.validationRepository.updateField(
    company.id,
    'general_registration',
    isGeneralRegistrationValid(company),
  );
}
return company;
```

### `UpsertCompanyAddressUseCase`
```typescript
const address = await this.addressesRepository.upsert(...);
await this.validationRepository.updateField(
  companyId,
  'address',
  isAddressValid(address),
);
return address;
```

### `UpsertCompanyBusinessHoursUseCase`
```typescript
const hours = await this.businessHoursRepository.upsertMany(...);
await this.validationRepository.updateField(
  companyId,
  'business_hours',
  isBusinessHoursValid(hours),
);
return hours;
```

### `UpsertCompanyWastesUseCase`
```typescript
const wastes = await this.wastesRepository.replaceMany(...);
await this.validationRepository.updateField(companyId, 'wastes', isWastesValid(wastes));
return wastes;
```

### `UpsertCompanyServicesUseCase`
```typescript
const services = await this.servicesRepository.replaceMany(...);
await this.validationRepository.updateField(companyId, 'services', isServicesValid(services));
return services;
```

---

## 8. Company Mapper (`repositories/prisma/mappers/company-mapper.ts`)

Incluir `is_company_valid` no mapeamento do model Prisma para o domain type `Company`.

---

## 9. Testes

### Novos arquivos
- `utils/company-validation-utils.spec.ts` — testa os validation schemas diretamente

### Arquivos existentes a atualizar

Todos os `.spec.ts` que instanciam use cases com `validationRepository`:

| Arquivo | O que muda |
|---|---|
| `create-company-use-case.spec.ts` | Injetar `InMemoryCompanyValidationRepository`; verificar que `CompanyValidation` é criada com `general_registration: true` |
| `update-company-use-case.spec.ts` | Injetar; testar que `general_registration` muda para `false` quando `phones: []` |
| `upsert-company-address-use-case.spec.ts` | Injetar; testar `address: true` com lat/lng e `false` sem lat/lng |
| `upsert-company-business-hours-use-case.spec.ts` | Injetar; testar transição `business_hours: true/false` |
| `upsert-company-wastes-use-case.spec.ts` | Injetar; testar `wastes: true` com itens e `false` com array vazio |
| `upsert-company-services-use-case.spec.ts` | Injetar; testar `services: true` com itens e `false` com array vazio |

### Cenários críticos a cobrir

- Empresa recém-criada: `general_registration: true`, restantes `false`, `is_company_valid: false`
- Endereço salvo sem lat/lng: `address: false`
- Endereço salvo com lat/lng: `address: true`
- Business hours: todos fechados → `false`; um dia aberto sem slot → `false`; um dia aberto com slot → `true`
- Wastes com 1+ itens + services vazio → `wastes: true`, `services: false`, `is_company_valid` depende dos demais campos
- Todos os campos válidos + ao menos wastes ou services → `is_company_valid: true`
