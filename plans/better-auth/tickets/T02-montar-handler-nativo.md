# T02 — Montar handler nativo `/api/auth/*`

**Status:** [x] Concluído
**Depende de:** T01
**Módulos:** `src/app.ts`, `src/server.ts`

## Contexto

Aditivo, não quebra nada: sobe o handler nativo do better-auth ao lado de
`/v1/auth` e `/v2/auth`, que continuam de pé até T04/T05. Objetivo é ter os
paths nativos (`/api/auth/sign-in/email`, `/api/auth/sign-up/email`, etc.)
respondendo em paralelo, pra web/mobile (T03) migrarem os clients contra algo
real.

## Implementação

Doc oficial (`/better-auth/better-auth`, integrations/fastify):

```ts
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./modules/auth/providers/auth/better-auth/better-auth.js";

app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  handler: async (request, reply) => {
    const url = new URL(request.url, `${request.protocol}://${request.hostname}`);
    const headers = fromNodeHeaders(request.headers);
    const req = new Request(url.toString(), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : (request.raw as unknown as BodyInit),
    });
    const response = await auth.handler(req);
    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    reply.send(response.body ? await response.text() : null);
  },
});
```

**Cuidado real, não pular**: Fastify por padrão já tem um content-type parser
JSON registrado (`request.body` chega parseado como objeto, stream já
consumido). Passar `request.raw` funciona só se essa rota estiver isenta do
parser padrão — ou registra essa rota **antes** de qualquer
`addContentTypeParser`/plugin que consuma o body pra `application/json`, ou usa
`toNodeHandler(auth)` de `better-auth/node` direto como handler bruto (bypassa
o ciclo normal do Fastify pra essa rota). Confirmar qual das duas formas
funciona testando com um `curl -X POST .../api/auth/sign-in/email` de verdade
antes de dar como pronto — não só tsc passando.

Registrar a rota **antes** de `app.register(authRoutes, {prefix: "/v1"})` etc.,
mas depois do CORS. Não precisa de body parser extra pra essa rota.

## Checklist

- [x] Implementar rota conforme acima. **Decisão: `request.body` parseado pelo
      Fastify + `JSON.stringify`, não `request.raw`** — o Fastify já consome o
      stream, re-serializar `request.body` (padrão da doc oficial) é mais robusto.
      Consequência: POST `application/json` com body vazio dá 400
      (`FST_ERR_CTP_EMPTY_JSON_BODY`) — esperado, clients oficiais sempre mandam
      `{}`.
- [x] Rodar dev server local e testar manualmente com `curl` no container
      `oikos-dev-api-1` (localhost:3333, infra de dev de pé):
      sign-up/email → 200, sign-in/email → 200 (token+bearer e cookie),
      get-session → 200 (por bearer e por cookie), sign-out (`{}`) → 200
      `{"success":true}`, get-session pós sign-out → 200 `null` (comportamento
      nativo, diverge do envelope v1/v2 que dava 401 — migração de client T03
      herda isso).
- [x] Confirmar `/docs` lista paths nativos: **não sem ajuste**. `generateOpenAPISchema()`
      devolve paths **relativos** (`/sign-in/email`), não `/api/auth/sign-in/email`.
      Fixture: prefixar `authSchema.paths` com `/api/auth` no `buildMergedOpenApiDocument`.
      Após o fix, `/docs/openapi.json` lista 66 paths `/api/auth/*`.
- [x] Boot real expôs **bug herdado da sessão anterior**: o merge de docs rodava
      num `onReady` hook raiz chamando `app.swagger()`, e o fastify-swagger exige
      `.ready()` JÁ executado (throws `.swagger() must be called after .ready()`).
      Corrigido no `server.ts`: `await app.ready()` → `buildMergedOpenApiDocument()`
      → `app.listen()`.
- [x] Sem helper extraível → nenhum `.spec.ts` novo. Suíte unit do módulo auth
      continua verde (13 files / 119 tests).
- [x] Nada quebrado (aditivo): `/v1/auth/login`, `/v2/auth/sign-in`, `/health`
      seguem 200.

## Testes

Smoke manual acima + specs unitários do módulo auth (13 files / 119 tests). Suíte
completa fica pro T06.
