/**
 * Stress test — ramp progressivo até 200 VUs para encontrar o ponto de ruptura.
 *
 * O que observar no Grafana durante o teste:
 *   - P95 latência ultrapassando 2s → gargalo de CPU ou pool de conexões
 *   - Taxa de erro 5xx subindo → API sobrecarregada
 *   - Rate-limit 429 ativo → espera; não é erro, é defesa intencional
 *   - Heap Node.js crescendo → possível memory pressure
 *   - pg pool wait time aumentando → max_connections insuficiente
 *
 * Uso:
 *   docker run --rm --network=host \
 *     -e BASE_URL=http://localhost:3333 \
 *     -e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
 *     -e K6_TEST_NAME=stress \
 *     -v "$(pwd)/devops/load-tests:/scripts" \
 *     grafana/k6:latest run --out=experimental-prometheus-rw /scripts/stress.js
 */
import http from "k6/http";
import { sleep } from "k6";
import { makeOptions, BASE_URL } from "./config/base-options.js";
import { checkOk } from "./helpers/checks.js";

// Stress: thresholds intencionalmente relaxados — queremos ver onde quebra
export const options = makeOptions(
  [
    { duration: "3m", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "3m", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "3m", target: 150 },
    { duration: "2m", target: 150 },
    { duration: "3m", target: 200 },
    { duration: "3m", target: 200 },
    { duration: "2m", target: 0 },
  ],
  {
    http_req_failed: ["rate<0.10"],   // toleramos até 10% de erro em stress
    http_req_duration: ["p(95)<5000"],
  }
);

export default function () {
  // Foco nos endpoints públicos mais pesados (PostGIS queries)
  checkOk(
    http.get(`${BASE_URL}/v1/market?lat=-23.5505&lon=-46.6333&radius=5000`),
    "market"
  );
  sleep(0.5);

  checkOk(
    http.get(
      `${BASE_URL}/v1/complaints/map?lat=-23.5505&lon=-46.6333&radius=5000`
    ),
    "complaints-map"
  );
  sleep(0.5);

  checkOk(http.get(`${BASE_URL}/v1/waste-categories`), "waste-categories");
  sleep(0.3);

  checkOk(http.get(`${BASE_URL}/health`), "health");
  sleep(0.2);
}
