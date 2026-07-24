# Épico: Moderação — suporte, denúncias internas, reporte de erros e painel

> **Estado**: issues criadas no GH Project em 23/07/2026. Épico guarda-chuva: [api#57](https://github.com/oikos-circular-environment/api/issues/57).

## Contexto

A moderação do Oikos estava espalhada em frentes soltas, sem dono comum:

1. **Suporte** — implementado e operante na web (api#47, web#30, web#32). Módulo `src/modules/moderation/` com `SupportRequest` + `SupportRequestAttachment` e apenas `POST /v1/support-requests`.
2. **Denúncia interna** (conteúdo/perfil inadequado no app) — só planejada. O plano estava no corpo de `mobile#39`, repo errado, e em `plans/moderation-denunciations.md`.
3. **Reporte de erro pelo usuário** — só ideia.
4. **Gestão de usuários** — planejada como E02 do épico de auth (api#8), `/v2/users` API-only.

Este épico reúne (1)–(3) e declara a dependência sobre (4). Não confundir com **complaints** (denúncias ambientais, com geolocalização, votação e quórum) — aquilo é produto, isto é moderação da plataforma.

## Buraco encontrado no levantamento

`SupportRequest.status` (`ModerationStatus`) existe no schema, mas nenhuma rota transita esse status e não há listagem nem detalhe. A web já coleta pedidos de suporte **em produção** e ninguém consegue lê-los pela API. Daí M01 ser a única sub-issue P1.

## Sub-issues

| # | Issue | Escopo | Repo | Prioridade |
|---|---|---|---|---|
| M01 | [api#58](https://github.com/oikos-circular-environment/api/issues/58) | Gestão de support requests na API (list/get/status) | api | P1 |
| M02 | [api#59](https://github.com/oikos-circular-environment/api/issues/59) | Módulo de denúncias internas (denunciations) | api | P2 |
| M03 | [mobile#39](https://github.com/oikos-circular-environment/mobile/issues/39) | Fluxo de denúncia interna no mobile | mobile | P2 |
| M04 | [api#60](https://github.com/oikos-circular-environment/api/issues/60) | Reporte de erro pelo usuário (error reports) | api | P2 |
| M05 | [api#61](https://github.com/oikos-circular-environment/api/issues/61) | Ações de moderação sobre usuário e conteúdo | api | P2 |
| M06 | [web#38](https://github.com/oikos-circular-environment/web/issues/38) | Painel de moderação (superfície visual) | web | P2 |

O detalhamento completo de cada frente está no corpo das issues — este arquivo é só o mapa.

## Decisões

- **Guarda-chuva na api**: é onde vivem o módulo `moderation`, o schema e o `ModerationStatus`. Frentes de cliente entram como sub-issues em `mobile`/`web`.
- **`/v2/users` continua no api#8**: é identidade e RBAC, não moderação. Este épico só consome.
- **Um módulo, várias entidades**: `support_requests`, `denunciations` e `error_reports` convivem em `src/modules/moderation/`, compartilhando `ModerationStatus` e o padrão de attachments.
- **`mobile#39` foi reescrita** (não fechada): título e corpo passaram a cobrir só o lado mobile, preservando histórico e o item já existente no Project. O plano de API que estava nela foi absorvido por M02.
- **Só M01 é para agora.** O resto é registro de intenção.

## Dependências

- **M05 (api#61) → E02 (api#63)** — roles e `require-role`.
- **M06 (web#38) → M01, M02, M04** — não há painel sem endpoints de leitura.
- M01 pode ser feito com o JWT v1; a proteção por papel de moderador chega em M05.

## Relação com o épico de auth

[`00-overview.md`](./00-overview.md) descreve o épico api#8 (Better Auth). O ponto de contato é único e explícito: E02 entrega as primitivas de conta (ban, revogação de sessão, hard reset, remoção) que M05 usa para agir sobre usuários denunciados.
