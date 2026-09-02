# Moderação — suporte, denúncias internas e ações de moderação

Re-planejamento do épico [api#57](https://github.com/oikos-circular-environment/api/issues/57).
O plano original (issue + `plans/moderation-denunciations.md`) foi escrito antes do Better Auth
(`api#8`) fechar E02 — hoje `require-role("moderator")` e `/v2/moderation/users` (ban, unban,
sessões, papel) já existem e estão em produção. Este documento substitui o mapa de escopo da
issue #57 com o estado real do código (checado em `src/modules/moderation/` nesta sessão) e ajusta
duas decisões de escopo pedidas pelo Christian.

## Contexto

Quatro frentes vivem sob o guarda-chuva `moderation`:

1. **Suporte** (`SupportRequest`) — `POST /v1/moderation/support` implementado e em produção
   (web já coleta). Só tem `title`/`description`/anexos — sem tipo, sem identificar o usuário
   logado, sem rota de leitura/gestão (`status` nunca sai de `PENDING`).
2. **Denúncia interna** (conteúdo/perfil inadequado) — planejada em detalhe em
   `plans/moderation-denunciations.md` (vira `Denunciation`, distinto de `Complaint`), nada
   implementado ainda.
3. **Ações de moderação** — a parte de CRUD de usuário (listar, banir, revogar sessão, papel) já
   está pronta em `moderation-user-routes.ts`, atrás de `requireRole("moderator")`. O que falta é
   ligar essas ações a uma denúncia concreta e registrar quem/quando/por quê moderou.
4. **Painel** (web#38) — fora deste repo, só consome os endpoints de leitura daqui.

`Complaint` (denúncia ambiental, geolocalização, quórum, votação) **não faz parte deste épico** —
é produto, não moderação da plataforma. Todo ticket abaixo evita reaproveitar nome ou schema de
`complaints`.

## Decisões

- **Reporte de erro não vira entidade própria, mas leva metadado de ambiente.** A issue original
  (M04, api#60) desenhava `ErrorReport` como tabela separada com `context` técnico. O Christian
  decidiu: em vez de entidade própria, `SupportRequest` ganha `type` (`ERROR | SUPPORT | IMPROVEMENT`)
  e um campo `environment` (JSON opcional) — plataforma (`ios`/`android`/`web`), versão do app,
  build, SO/versão do SO. É metadado estático que caracteriza *onde* o problema aconteceu, enviado
  pelo cliente (mobile/web) junto do pedido — não telemetria de crash (sem stack trace, sem captura
  automática de exception). O app manda o que já sabe de si mesmo no momento do envio; não há
  coleta em background. Isso ainda é diferente de observabilidade (OTel/devops), que continua fora
  de escopo. api#60 fica substituído por T01 abaixo.
- **`SupportRequest` passa a identificar o usuário logado quando houver.** Hoje a rota é pública e
  nunca extrai sessão — o `user_id?` já existe no schema e no use-case (`create-support-request-use-case.ts:37`)
  mas nunca é preenchido, porque a rota não lê a sessão. Segue **pública** (usuário sem conta
  continua podendo abrir pedido), mas quando um Bearer token válido vier junto, o `user_id` é
  extraído e gravado. Sem token → `user_id: null`, sem erro.
- **Leitura/gestão de suporte e denúncias entram direto atrás de `requireRole("moderator")`.**
  A issue original (api#58, api#61) previa um passo intermediário com `verify-jwt` "provisório" até
  E02 existir — E02 (`api#63`) já está fechado, `requireRole` já é usado em
  `moderation-user-routes.ts`. Não há razão pra passar pelo estado provisório: T02 e T03 nascem
  direto com `verify-session` + `requireRole("moderator")`, no mesmo padrão de
  `moderation-user-routes.ts`.
- **Denunciation mantém enum de status próprio (`DenunciationStatus`), não reaproveita
  `ModerationStatus`.** A issue #57 original previa um enum único compartilhado entre
  `support_requests`/`denunciations`/`error_reports`. Na prática os fluxos já divergiram:
  `ModerationStatus` (suporte) é `PENDING/APPROVED/REJECTED` — decisão binária sobre um pedido;
  denúncia precisa de `PENDING/REVIEWED/CLOSED/DISMISSED` — fluxo de triagem. Forçar um enum só
  pra cumprir "um módulo compartilhado" cria valores sem sentido num dos dois lados. O módulo
  continua compartilhado (`src/modules/moderation/`), o schema de status não.
- **Trilha de auditoria (`moderated_by`, `moderated_at`, `reason`) entra em ambas as entidades
  (`SupportRequest`, `Denunciation`) na mesma migração**, feita depois que as duas já existem
  (T04), em vez de cada ticket anterior inventar o campo isoladamente.
- **Ação "banir a partir de uma denúncia" reaproveita `BanUserUseCase`/`RevokeUserSessionsUseCase`
  já existentes** (`src/modules/moderation/use-cases/admin/`) — T04 não recria lógica de ban, só
  adiciona o use-case de moderação que orquestra: valida denúncia, chama ban, grava auditoria.

## Fora de escopo

- Mobile (M03, `mobile#39`) e painel web (M06, `web#38`) — sub-issues nos repos deles, consomem os
  endpoints daqui depois que existirem.
- CRUD de usuário em si (`/v2/moderation/users`) — já implementado, não é ticket deste épico.
- Hierarquia de papéis de moderação (só existe `moderator`, sem níveis) — fora de escopo desde a
  decisão original em `plans/organizacoes-papeis/00-tech-plan.md`.
- Captura automática de contexto técnico de erro (crash/stack) — observabilidade, não moderação.

## Tickets

Ver `tickets/`:

- **T01** — `SupportRequest` ganha `type` (`ERROR | SUPPORT | IMPROVEMENT`) e captura `user_id` do
  Bearer token quando presente. Substitui api#60 (M04). Pré-requisito de nada, pode rodar já.
- **T02** — Gestão de support requests: `GET /moderation/support`, `GET /moderation/support/:id`,
  `PATCH /moderation/support/:id/status`, atrás de `requireRole("moderator")`. Fecha api#58 (M01).
  Depende de T01 (response schema já inclui `type`).
- **T03** — Módulo `Denunciation` completo (schema, entidade, DTOs, repositório, use-cases, rotas),
  migrado e atualizado a partir de `plans/moderation-denunciations.md`. Fecha api#59 (M02).
  Independente de T01/T02, pode rodar em paralelo.
- **T04** — Trilha de auditoria (`moderated_by`/`moderated_at`/`reason`) em `SupportRequest` e
  `Denunciation` + ação "banir usuário denunciado a partir de uma denúncia". Fecha o que resta de
  api#61 (M05) — o CRUD de usuário em si já está pronto. Depende de T02 e T03.

Ordem sugerida: T01 → T02 → T03 → T04 (T03 pode andar em paralelo a T01/T02, mas T04 precisa das
duas entidades existindo).

## Verificação (roda no fim de cada ticket)

- `npx tsc --noEmit`
- `npm run lint`
- `npm run test`
- `npm run test:integration` quando o ticket mexe em repositório Prisma
- Teste manual via Swagger (`/docs`): fluxo público (sem token) e autenticado, e o efeito de cada
  transição de status
