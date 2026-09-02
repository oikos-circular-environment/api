# T01 — `SupportRequest` ganha tipo, identificação de usuário e metadado de ambiente

**Status:** [ ] Não iniciado
**Depende de:** nada
**Módulos:** `prisma/schema.prisma`, `src/modules/moderation/`
**Substitui:** api#60 (M04 — Reporte de erro pelo usuário)

## Contexto

`POST /v1/moderation/support` (`moderation-support-routes.ts:30`) só recebe `title`/`description`
e faz upload de imagens. Três lacunas:

1. Sem tipo — não dá pra saber se é bug, pedido de suporte ou sugestão de melhoria.
2. Sem usuário — a rota nunca lê a sessão. `user_id?` já existe no schema
   (`schema.prisma:440-441`) e no use-case (`create-support-request-use-case.ts:22,37,83`), mas
   fica sempre `null` porque a rota não extrai token nenhum.
3. Sem ambiente — um relato de erro sem saber plataforma/versão/SO é quase inútil pra
   reproduzir.

Ver decisão em `00-tech-plan.md`: isso substitui a entidade `ErrorReport` separada que a issue
original desenhava.

## Passo 1 — `prisma/schema.prisma`: enum `SupportRequestType` + colunas

```prisma
enum SupportRequestType {
  ERROR
  SUPPORT
  IMPROVEMENT
}

model SupportRequest {
  id          String              @id @default(uuid())
  title       String
  description String
  type        SupportRequestType  @default(SUPPORT)
  status      ModerationStatus    @default(PENDING)
  environment Json?
  created_at  DateTime            @default(now())

  user_id String?
  user    User?   @relation(fields: [user_id], references: [id], onDelete: SetNull)

  attachments SupportRequestAttachment[]

  @@map("support_requests")
}
```

Só adiciona `type` (default `SUPPORT` pra não quebrar linhas já gravadas em produção pela web) e
`environment` (`Json?`, nullable — nem todo cliente manda). `user_id` já existe, não muda.

`npm run migrate:generate` + `npm run migrate:dev`.

## Passo 2 — `entities/support-request-entity.ts`

Adicionar:

```ts
export const supportRequestTypeSchema = z.enum(["ERROR", "SUPPORT", "IMPROVEMENT"]);
export type SupportRequestType = z.infer<typeof supportRequestTypeSchema>;

export const supportRequestEnvironmentSchema = z.object({
  platform: z.enum(["ios", "android", "web"]),
  app_version: z.string().max(50),
  os_version: z.string().max(50).optional(),
});
export type SupportRequestEnvironment = z.infer<typeof supportRequestEnvironmentSchema>;
```

Adicionar `type: supportRequestTypeSchema` e `environment: supportRequestEnvironmentSchema.nullable()`
em `supportRequestSchema` (`support-request-entity.ts:21-29`), entre `description` e `status`.

`platform`/`app_version` obrigatórios dentro do objeto quando ele existe — não faz sentido mandar
ambiente sem saber de onde veio; `os_version` opcional (web não tem SO próprio relevante sempre).

## Passo 3 — `dtos/moderation-dto.ts`

- Re-exportar `supportRequestTypeSchema`/`SupportRequestType` e
  `supportRequestEnvironmentSchema`/`SupportRequestEnvironment` da entidade (mesmo padrão das
  linhas 4-13 atuais).
- `createSupportRequestBodySchema` (linha 19) ganha:
  - `type: supportRequestTypeSchema.default("SUPPORT")`
  - `environment: supportRequestEnvironmentSchema.optional()`

  Como a rota é `multipart/form-data`, `environment` chega como string JSON no campo — parsear com
  `JSON.parse` antes do `safeParse` (mesmo lugar onde os `fields` são montados em
  `moderation-support-routes.ts:71`), com fallback pra erro `SUPPORT_REQUEST_INVALID_BODY` se o
  JSON for inválido (não deixar `JSON.parse` estourar sem tratamento).
- `CreateSupportRequest` (linha 37) ganha `type` e `environment?: SupportRequestEnvironment | null`.

## Passo 4 — `create-support-request-use-case.ts`

- `CreateSupportRequestUseCaseRequest` ganha `type` e `environment?: SupportRequestEnvironment | null`.
- Repassar os dois pro `supportRequestsRepository.create(...)` (linha 80-84), junto de `user_id`.

## Passo 5 — `moderation-support-routes.ts`: capturar usuário da sessão

A rota continua **pública** (`config: { public: true }`, linha 33) — não vira JWT obrigatório. Mas
quando um Bearer token válido vier no header, extrai o `user_id`:

- Importar `auth` (`@/modules/auth/providers/auth/better-auth/better-auth.ts`) e usar
  `auth.api.getSession({ headers: new Headers(request.headers as Record<string,string>) })` —
  mesmo padrão de `buildHeaders`/sessão em `moderation-user-routes.ts:39-41`.
- **Sessão ausente ou inválida não é erro** — apenas segue com `userId: null`. Só se o header
  `Authorization` existir e a sessão for válida é que `userId` é preenchido. Nunca lançar 401 aqui.
- Passar `userId` pro `createSupportRequestUseCase.execute({ ...parsed.data, userId, files })`.

## Passo 6 — Repositórios

`repositories/support-requests-repository.ts` — `create(data: CreateSupportRequest)` já aceita um
objeto genérico, não precisa mudar assinatura, só o Prisma repo (`support-requests-repository-prisma.ts`)
precisa passar `type`/`environment` pro `prisma.supportRequest.create`.

`repositories/in-memory/in-memory-support-requests-repository.ts` — mesmo ajuste no mock.

## Fora de escopo

- Endpoint de leitura/listagem (entra em T02).
- Validação de `app_version` contra uma lista de versões conhecidas — só formato de string.
- Qualquer captura automática (crash handler, stack trace) — o app manda o que quiser mandar no
  momento do envio, não há hook de coleta em background.

## Verificação

- `npm run test -- support-request` — specs do use-case cobrindo: sem token (user_id null), com
  token válido (user_id preenchido), `environment` ausente vs presente, `type` default `SUPPORT`
  quando omitido.
- `npx tsc --noEmit`, `npm run lint`, `npm run test` completos.
- Teste manual via Swagger: enviar `POST /v1/moderation/support` com e sem `Authorization`, com e
  sem `environment` no body.
