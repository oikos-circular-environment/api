# Plano: Testes e2e para endpoints de resolução

## Context

O arquivo `complaint-routes.e2e.spec.ts` já cobre `POST /complaints/:id/votes` (7 testes) e `POST /complaints/:id/resolutions` (5 testes). Três endpoints de resolução não têm nenhuma cobertura e2e:

- `GET /v1/complaints/:id/resolutions`
- `PATCH /v1/complaints/:id/resolutions/:resolutionId`
- `DELETE /v1/complaints/:id/resolutions`

Os endpoints de attachment (`POST/DELETE .../attachments`) dependem de storage (MinIO) e estão fora do escopo.

## Arquivo a modificar

`src/modules/complaints/complaint-routes.e2e.spec.ts`

## Helper a adicionar

Dentro do `describe` principal, ao lado dos helpers existentes:

```typescript
async function createResolution(
  resolverId: string,
  complaintId: string,
  description = "Resolution description",
): Promise<string> {
  const resolution = await prisma.complaintResolution.create({
    data: { complaint_id: complaintId, resolver_user_id: resolverId, description },
  });
  return resolution.id;
}
```

> `ComplaintResolution` tem `onDelete: Cascade` em `complaint_id`, portanto as resoluções são deletadas automaticamente junto com o complaint no `afterEach` — sem necessidade de rastrear IDs separadamente.

## Casos de teste

### `GET /v1/complaints/:id/resolutions` — 3 testes

| Status | Caso |
|--------|------|
| `200`  | Retorna array vazio quando não há resoluções |
| `200`  | Retorna resolução com shape correto: `id`, `description`, `is_owner`, `resolver_user_profile`, `resolver_company`, `attachments`, `company_id`, `created_at`, `updated_at`; `is_owner: true` para o próprio resolvedor |
| `401`  | Token ausente |

### `PATCH /v1/complaints/:id/resolutions/:resolutionId` — 5 testes

| Status | Caso |
|--------|------|
| `204`  | Atualiza descrição da própria resolução; confirma no banco via `prisma.complaintResolution.findUnique` |
| `404`  | `resolutionId` inexistente (UUID aleatório) |
| `404`  | Resolução pertence a outro usuário (`RESOLUTION_NOT_FOUND`) |
| `422`  | Denúncia com status `RESOLVED` → `COMPLAINT_CLOSED` |
| `401`  | Token ausente |

### `DELETE /v1/complaints/:id/resolutions` — 4 testes

| Status | Caso |
|--------|------|
| `204`  | Deleta própria resolução; confirma via `prisma.complaintResolution.findFirst` retornando `null` |
| `404`  | Usuário não tem resolução nessa denúncia (`RESOLUTION_NOT_FOUND`) |
| `422`  | Denúncia com status `RESOLVED` → `COMPLAINT_CLOSED` |
| `401`  | Token ausente |

## Shape do GET

O `resolutionSchema` (de `src/modules/complaints/entities/complaint-entity.ts`) inclui:

```typescript
{
  id: string,
  description: string,
  company_id: string | null,
  is_owner: boolean,
  resolver_user_profile: { type: "profile", full_name, display_name, avatar_url },
  resolver_company: { type: "company", ... } | null,
  attachments: [],
  created_at: Date,
  updated_at: Date,
}
```

O teste do `is_owner: true` precisa que o mesmo `userId` do token seja o criador da resolução.

## Padrão dos testes de erro com code

Para 422 e 404 com código específico, seguir o padrão já estabelecido:
```typescript
expect(res.statusCode).toBe(422);
expect(res.json().code).toBe("COMPLAINT_CLOSED");
```

## Verificação

```bash
npm run test:integration -- complaint-routes
```

Espera-se: todos os 12 novos casos + os 12 existentes passando (total ~24).
