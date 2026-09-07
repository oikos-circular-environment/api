# T06 — Suíte completa + PR

**Status:** [ ] Pendente
**Depende de:** T01, T02, T03, T04, T05
**Módulos:** todo o repo

## Contexto

Ponto único onde a suíte roda inteira. Todos os tickets anteriores só rodaram
unitário do que tocaram — aqui é a checagem final antes de abrir PR pra
`development`.

## Checklist

- [ ] `npm run test` (suíte unitária completa).
- [ ] `npm run test:integration` (infra local up: `docker compose up postgresql
      redis minio createbuckets`).
- [ ] `npm run test:coverage` — checar se sobrou gap de cobertura nas áreas
      tocadas (handler nativo, providers).
- [ ] Smoke manual via `/docs`: sign-up, sign-in, get-session, sign-out,
      change-password, forgot/reset-password, verify-email — tudo batendo em
      `/api/auth/*`.
- [ ] Confirmar `/v1` e `/v2` retornam 404 (rotas de fato removidas, não só
      código morto).
- [ ] Abrir PR pra `development`: corpo só com `## Contexto` + `## O que foi
      feito` (sem checklist de pendência — pendência que sobrar vira issue
      nova, não texto no PR).

## Testes

Suíte completa, conforme acima.
