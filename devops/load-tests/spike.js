/**
 * Spike test — surge instantâneo de 0 para 200 VUs em 30s.
 * Testa como o sistema lida com picos abruptos (ex: push notification viral).
 *
 * O que observar:
 *   - Rate-limiter (100 req/min/IP) ativando → contador rate_limited_requests no k6 dashboard
 *   - Latência durante o spike e recuperação após ramp-down
 *   - Se o sistema se recupera para latência normal após o pico
 *
 * Uso:
 *   docker run --rm --network=host \
 *     -e BASE_URL=http://localhost:3333 \
 *     -e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
 *     -e K6_TEST_NAME=spike \
 *     -v "$(pwd)/devops/load-tests:/scripts" \
 *     grafana/k6:latest run --out=experimental-prometheus-rw /scripts/spike.js
 */

import { sleep } from "k6";
import http from "k6/http";
import { BASE_URL, makeOptions } from "./config/base-options.js";
import { checkOk } from "./helpers/checks.js";

export const options = makeOptions(
	[
		{ duration: "1m", target: 5 }, // baseline
		{ duration: "30s", target: 200 }, // spike instantâneo
		{ duration: "2m", target: 200 }, // sustenta o pico
		{ duration: "30s", target: 5 }, // drop brusco
		{ duration: "1m", target: 5 }, // verifica recuperação
		{ duration: "30s", target: 0 },
	],
	{
		http_req_failed: ["rate<0.05"], // spike: até 5% de erro aceitável
		http_req_duration: ["p(95)<5000"],
	},
);

export default function () {
	// Apenas endpoints públicos de leitura — simula usuários abrindo o app
	checkOk(
		http.get(
			`${BASE_URL}/v1/market?lat=-23.5505&lon=-46.6333&radius=5000&limit=5`,
		),
		"market",
	);
	sleep(0.2);

	checkOk(http.get(`${BASE_URL}/v1/waste-categories`), "waste-categories");
	sleep(0.2);

	checkOk(http.get(`${BASE_URL}/health`), "health");
	sleep(0.1);
}
