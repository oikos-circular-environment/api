# Moderação — suporte, denúncias internas e ações de moderação

Re-planejamento do épico [api#57](https://github.com/oikos-circular-environment/api/issues/57).
O plano original (issue + `plans/moderation-denunciations.md`) foi escrito antes do Better Auth
(`api#8`) fechar E02 — hoje `require-role("moderator")` e `/v2/moderation/users` (ban, unban,
sessões, papel) já existem e estão em produção. Este documento substitui o mapa de escopo da
issue #57 com o estado real do código (checado em `src/modules/moderation/` nesta sessão) e ajusta
decisões de escopo pedidas pelo Christian.

**Atualização (2026-09-03):** desenhando as telas no Pencil, ficou claro que o plano anterior
misturava dois contextos que não podem viver juntos — quem *reporta* (usuário) e quem *modera*
(moderador) — e faltava um vocabulário de status/severidade comum entre suporte e denúncia. As
seções **Decisões** e **Tickets** abaixo foram reescritas pra refletir isso. Nada de T01-T04 do
plano anterior chegou a ser implementado, então a reformulação é só de plano, sem código pra
migrar.

**Atualização 2 (2026-09-03):** o nome `SupportRequest` é renomeado pra `Support` em todo o
código (schema, entidade, DTOs, repositório, use-cases, rotas) — ver decisão de nomenclatura
abaixo. Também padronizado o contrato de campos entre suporte e denúncia (item "Contrato de campo
compartilhado"), e detalhado como o metadado de ambiente chega no servidor (item "Metadado de
ambiente").

## Contexto

Quatro frentes vivem sob o guarda-chuva `moderation`, agora em **dois contextos de rota
separados**:

1. **Rota do usuário (reporter)** — cria, lista, atualiza e cancela seus próprios pedidos de
   suporte e denúncias; enxerga `status` e a resposta/decisão da moderação. Não fica sob
   `/moderation` — é o próprio usuário final (autenticado ou anônimo na criação), não um
   moderador. Hoje só existe `POST /v1/moderation/support` (implementado, em produção, web já
   coleta), sem `type`, sem identificar o usuário logado, sem listagem/leitura/cancelamento.
2. **Rota de moderação** — lista, responde (comentário/explicação da decisão) e toma ação sobre
   pedidos de suporte e denúncias: atualiza `status` (aberta/fechada/cancelada/resolvida) e
   `severity` (muito alta/alta/média/baixa). **Não abre denúncia nem suporte** — só recebe o que
   já foi criado pela rota do usuário. A parte de CRUD de usuário (listar, banir, revogar sessão,
   papel) já está pronta em `moderation-user-routes.ts`, atrás de `requireRole("moderator")`; falta
   ligar essas ações a uma denúncia concreta.
3. **Denúncia interna** (conteúdo/perfil inadequado) — planejada em detalhe em
   `plans/moderation-denunciations.md`, nada implementado ainda. Passa a nascer com o mesmo
   vocabulário de status/severidade do suporte, e com o mesmo contrato de campo base.
4. **Painel** (web#38) — fora deste repo, consome só a rota de moderação daqui.

`Complaint` (denúncia ambiental, geolocalização, quórum, votação) **não faz parte deste épico** —
é produto, não moderação da plataforma. Todo ticket abaixo evita reaproveitar nome ou schema de
`complaints`.

## Decisões

- **`SupportRequest` é renomeado pra `Support` em todo o código.** "Request" no nome colidia com o
  `request` do handler HTTP (`(request, reply) => ...`) espalhado pela rota — toda leitura exigia
  desambiguar "o `request` do Fastify" vs "o `SupportRequest` do domínio". Renomear resolve isso e
  também padroniza com `Denunciation` (nomes de entidade curtos, sem sufixo). Escopo do rename,
  registrado em T01 (que já mexe em todos esses arquivos pra acrescentar `type`/`environment`, faz
  sentido fazer os dois no mesmo golpe/migração):
  - Prisma: `model SupportRequest` → `Support`, `model SupportRequestAttachment` →
    `SupportAttachment`; tabelas `support_requests` → `supports`,
    `support_request_attachments` → `support_attachments`; coluna `support_request_id` →
    `support_id`; enum `SupportRequestType` → `SupportType`.
  - TS: `entities/support-request-entity.ts` → `support-entity.ts` (`supportRequestSchema` →
    `supportSchema`, `SupportRequest` → `Support`, etc.); `factories/make-support-request.ts` →
    `make-support.ts` (`makeSupportRequest` → `makeSupport`);
    `repositories/support-requests-repository.ts` → `supports-repository.ts`
    (`SupportRequestsRepository` → `SupportsRepository`, plural — mesmo padrão de
    `ComplaintsRepository`/`DenunciationsRepository`); `in-memory-support-requests-repository.ts`
    → `in-memory-supports-repository.ts`; `support-requests-repository-prisma.ts` →
    `supports-repository-prisma.ts`; `create-support-request-use-case.ts` →
    `create-support-use-case.ts` (`CreateSupportRequestUseCase` → `CreateSupportUseCase`).
  - Códigos de erro: qualquer `SUPPORT_REQUEST_*` perde o `_REQUEST` (`SUPPORT_NOT_FOUND`,
    `SUPPORT_ATTACHMENT_TOO_LARGE`, etc.).
  - Rota HTTP: `moderation-support-routes.ts` já tinha nome correto (não é renomeado); o path
    `/moderation/support` também já está correto e **não muda** — só perde o `POST` (que migra pra
    T03) e ganha `GET`/`PATCH` (T04). Chave de resposta JSON `supportRequest` → `support`,
    `supportRequests` (lista) → `supports`.
  - Não afeta `Denunciation` nem `ModerationStatus`/`ModerationSeverity` — esses nomes já não
    tinham o problema.
- **Contrato de campo compartilhado entre suporte e denúncia.** As duas telas do Pencil pedem
  quase os mesmos campos na criação — padronizado assim:
  - Comuns aos dois: `title`, `description`, `reporter_email` (obrigatórios), anexos (opcional,
    0..N imagens/vídeo, endpoint de upload separado, mesmo padrão já usado hoje).
  - Só em `Support`: `type` (`ERROR | SUPPORT | IMPROVEMENT`), obrigatório — não existe em
    `Denunciation` (não faz sentido classificar denúncia como "erro/suporte/melhoria").
  - Só em `Denunciation`: `reported_user_id` (opcional — quem está sendo denunciado, quando
    identificável) e `latitude`/`longitude` (opcional).
  `Support` ganha `reporter_email` nesta atualização — antes só tinha `user_id`, sem campo pra
  quem envia sem conta (inconsistente com `Denunciation`, que já previa `reporter_email`).
- **`reporter_email` é obrigatório, mas nunca digitado por quem já está logado.** Com Bearer token
  válido, o e-mail vem da sessão (`auth.api.getSession(...).user.email`) e qualquer valor mandado
  no body é ignorado — a sessão é a fonte da verdade. Sem sessão, o body **precisa** trazer
  `reporter_email`; ausência é erro (`SUPPORT_EMAIL_REQUIRED`/`DENUNCIATION_EMAIL_REQUIRED`, 400) —
  não dá pra responder a decisão da moderação (ver "Resposta da moderação é visível pro reporter",
  abaixo) sem um destino de contato. Isso é validação de aplicação (depende de saber se há sessão),
  não só do schema Zod do body: `reporter_email` no schema é `optional()`, a obrigatoriedade
  condicional é checada no use-case/rota.
- **Metadado de ambiente (`environment`): coluna `Json?` schema-less, de propósito — cresce sem
  migração.** Não vale a pena normalizar plataforma/versão/SO em colunas próprias pra um dado que
  só existe pra debug manual, e cuja forma exata ainda vai mudar conforme o `mobile` evolui (nova
  versão do Expo, novas libs de captura). A API só define o schema **mínimo** hoje
  (`platform`/`app_version` obrigatórios dentro do objeto, resto opcional) e aceita o que vier a
  mais sem precisar de nova migração — decisão validada explicitamente pelo Christian: "a coluna
  metadata vai servir exatamente pra isso, não precisamos estruturar nada, e à medida que o mobile
  evoluir ele pode enviar mais informações". Por isso **não é criada nenhuma tabela separada de
  "eventos"/"erros"** agora — seria estrutura prematura pra um formato que ainda vai mudar; o
  `environment` do `Support` já é o lugar certo.
  - **Plataforma/versão/SO, no `mobile`:** vai ser feito com `expo-application`/`expo-device`
    (módulos oficiais do Expo — instalação nova, aceita, planejada pro próximo lançamento de versão
    do app junto desta feature). **Não reaproveitar** `mobile/src/libs/survey/device-info.ts` — o
    survey usa `expo-constants` pra outra finalidade e fica isolado de propósito (decisão do
    Christian: não misturar o que é do survey com o resto do app). O helper de ambiente desta
    feature nasce em módulo próprio no `mobile` (ex. `src/libs/moderation/device-info.ts` ou
    equivalente, a definir no ticket do lado mobile), sem importar nada de `libs/survey`.
  - **`expo-observe` (~56.0.27) já está instalado**, mas a feature "Errors"
    (https://docs.expo.dev/eas/observe/errors/) exige **Expo SDK 57** — o `mobile` está em `~56.0.19`.
    Upgrade de SDK é pré-requisito e é trabalho à parte (sub-issue no `mobile`, fora deste épico);
    mesmo depois de atualizado, `Errors` reporta pro dashboard do EAS, um canal paralelo — não
    substitui `environment`, e o que ele capturar não precisa (nem faria sentido) ser replicado pra
    dentro do banco da API.
  - **Snapshot de erro JS**, enquanto o `mobile` não tem `expo-observe` Errors disponível: capturar
    via `ErrorUtils.setGlobalHandler` (núcleo do RN) e `ErrorBoundary`/`componentDidCatch` (núcleo
    do React) — sem pacote adicional além de `expo-application`/`expo-device` já citados — guardando
    mensagem/`stack`/stack de componente/timestamp local até o usuário abrir "reportar problema" e
    enviar manualmente. Cobre erro JS; não cobre crash nativo (código Kotlin/Swift) — isso segue
    exigindo handler nativo próprio ou lib de crash reporting (Sentry, Crashlytics, EAS Observe
    Errors quando disponível), fora de escopo por ora.
  - **Web:** versão do app injetada em build-time (ex. `import.meta.env.VITE_APP_VERSION`),
    `platform: "web"` fixo, sem `os_version`/`last_error` por ora.
  O schema Zod (`supportEnvironmentSchema`, T01) só valida os campos que a API já conhece hoje;
  qualquer chave nova que o `mobile` mandar no futuro passa por ele sem quebrar (campo `Json?` no
  Prisma, schema Zod não precisa de `strict()`/`passthrough()` explícito — Zod já ignora chaves
  extras por padrão, o que preserva no banco depende de gravar o objeto bruto recebido, não só os
  campos validados; se isso importar, gravar `environment` como o payload original, não a saída do
  `.parse()`). O servidor só recebe o JSON que o client decidiu mandar no momento do envio; não há
  nenhum acesso do backend ao SO do dispositivo do usuário, nem coleta em background que se envie
  sozinha sem ação do usuário.
- **Rota do usuário e rota de moderação são endpoints diferentes, sem sobreposição de verbos.**
  A web hoje chama `POST /v1/moderation/support` — essa rota **sai do prefixo `/moderation`**.
  Criação, listagem-das-próprias, atualização-da-própria e cancelamento passam a viver em
  `POST/GET/PATCH /v1/support` e `POST/GET/PATCH /v1/denunciations` (namespace do reporter).
  `/v1/moderation/support` e `/v1/moderation/denunciations` passam a expor só `GET` (lista/
  detalhe) e `PATCH` (responder + mudar status/severidade) — nenhum `POST` de criação. Isso é
  breaking change pro client web atual: o consumo de `POST /v1/moderation/support` precisa migrar
  pra `POST /v1/support` antes/junto do deploy — abrir sub-issue em `web` pra trocar o endpoint
  (fora deste repo, ver Fora de escopo).
- **Status compartilhado entre `Support` e `Denunciation`, substituindo os enums próprios do plano
  anterior.** A rodada de planejamento anterior decidiu enum próprio por entidade (`ModerationStatus`
  PENDING/APPROVED/REJECTED pro suporte, `DenunciationStatus` PENDING/REVIEWED/CLOSED/DISMISSED pra
  denúncia) porque os fluxos pareciam divergentes. Na prática, o usuário final precisa enxergar o
  mesmo vocabulário de status nos dois — "aberta", "fechada", "cancelada", "resolvida" — então essa
  decisão é **revertida**: `ModerationStatus` é redefinido (`OPEN | CLOSED | CANCELLED | RESOLVED`,
  default `OPEN`) e passa a ser usado por `Support` **e** `Denunciation`. Hoje em produção só existe
  a coluna `SupportRequest.status` (após o rename, `Support.status`) com valor sempre `PENDING`
  (nunca saiu disso) — migração segura, não há linha com `APPROVED`/`REJECTED` pra remapear.
  `CANCELLED` só é setado pelo próprio reporter (rota do usuário); `CLOSED`/`RESOLVED` só pela
  moderação; `OPEN` é o estado inicial dos dois.
- **Severidade nova, comum às duas entidades.** `ModerationSeverity`
  (`LOW | MEDIUM | HIGH | CRITICAL`, exibida como baixa/média/alta/muito alta), nullable, default
  `null` (não triado ainda). Só a moderação seta — parte do mesmo `PATCH` que muda status/responde.
- **Resposta da moderação é visível pro reporter.** O campo de auditoria (`reason`, já previsto no
  plano anterior para `moderated_by`/`moderated_at`) passa a ser devolvido também na rota do
  usuário como a explicação da decisão — não é só metadado interno de auditoria.
- **`Support`/`Denunciation` identificam o usuário logado quando houver, mas criação continua
  pública.** O `user_id?` já existe no schema e no use-case de suporte
  (`create-support-request-use-case.ts:37`, após o rename `create-support-use-case.ts`) mas nunca
  é preenchido, porque a rota não lê a sessão. Criação segue **pública** (usuário sem conta
  continua podendo abrir pedido/denúncia), mas quando um Bearer token válido vier junto, o
  `user_id` é extraído e gravado, e `reporter_email` é preenchido com o e-mail da sessão (valor do
  body, se vier, é ignorado). Sem token → `user_id: null`, `reporter_email` vem do body e é
  obrigatório (ver decisão acima). **Consequência:** listar/atualizar/cancelar "os meus" exige
  sessão —
  quem reportou anônimo perde a capacidade de acompanhar depois (aceito; rastreio anônimo por
  token de acesso fica fora de escopo, ver abaixo).
- **Leitura/gestão de suporte e denúncias, do lado da moderação, entram direto atrás de
  `requireRole("moderator")`.** A issue original (api#58, api#61) previa um passo intermediário com
  `verify-jwt` "provisório" até E02 existir — E02 (`api#63`) já está fechado, `requireRole` já é
  usado em `moderation-user-routes.ts`. Não há razão pra passar pelo estado provisório.
- **Trilha de auditoria (`moderated_by`, `moderated_at`, `reason`) entra em ambas as entidades**
  (`Support`, `Denunciation`) na mesma migração, feita depois que as duas já existem, em vez de
  cada ticket anterior inventar o campo isoladamente.
- **Ação "banir a partir de uma denúncia" reaproveita `BanUserUseCase`/`RevokeUserSessionsUseCase`
  já existentes** (`src/modules/moderation/use-cases/admin/`) — o ticket de auditoria não recria
  lógica de ban, só adiciona o use-case de moderação que orquestra: valida denúncia, chama ban,
  grava auditoria.

## Fora de escopo

- Mobile (M03, `mobile#39`) e painel web (M06, `web#38`) — sub-issues nos repos deles, consomem os
  endpoints daqui depois que existirem.
- **Migração do client web de `POST /v1/moderation/support` pra `POST /v1/support`** — sub-issue
  em `web`, coordenar deploy (fora deste repo, mas é bloqueio pro corte do endpoint antigo).
- Rastreio de pedido/denúncia anônima por token/código de acesso (pra listar/cancelar sem login) —
  não pedido, fica pra quando houver demanda.
- CRUD de usuário em si (`/v2/moderation/users`) — já implementado, não é ticket deste épico.
- Hierarquia de papéis de moderação (só existe `moderator`, sem níveis) — fora de escopo desde a
  decisão original em `plans/organizacoes-papeis/00-tech-plan.md`.
- **Captura de crash nativo (processo morrendo em código Kotlin/Swift) e observabilidade
  completa** — o snapshot de erro que este épico cobre é só o nível JS (`ErrorUtils`/
  `ErrorBoundary`, sem pacote); crash nativo real e/ou uma central de observabilidade de verdade
  exigem lib dedicada (Sentry, Crashlytics, EAS Observe Errors quando sair do early-access), que é
  observabilidade, não moderação, e fica fora deste épico — o Christian já decidiu revisitar
  isso mais à frente.
- Implementação client-side de `environment`/`last_error` no `mobile` (instalar
  `expo-application`/`expo-device`, helper isolado do survey, `ErrorUtils`/`ErrorBoundary`) —
  **mobile#204**, vinculada a este épico; este épico só define o formato de `environment` que a
  API aceita (ver decisão acima).
- Upgrade de Expo SDK 56→57 no `mobile` (pré-requisito pra `expo-observe` Errors) — registrado como
  fora de escopo em mobile#204, trabalho à parte quando priorizado.
- Remoção/ocultação do conteúdo denunciado além do registro `Denunciation` (perfil de company,
  avaliação etc.) — sem alvo de conteúdo modelado ainda; fica pra quando esse alvo existir.

## Tickets

Ver `tickets/`. Execução sequencial nesta mesma branch (`58-replanejamento-epico-moderacao`), sem
paralelismo — status abaixo é atualizado a cada ticket concluído.

- **[x] T01** — Modelo de dados de `Support`: rename de `SupportRequest`, `type`, `user_id`,
  `reporter_email`, `environment`, status compartilhado (`OPEN|CLOSED|CANCELLED|RESOLVED`) e
  `severity`. Substitui api#60 (M04). Pré-requisito de nada, pode rodar já.
- **[ ] T02** — Módulo `Denunciation` completo (schema, entidade, DTOs, repositório, use-cases de
  criação/anexo), já nascendo com o status/severity/`reporter_email` compartilhados de T01. Fecha
  api#59 (M02).
- **[ ] T03** — Rotas do **usuário** (`/v1/support`, `/v1/denunciations`): criar (pública, extrai
  sessão se houver), listar as próprias, ver detalhe, atualizar (enquanto `OPEN` e sem moderação),
  cancelar. Substitui o `POST /v1/moderation/support` atual. Depende de T01 e T02.
- **[ ] T04** — Rotas de **moderação** (`/v1/moderation/support`, `/v1/moderation/denunciations`):
  listar, ver detalhe, responder + mudar status/severidade, com trilha de auditoria
  (`moderated_by`/`moderated_at`/`reason`). Fecha api#58 (M01) e api#59 (M02) no que é gestão.
  Depende de T01 e T02.
- **[ ] T05** — Ação "banir usuário denunciado a partir de uma denúncia" (reaproveita `BanUserUseCase`/
  `RevokeUserSessionsUseCase`), fecha o que resta de api#61 (M05). Depende de T02 e T04.

Ordem de execução real: T01 → T02 → T03 → T04 → T05, sequencial (sem paralelismo).

## Verificação (roda no fim de cada ticket)

- `npx tsc --noEmit`
- `npm run lint`
- `npm run test`
- `npm run test:integration` quando o ticket mexe em repositório Prisma
- Teste manual via Swagger (`/docs`): fluxo público (sem token) e autenticado, e o efeito de cada
  transição de status
