# DevOps — Observabilidade + Testes de Carga

## Contexto

A API não possuía nenhuma stack de observabilidade (sem OTel, sem Prometheus, sem Grafana) — apenas logs Pino gravados em `logs/server.log`. O objetivo foi instrumentar a API com OpenTelemetry e criar uma infraestrutura de observabilidade e testes de carga centralizada em `devops/`.

## Status: Implementado

---

## O que foi entregue

### `devops/observability/` — Stack Grafana

| Serviço | Imagem | Função |
|---|---|---|
| OTel Collector | `otel/opentelemetry-collector-contrib:0.120.0` | Recebe OTLP HTTP :4318, fan-out para Tempo/Prometheus/Loki |
| Prometheus | `prom/prometheus:v3.1.0` | Scrape métricas + remote write para k6 |
| Loki | `grafana/loki:3.4.1` | Agregação de logs (retentão 7 dias) |
| Tempo | `grafana/tempo:2.7.0` | Distributed tracing |
| Promtail | `grafana/promtail:3.4.1` | Tailing de `logs/*.log` → Loki (glob para capturar arquivos rotacionados) |
| Grafana | `grafana/grafana:11.5.0` | Dashboards provisionados automaticamente |
| Alertmanager | `prom/alertmanager:v0.27.0` | Roteamento de alertas (stubs Slack/email) |

**Dashboards provisionados:**
- `api-overview.json` — RPS, latência P50/P95/P99, taxa de erro, queries pg
- `queue-metrics.json` — BullMQ job rate, duração de jobs, Redis commands
- `k6-load-test.json` — VUs, RPS, error rate, latência durante load tests

### `devops/load-tests/` — Scripts k6

| Script | Carga | Objetivo |
|---|---|---|
| `smoke.js` | 2 VUs, 1 min | Sanity check pós-deploy |
| `load.js` | 0→50 VUs, 13 min | Carga realista (60% public, 30% auth read, 10% write) |
| `stress.js` | 0→200 VUs, ~23 min | Encontrar ponto de ruptura |
| `spike.js` | 0→200 VUs instantâneo | Teste de surge abrupto |
| `soak.js` | 20 VUs, 70 min | Detectar memory leak e pool saturation |

### Instrumentação OTel na API

- **`src/lib/otel.ts`** — SDK bootstrap com guard: sem `OTEL_EXPORTER_OTLP_ENDPOINT`, é no-op puro
- **`src/lib/logger.ts`** — mixin `otelMixin()` injeta `traceId`/`spanId` em cada log record do Pino; rotação via `pino-roll` (`frequency: daily`, `size: 20m`, `limit: 7`)
- **`src/app.ts`** — hook `onRequest` para binding de trace ID por-request
- **`src/server.ts`** — graceful shutdown via SIGTERM/SIGINT
- **`src/env/index.ts`** — `OTEL_EXPORTER_OTLP_ENDPOINT` opcional; string vazia equivale a `undefined`
- **`package.json`** — scripts `dev` e `start` com `--import ./src/lib/otel.ts`
- **`Dockerfile.prod`** — CMD com `node --import ./dist/lib/otel.js`

### Infra Docker

- **`docker-compose.prod.yml`** — API conectada às redes `default` (interna) e `oikos_obs` (OTel)
- **`docker-compose.obs-override.yml`** — removido; conteúdo absorvido pelo prod
- **`.env.prod.example`** — `OTEL_EXPORTER_OTLP_ENDPOINT=http://otelcol:4318` como padrão

---

## Decisões técnicas relevantes

**`PRISMA_QUERY_LOG=false` em produção com OTel ativo**
Com `PrismaInstrumentation` + `instrumentation-pg`, duração e operações chegam via spans. `PRISMA_QUERY_LOG` é redundante e tem custo de I/O. Habilitar apenas para debug pontual de SQL gerado.

**Logs: arquivos físicos são necessários mesmo com Loki**
O Promtail depende dos arquivos (`tail`). Sem eles, o Loki fica sem dados. Os arquivos também servem como fallback quando a obs stack não está rodando.

**Rotação de logs com `pino-roll`**
`server.log` ativo + até 7 arquivos rotacionados (`server.1.log` … `server.7.log`). Rola diariamente ou ao atingir 20 MB. Promtail usa glob `server*.log` para capturar todos. Posições salvas em `/tmp/promtail-positions.yaml` — sem reenvio ou perda durante rotação.

**Rede `oikos_obs` como external network**
Criada uma vez com `docker network create oikos_obs`. Compartilhada pelo `docker-compose.prod.yml` (API) e `docker-compose.observability.yml` (OTel Collector). Permite hostname resolution `otelcol` dentro da API.

---

## Startup

```bash
# 1. Env da obs stack
cp devops/observability/.env.observability.example devops/observability/.env.observability

# 2. Rede compartilhada (apenas uma vez)
docker network create oikos_obs

# 3. Stack de observabilidade
docker compose -f devops/observability/docker-compose.observability.yml up -d

# 4. API
docker compose -f docker-compose.prod.yml up -d
```

Ver `devops/README.md` para detalhes completos.

---

## Pacotes npm adicionados

```
@opentelemetry/sdk-node
@opentelemetry/api
@opentelemetry/auto-instrumentations-node
@opentelemetry/exporter-trace-otlp-http
@opentelemetry/exporter-metrics-otlp-http
@opentelemetry/sdk-metrics
@opentelemetry/resources
@opentelemetry/semantic-conventions
@prisma/instrumentation
pino-roll
```
