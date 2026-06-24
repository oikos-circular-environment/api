# Plano: Exclusão de Conta LGPD-Compliant

## Contexto

A LGPD exige que o usuário possa solicitar a exclusão de todos os seus dados pessoais. Atualmente não existe endpoint de exclusão de conta. O plano implementa soft-delete com prazo de carência configurável (default 90 dias em produção, 1 segundo em testes): o usuário solicita exclusão, a conta permanece ativa durante o período, e após o prazo um worker BullMQ executa hard delete de todos os dados + arquivos no storage.

O prazo de carência é parametrizado via `ACCOUNT_DELETION_DELAY_MS` no env, validado por Zod — mesmo padrão de `QUORUM_JOB_DELAY_MS`.

## Fluxo

1. `DELETE /v1/users/me` → marca `deleted_at = now()`, agenda job BullMQ com delay de `env.ACCOUNT_DELETION_DELAY_MS`
2. Conta **permanece ativa** durante o período de carência
3. `PATCH /v1/users/me/cancel-deletion` → limpa `deleted_at`, remove o job agendado
4. Após o delay: worker executa hard delete do User (cascade) + registros órfãos + arquivos no storage

---

## T1. Schema Prisma

**Arquivo:** `prisma/schema.prisma`

Adicionar ao model `User`:
```prisma
deleted_at      DateTime?
deletion_job_id String?
```

Rodar: `npm run migrate:dev` + `npm run migrate:generate`

---

## T2. Environment

**Arquivo:** `src/env/index.ts`

Adicionar ao `envSchema`:
```typescript
ACCOUNT_DELETION_DELAY_MS: z.coerce.number().default(90 * 24 * 60 * 60 * 1000),
```

Default: 7.776.000.000 ms (90 dias). Seguindo o mesmo padrão de `QUORUM_JOB_DELAY_MS` (linha 26).

**Arquivo:** `.env.test`

Adicionar:
```
ACCOUNT_DELETION_DELAY_MS=1000
```

Padrão idêntico ao `QUORUM_JOB_DELAY_MS=1000` — delay mínimo para testes de integração não bloquearem.

---

## T3. User Entity / DTO / Factory

**`src/modules/users/entities/user-entity.ts`** — adicionar:
```typescript
deleted_at: z.date().nullable()
deletion_job_id: z.string().nullable()
```

**`src/modules/users/dtos/users-dto.ts`** — exportar o schema atualizado.

**`src/modules/users/factories/make-user.ts`** — defaults: `deleted_at: null, deletion_job_id: null`.

---

## T4. Repository

**`src/modules/users/repositories/users-repository.ts`** — adicionar 3 métodos:
```typescript
markAsDeleted(userId: string, deletionJobId: string): Promise<User>;
cancelDeletion(userId: string): Promise<User>;
delete(userId: string): Promise<void>;
```

**`src/modules/users/repositories/prisma/users-repository-prisma.ts`**:
- `markAsDeleted`: `prisma.user.update({ data: { deleted_at: new Date(), deletion_job_id } })`
- `cancelDeletion`: `prisma.user.update({ data: { deleted_at: null, deletion_job_id: null } })`
- `delete`: `prisma.user.delete({ where: { id: userId } })`

**`src/modules/users/repositories/in-memory/in-memory-users-repositories.ts`** — espelhar os 3 métodos.

---

## T5. Errors

Criar em `src/modules/users/errors/`:

| Arquivo | Code | Status |
|---|---|---|
| `user-not-found-error.ts` | `USER_NOT_FOUND` | 404 |
| `account-already-scheduled-for-deletion-error.ts` | `ACCOUNT_ALREADY_SCHEDULED_FOR_DELETION` | 409 |
| `account-not-scheduled-for-deletion-error.ts` | `ACCOUNT_NOT_SCHEDULED_FOR_DELETION` | 422 |

Estendem `AppError` (`src/modules/common/errors/app-error.ts`).

---

## T6. Queue Infrastructure

**`src/lib/queue/jobs.ts`** — adicionar:
```typescript
export type AccountDeletionJobData = { userId: string };
```

**`src/lib/queue/queues.ts`** — adicionar:
```typescript
export const accountDeletionQueue = new Queue("account-deletion", {
  connection: makeConnectionOptions(),
  defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
});
```

**`src/lib/queue/index.ts`** — re-exportar ambos.

---

## T7. Job Dispatcher (Provider)

Seguir padrão de `src/modules/complaints/providers/queue/`.

**`src/modules/users/providers/queue/account-deletion-job-dispatcher.ts`** — interface:
```typescript
export interface AccountDeletionJobDispatcher {
  dispatchDeletionJob(userId: string): Promise<string>; // retorna jobId
  cancelDeletionJob(jobId: string): Promise<void>;
}
```

**`src/modules/users/providers/queue/bullmq/bullmq-account-deletion-job-dispatcher.ts`**:
- `dispatchDeletionJob`: `accountDeletionQueue.add("delete-account", { userId }, { jobId, delay: env.ACCOUNT_DELETION_DELAY_MS })` — retorna `account-deletion-${userId}`
- `cancelDeletionJob`: busca job pelo ID e remove

**`src/modules/users/providers/queue/in-memory/in-memory-account-deletion-job-dispatcher.ts`** — `Map<string, { userId, dispatched }>`.

---

## T8. Use Cases

**`src/modules/users/use-cases/request-account-deletion-use-case.ts`**:
1. `usersRepository.findById(userId)` — se null, throw `UserNotFoundError`
2. Se `user.deleted_at` não é null → throw `AccountAlreadyScheduledForDeletionError`
3. `jobDispatcher.dispatchDeletionJob(userId)` → recebe `jobId`
4. `usersRepository.markAsDeleted(userId, jobId)` → retorna user atualizado

**`src/modules/users/use-cases/cancel-account-deletion-use-case.ts`**:
1. `usersRepository.findById(userId)` — se null, throw `UserNotFoundError`
2. Se `user.deleted_at` é null → throw `AccountNotScheduledForDeletionError`
3. `jobDispatcher.cancelDeletionJob(user.deletion_job_id)`
4. `usersRepository.cancelDeletion(userId)` → retorna user atualizado

---

## T9. Unit Tests

**`src/modules/users/use-cases/request-account-deletion-use-case.spec.ts`**:
- schedules deletion for existing user
- throws USER_NOT_FOUND when user does not exist
- throws ACCOUNT_ALREADY_SCHEDULED_FOR_DELETION when already scheduled

**`src/modules/users/use-cases/cancel-account-deletion-use-case.spec.ts`**:
- cancels scheduled deletion
- throws USER_NOT_FOUND when user does not exist
- throws ACCOUNT_NOT_SCHEDULED_FOR_DELETION when not scheduled

Usam `InMemoryUsersRepository` + `InMemoryAccountDeletionJobDispatcher`.

---

## T10. Worker — Deletion Logic

**`src/modules/users/workers/account-deletion-logic.ts`** — `executeAccountDeletion(userId)`:

1. Busca user. Se não existe ou `deleted_at` é null → return false (guard contra cancelamentos)
2. Coleta paths de arquivos ANTES do cascade:
   - `ProfileImage.path` via `Profile.user_id`
   - `CompanyAvatar.path` via `Company.user_id`
   - `ComplaintAttachment.path` via `Complaint.user_id`
   - `ComplaintResolutionAttachment.path` via `ComplaintResolution.resolver_user_id`
3. Coleta IDs de registros órfãos (não cobertos pelo cascade):
   - `Profile.profile_image_id` → ProfileImage IDs
   - `Company.avatar_id` → CompanyAvatar IDs
   - `Profile.address_id` + `Company.address_id` → Address IDs
4. `prisma.user.delete()` — cascade deleta: Profile, Company (+validations, +business hours, +wastes, +services), Complaint (+attachments, +votes, +resolutions, +waste categories), ComplaintVote, ComplaintResolution
5. Deleta registros órfãos: `prisma.profileImage.deleteMany()`, `prisma.companyAvatar.deleteMany()`, `prisma.address.deleteMany()` pelos IDs coletados
6. Deleta arquivos via `StorageProvider.deleteFile()` com try/catch individual (não falha se arquivo já não existir)

Usa `makeStorageProvider()` (`src/modules/common/providers/storage/make-storage-provider.ts`) para obter o provider correto.

---

## T11. Worker — BullMQ

**`src/modules/users/workers/account-deletion-worker.ts`** — `createAccountDeletionWorker()`:
```typescript
new Worker<AccountDeletionJobData>(
  "account-deletion",
  async (job) => {
    const deleted = await executeAccountDeletion(job.data.userId);
    return { userId: job.data.userId, deleted };
  },
  { connection, concurrency: env.WORKER_CONCURRENCY }
)
```

**`src/modules/users/workers/index.ts`** — re-exporta `createAccountDeletionWorker`.

---

## T12. Routes

**`src/modules/users/user-routes.ts`**:

A rota `POST /users/register` permanece **pública** (antes do hook).

Adicionar hook `onRequest` com `verifyJwt` (padrão de `company-routes.ts:129`), e dentro do escopo autenticado:

```
DELETE /users/me              → 202 { message, deleted_at }
PATCH  /users/me/cancel-deletion → 200 { message }
```

Ambas extraem `userId` de `request.user.sub`. Instanciam `PrismaUsersRepository` + `BullMQAccountDeletionJobDispatcher`.

**Atenção:** a rota de register deve ser registrada ANTES do hook `onRequest`, ou registrada num plugin separado sem o hook. Padrão: usar `typedApp.register(async (authenticatedApp) => { ... })` para isolar as rotas autenticadas, como um sub-plugin.

---

## T13. Server / App Registration

**`src/server.ts`** — dentro do `if (process.env.REDIS_URL)`:
```typescript
const { createAccountDeletionWorker } = await import("./modules/users/workers/index.js");
createAccountDeletionWorker();
```

**`src/app.ts`** — no bloco BullBoard, importar `accountDeletionQueue` e adicionar ao array de queues.

---

## T14. Integration Test — Worker

**`src/modules/users/workers/account-deletion-worker.integration.spec.ts`**

Padrão idêntico ao `resolve-by-quorum-worker.integration.spec.ts`:

**Setup:**
```typescript
beforeEach(async () => {
  await accountDeletionQueue.drain(true);
  worker = createAccountDeletionWorker();
  await worker.waitUntilReady();
});
afterEach(async () => {
  await worker.close();
  // cleanup dos registros criados
});
```

**Espera pelo job:**
```typescript
const jobDone = new Promise<void>((resolve) => {
  worker.once("completed", () => resolve());
  worker.once("failed", () => resolve());
});
await accountDeletionQueue.add("delete-account", { userId });
await jobDone;
```

Usa `ACCOUNT_DELETION_DELAY_MS=1000` do `.env.test` — delay mínimo.

**Cenários:**
- deletes user and all cascaded data (full setup: profile + image, company + avatar, complaints + attachments)
- cleans up orphaned ProfileImage, CompanyAvatar, Address records
- deletes storage files (usar InMemoryStorage ou MinIO do container de teste)
- skips when user not found
- skips when deleted_at is null (cancelamento entre agendamento e execução)

**Timeout:** `timeout: 35_000` (padrão do projeto).

---

## T15. Integration Test — Job Dispatcher

**`src/modules/users/providers/queue/bullmq/bullmq-account-deletion-job-dispatcher.integration.spec.ts`**

Valida:
- job é enfileirado com delay correto (`env.ACCOUNT_DELETION_DELAY_MS`)
- job é removido ao cancelar
- jobId segue padrão `account-deletion-${userId}`

---

## Verificação

1. `npm run migrate:dev` — aplicar migration
2. `npm run test -- request-account-deletion` — unit tests do request
3. `npm run test -- cancel-account-deletion` — unit tests do cancel
4. `npm run test` — suite completa (sem regressões)
5. `npm run test:integration` — testes de integração do worker e job dispatcher
6. `npm run dev` — testar manualmente via `/docs`:
   - Registrar user, fazer login
   - `DELETE /v1/users/me` → 202
   - `PATCH /v1/users/me/cancel-deletion` → 200
   - Verificar job no Bull Board (`/bullboard`)
7. Validar env: iniciar sem `ACCOUNT_DELETION_DELAY_MS` → usa default 90 dias; com valor customizado → usa o valor
