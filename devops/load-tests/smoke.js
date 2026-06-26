/**
 * Smoke test — 2 VUs por 1 minuto.
 * Valida que os endpoints críticos respondem corretamente após um deploy.
 * Zero erros é o critério de sucesso (threshold http_req_failed < 1%).
 *
 * Uso:
 *   docker run --rm --network=host \
 *     -e BASE_URL=http://localhost:3333 \
 *     -v "$(pwd)/devops/load-tests:/scripts" \
 *     grafana/k6:latest run /scripts/smoke.js
 */
import http from "k6/http";
import { sleep, check } from "k6";
import { makeOptions, BASE_URL } from "./config/base-options.js";
import { checkOk } from "./helpers/checks.js";

export const options = makeOptions(
  [{ duration: "1m", target: 2 }],
  {
    http_req_failed: ["rate<0.001"],   // smoke: zero falhas aceitáveis
    http_req_duration: ["p(95)<1000"],
  }
);

export default function () {
  // Health check
  checkOk(http.get(`${BASE_URL}/health`), "health");
  sleep(0.3);

  // Categorias de resíduos (public, sem auth)
  const cats = http.get(`${BASE_URL}/v1/waste-categories`);
  check(cats, {
    "waste-categories: status 200": (r) => r.status === 200,
    "waste-categories: tem dados": (r) => r.json().length > 0,
  });
  sleep(0.3);

  // Market geoespacial (public, sem auth)
  checkOk(
    http.get(`${BASE_URL}/v1/market?lat=-23.5505&lon=-46.6333&radius=5000`),
    "market"
  );
  sleep(0.3);

  // Mapa de reclamações (public, sem auth)
  checkOk(
    http.get(
      `${BASE_URL}/v1/complaints/map?lat=-23.5505&lon=-46.6333&radius=5000`
    ),
    "complaints-map"
  );
  sleep(0.5);
}
