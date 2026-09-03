# T01 — `Support`: rename, tipo, usuário/e-mail, ambiente, status e severidade compartilhados

**Status:** [x] Concluído
**Depende de:** nada
**Módulos:** `prisma/schema.prisma`, `src/modules/moderation/`
**Substitui:** api#60 (M04 — Reporte de erro pelo usuário)

## Checklist

- [x] Passo 1 — `schema.prisma`: rename `SupportRequest`→`Support` + `SupportType` + `ModerationSeverity`
- [x] Passo 2 — `entities/support-entity.ts`
- [x] Passo 3 — `dtos/moderation-dto.ts`
- [x] Passo 4 — nota de metadado de ambiente (sem código nesta ticket, só contrato)
- [x] Passo 5 — `create-support-use-case.ts`
- [x] Passo 6 — repositórios renomeados (interface + in-memory + Prisma)
- [x] Verificação (`tsc`, `lint`, `test`) verde
- [x] `code-review` aprovado (2 rodadas: 2 bugs reais achados e corrigidos — `updated_at` de backfill errado na migração, `reporter_email` nulo virando `""` inválido)

## Contexto

`POST /v1/moderation/support` (`moderation-support-routes.ts:30`) só recebe `title`/`description`
e faz upload de imagens. Lacunas, checadas nesta sessão:

1. **Nome `SupportRequest` colide com `request` do handler HTTP.** Toda a leitura do módulo exige
   desambiguar "o `request` do Fastify" vs "o `SupportRequest` do domínio" — o `create-support-
   request-use-case.ts` atual, por exemplo, tem `CreateSupportRequestUseCaseRequest` num único
   tipo. Este ticket renomeia `SupportRequest` → `Support` em todo o código (ver decisão em
   `00-tech-plan.md`), no mesmo golpe que já mexe em todos esses arquivos pras lacunas abaixo.
2. Sem tipo — não dá pra saber se é bug, pedido de suporte ou sugestão de melhoria.
3. Sem usuário/e-mail — a rota nunca lê a sessão nem aceita um e-mail de quem não tem conta.
   `user_id?` já existe no schema (`schema.prisma:440-441`) e no use-case, mas fica sempre `null`;
   não existe `reporter_email` (que `Denunciation`, em T02, já prevê) — inconsistente entre as duas
   entidades que compartilham a mesma tela de "reportar algo" no Pencil.
4. Sem ambiente — um relato de erro sem saber plataforma/versão/SO é quase inútil pra reproduzir.
5. `status` (`ModerationStatus`) só tem `PENDING/APPROVED/REJECTED` — não dá pra expressar
   "cancelada pelo usuário" nem o vocabulário que o reporter precisa ver (aberta/fechada/cancelada/
   resolvida). Ver decisão em `00-tech-plan.md`.
6. Sem severidade — moderação não tem como priorizar fila.

Este ticket cobre só **rename + modelo de dados + use-case de criação**. A rota pública de criação
e as rotas de leitura/gestão do usuário ficam em T03; as rotas de moderação ficam em T04.

## Passo 1 — `prisma/schema.prisma`: rename + `SupportType` + `ModerationSeverity`

```prisma
enum ModerationStatus {
  OPEN
  CLOSED
  CANCELLED
  RESOLVED
}

enum ModerationSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum SupportType {
  ERROR
  SUPPORT
  IMPROVEMENT
}

model Support {
  id             String              @id @default(uuid())
  title          String
  description    String
  type           SupportType         @default(SUPPORT)
  status         ModerationStatus    @default(OPEN)
  severity       ModerationSeverity?
  environment    Json?
  reporter_email String?
  created_at     DateTime            @default(now())
  updated_at     DateTime            @updatedAt

  user_id String?
  user    User?   @relation(fields: [user_id], references: [id], onDelete: SetNull)

  attachments SupportAttachment[]

  @@map("supports")
}

model SupportAttachment {
  id         String   @id @default(uuid())
  url        String
  file_name  String
  path       String
  created_at DateTime @default(now())

  support_id String
  support    Support @relation(fields: [support_id], references: [id], onDelete: Cascade)

  @@map("support_attachments")
}
```

Renomeia `model SupportRequest` → `Support`, `model SupportRequestAttachment` →
`SupportAttachment`, `support_request_id` → `support_id`; tabelas `support_requests` →
`supports`, `support_request_attachments` → `support_attachments`; enum `SupportRequestType` →
`SupportType`. Em `model User`, o campo `support_requests SupportRequest[]` vira
`supports Support[]`.

`ModerationStatus` já existe em produção só com valor `PENDING` (nunca saiu disso — não há rota
que transicione). Trocar os valores do enum é seguro: não existe linha com `APPROVED`/`REJECTED`
pra remapear, mas a migração precisa de um `UPDATE supports SET status = 'OPEN' WHERE status =
'PENDING'` (ou equivalente) **antes** de trocar o tipo da coluna, já que `PENDING` deixa de existir
no enum. Renomear tabela (`support_requests` → `supports`) e coluna de FK
(`support_request_id` → `support_id`) na mesma migração via `@@map`/`@map` já cuida do `ALTER
TABLE ... RENAME` — revisar o SQL gerado por `npm run migrate:dev` antes de aplicar, já que rename
de tabela com dados existentes em produção precisa ser um `RENAME`, não um `DROP` + `CREATE`
(Prisma normalmente já gera `RENAME` quando o `@@map` muda e o shape da tabela é compatível; se ele
gerar drop/create, editar a migração manualmente antes de rodar).

`status` ganha `updated_at` (não existia) — necessário pra distinguir "nunca visto" (`updated_at ==
created_at`) de "já mexeram", embora a auditoria fina (`moderated_at`) só entre no ticket de
moderação (T04).

## Passo 2 — `entities/support-entity.ts` (renomeado de `support-request-entity.ts`)

```ts
export const moderationStatusSchema = z.enum(["OPEN", "CLOSED", "CANCELLED", "RESOLVED"]);
export type ModerationStatus = z.infer<typeof moderationStatusSchema>;

export const moderationSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type ModerationSeverity = z.infer<typeof moderationSeveritySchema>;

export const supportTypeSchema = z.enum(["ERROR", "SUPPORT", "IMPROVEMENT"]);
export type SupportType = z.infer<typeof supportTypeSchema>;

export const supportLastErrorSchema = z.object({
  message: z.string().max(2000),
  stack: z.string().max(8000).optional(),
  component_stack: z.string().max(8000).optional(),
  occurred_at: z.string().datetime().optional(),
});
export type SupportLastError = z.infer<typeof supportLastErrorSchema>;

export const supportEnvironmentSchema = z.object({
  platform: z.enum(["ios", "android", "web"]),
  app_version: z.string().max(50),
  os_version: z.string().max(50).optional(),
  screen_size: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional(),
  last_error: supportLastErrorSchema.optional(),
});
export type SupportEnvironment = z.infer<typeof supportEnvironmentSchema>;
```

`platform`/`os_version`/`app_version`/`screen_size` são preenchidos no `mobile` com
`expo-application`/`expo-device` (instalação nova, planejada pro lançamento desta feature — ver
decisão em `00-tech-plan.md`), num helper próprio da feature de moderação — **não** reaproveitar
`mobile/src/libs/survey/device-info.ts`: o survey fica isolado, sem virar dependência de outra
parte do app. `last_error` é o snapshot opcional de erro JS (client captura via
`ErrorUtils.setGlobalHandler`/`ErrorBoundary`, núcleo do RN/React, sem pacote adicional) — só
preenchido quando `type: "ERROR"` e só enviado quando o usuário manda o formulário manualmente,
nunca em background.

Este schema é o **mínimo** que a API valida hoje — não é o teto do que `environment` pode carregar.
Não existe (nem é criada aqui) uma tabela separada de "eventos"/"erros": a coluna `Json?` já é o
lugar pra isso crescer conforme o `mobile` evolui (SDK novo, `expo-observe` Errors quando
disponível, mais campos), sem migração nova. Efeito prático: se o objetivo é preservar tudo que o
client mandar (não só os campos que este schema já conhece), gravar no banco o payload bruto
recebido (antes do `.parse()`), não a saída do `supportEnvironmentSchema.parse(...)` — por padrão
o Zod descarta chaves desconhecidas de um `z.object()` na hora de validar.

`supportSchema` (renomeado de `supportRequestSchema`) ganha, entre `description` e `status`:
`type`, `environment: supportEnvironmentSchema.nullable()`, `reporter_email: z.string().email()`
(sem `.nullable()` — obrigatório, ver Passo 3); depois de `status`: `severity:
moderationSeveritySchema.nullable()`. `platform`/`app_version` obrigatórios dentro do objeto
`environment` quando ele existe; o resto (`os_version`, `screen_size`, `last_error`) opcional.

**Contrato de campo compartilhado com `Denunciation`** (ver decisão em `00-tech-plan.md`):
`title`, `description`, `reporter_email` (obrigatórios) e anexos (opcional) existem nas duas
entidades com o mesmo formato; `type`/`environment` só existem em `Support`; `reported_user_id`/
`latitude`/`longitude` só em `Denunciation` (T02).

## Passo 3 — `dtos/moderation-dto.ts`

- Re-exportar (nomes já sem `Request`): `moderationSeveritySchema`/`ModerationSeverity`,
  `supportTypeSchema`/`SupportType`, `supportEnvironmentSchema`/`SupportEnvironment`,
  `supportLastErrorSchema`/`SupportLastError`, `supportSchema`/`Support`,
  `supportAttachmentSchema`/`SupportAttachment`.
- `createSupportBodySchema` (renomeado de `createSupportRequestBodySchema`) ganha:
  - `type: supportTypeSchema.default("SUPPORT")`
  - `environment: supportEnvironmentSchema.optional()`
  - `reporter_email: z.string().email().optional()` no schema Zod (fica opcional aqui porque a
    obrigatoriedade depende de haver sessão ou não, e o schema não enxerga sessão) — a rota (T03)
    valida: com sessão, ignora o valor do body e usa o e-mail da sessão; sem sessão, `reporter_
    email` ausente ou vazio é erro (`SUPPORT_EMAIL_REQUIRED`, 400), lançado depois do `safeParse`,
    antes de chamar o use-case.

  Como a rota é `multipart/form-data`, `environment` chega como string JSON no campo — parsear com
  `JSON.parse` antes do `safeParse`, com fallback pra erro `SUPPORT_INVALID_BODY` se o JSON for
  inválido (não deixar `JSON.parse` estourar sem tratamento).
- `CreateSupport` (renomeado de `CreateSupportRequest`) ganha `type`, `environment?:
  SupportEnvironment | null` e `reporter_email: string` (obrigatório no tipo do use-case, já
  resolvido — sessão ou body — antes de chegar aqui).
- `MAX_SUPPORT_REQUEST_TITLE_LENGTH`/`MAX_SUPPORT_REQUEST_DESCRIPTION_LENGTH` →
  `MAX_SUPPORT_TITLE_LENGTH`/`MAX_SUPPORT_DESCRIPTION_LENGTH`.
- `saveSupportRequestAttachmentSchema`/`SaveSupportRequestAttachment` →
  `saveSupportAttachmentSchema`/`SaveSupportAttachment`.

## Passo 4 — Metadado de ambiente: de onde vem (API só define o contrato, envio é trabalho do `mobile`)

`environment` não é um campo de formulário que o usuário preenche — o cliente monta esse objeto
sozinho e manda junto do `POST`. Este ticket (API) só garante que o schema aceita o formato abaixo
e não trava se o `mobile` mandar campos extras (ver nota de `.parse()` acima). **A implementação
client-side é trabalho do repo `mobile`, rastreado em issue própria vinculada a este épico — ver
"Fora de escopo".**

- **Plataforma/versão/SO/tamanho de tela:** vai usar `expo-application`/`expo-device` (módulos
  oficiais do Expo — instalação nova, aceita pelo Christian, planejada pro próximo lançamento de
  versão do app junto desta feature), num helper próprio da feature de moderação. **Não**
  reaproveitar `mobile/src/libs/survey/device-info.ts` (usa `expo-constants` pra outra finalidade)
  — o survey fica isolado, decisão explícita do Christian de não misturar módulos.
- **`expo-observe` (~56.0.27) já está instalado** no `mobile` (`src/app/_layout.tsx`,
  `src/libs/observe-events.ts`), mas a feature "Errors" exige **Expo SDK 57** — o projeto está em
  `~56.0.19`. Upgrade de SDK é pré-requisito e é trabalho à parte, fora deste épico; mesmo depois,
  `Errors` reporta pro dashboard do EAS — canal paralelo, não substitui nem alimenta este
  `environment`.
- **`last_error` (snapshot de erro JS), enquanto não há `expo-observe` Errors disponível:**
  capturado via `ErrorUtils.setGlobalHandler` (núcleo do React Native) e
  `ErrorBoundary`/`componentDidCatch` (núcleo do React) — sem pacote além dos dois já citados.
  Guardado local (memória/`AsyncStorage`) até o usuário abrir "reportar problema" e enviar; a API
  só recebe o JSON já pronto no `POST`, nunca busca nada no dispositivo. Cobre erro JS (exceção não
  tratada, erro de render); **não cobre crash nativo** (processo morrendo em código Kotlin/Swift) —
  isso segue precisando de handler nativo próprio ou lib de crash reporting (Sentry, Crashlytics,
  EAS Observe Errors quando disponível), fora de escopo por ora.
- **Web:** versão do app injetada em build-time (ex. `import.meta.env.VITE_APP_VERSION`),
  `platform: "web"` fixo, sem `os_version`/`last_error` por ora.

Isso é diferente de **captura automática de crash nativo** — o servidor não faz nenhuma extração
ativa do dispositivo do usuário; só recebe o JSON que o client decidiu mandar no momento do envio,
e nada é enviado sozinho em background sem ação do usuário.

## Passo 5 — `create-support-use-case.ts` (renomeado de `create-support-request-use-case.ts`)

- `CreateSupportUseCase` (renomeado de `CreateSupportRequestUseCase`); request type
  `CreateSupportUseCaseRequest` ganha `type`, `environment?: SupportEnvironment | null` e
  `reporter_email: string` (já validado como obrigatório na rota antes de chegar aqui).
- Repassar os três pro `supportsRepository.create(...)`, junto de `user_id`.
- Status de criação é sempre `OPEN` (não recebe `status` do request).
- Códigos de erro internos perdem o `_REQUEST`: `SUPPORT_TOO_MANY_FILES`,
  `SUPPORT_ATTACHMENT_TYPE_INVALID`, `SUPPORT_ATTACHMENT_TOO_LARGE`,
  `SUPPORT_ATTACHMENT_CONTENT_INVALID`, `SUPPORT_ATTACHMENT_UPLOAD_FAILED`, `SUPPORT_NOT_FOUND`.
  Novo código `SUPPORT_EMAIL_REQUIRED` (400) pra quando não há sessão nem `reporter_email` no
  body.

## Passo 6 — Repositórios (renomeados)

`repositories/support-repository.ts` → `repositories/supports-repository.ts`
(`SupportRequestsRepository` → `SupportsRepository`, plural — mesmo padrão de
`ComplaintsRepository`/`DenunciationsRepository`). `create(data: CreateSupport)` já aceita um
objeto genérico, não precisa mudar assinatura de forma, só o Prisma repo
(`supports-repository-prisma.ts`, classe `PrismaSupportsRepository`) precisa passar
`type`/`environment`/`reporter_email` pro `prisma.support.create`.

`repositories/in-memory/in-memory-supports-repository.ts` (classe `InMemorySupportsRepository`) —
mesmo ajuste no mock, default `status: "OPEN"`.

`factories/make-support-request.ts` → `factories/make-support.ts` (`makeSupportRequest` →
`makeSupport`).

## Fora de escopo

- Rota HTTP de criação/leitura/cancelamento — entra em T03 (rota do usuário).
- Rota HTTP de listagem/gestão pela moderação — entra em T04.
- Validação de `app_version` contra uma lista de versões conhecidas — só formato de string.
- Implementação client-side de `environment`/`last_error` (instalação de
  `expo-application`/`expo-device`, helper isolado do survey, `ErrorUtils`/`ErrorBoundary`) — issue
  própria no repo `mobile`: mobile#204, vinculada a este épico. Este ticket só define o schema que
  a API aceita.
- Upgrade de Expo SDK 56→57 e adoção do `expo-observe` Errors — mobile#204 registra como fora de
  escopo por ora; trabalho à parte quando priorizado.
- Captura de crash nativo, lib de crash reporting (Sentry/Crashlytics/EAS Observe Errors) — fora de
  escopo deste épico.

## Verificação

- `npm run test -- support` — specs do use-case cobrindo: sem token e sem `reporter_email` →
  `SUPPORT_EMAIL_REQUIRED`; sem token com `reporter_email` no body → `user_id: null`,
  `reporter_email` preservado; com token válido → `user_id` preenchido, `reporter_email` da sessão
  (valor do body ignorado se vier); `environment` ausente vs presente (com e sem `last_error`);
  `type` default `SUPPORT` quando omitido; `status` sempre `OPEN` na criação.
- `npx tsc --noEmit`, `npm run lint`, `npm run test` completos.
