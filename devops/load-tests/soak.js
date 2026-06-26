/**
 * Soak test — 20 VUs por 70 minutos.
 * Detecta memory leaks, saturação do pg connection pool e degradação gradual.
 *
 * O que observar no Grafana durante o teste:
 *   - Heap Node.js crescendo monotonicamente ao longo de 60 min → memory leak
 *   - pg pool wait time aumentando → pool saturado (max 20 conexões)
 *   - P95 latência subindo gradualmente → degradação de performance
 *   - Redis comandos aumentando → fila BullMQ crescendo sem consumo
 *
 * Este teste exige que a API esteja instrumentada com OTel para observar o heap.
 * Dica: abra o dashboard "Oikos API — Overview" antes de iniciar.
 *
 * Uso:
 *   docker run --rm --network=host \
 *     -e BASE_URL=http://localhost:3333 \
 *     -e TEST_USER_EMAIL=user@example.com \
 *     -e TEST_USER_PASSWORD=senha \
 *     -e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
 *     -e K6_TEST_NAME=soak \
 *     -v "$(pwd)/devops/load-tests:/scripts" \
 *     grafana/k6:latest run --out=experimental-prometheus-rw /scripts/soak.js
 */

import { sleep } from "k6";
import http from "k6/http";
import { BASE_URL, makeOptions } from "./config/base-options.js";
import { authHeaders, getToken } from "./helpers/auth.js";
import { checkOk } from "./helpers/checks.js";

export const options = makeOptions(
	[
		{ duration: "5m", target: 20 }, // ramp-up
		{ duration: "60m", target: 20 }, // soak: 1 hora
		{ duration: "5m", target: 0 }, // ramp-down
	],
	{
		http_req_failed: ["rate<0.005"],
		http_req_duration: ["p(95)<1000"],
	},
);

export function setup() {
	const email = __ENV.TEST_USER_EMAIL;
	const password = __ENV.TEST_USER_PASSWORD;
	if (!email || !password) return { token: null };
	return { token: getToken(BASE_URL, email, password) };
}

export default function ({ token }) {
	// Mix completo para exercitar o pool de conexões e BullMQ
	checkOk(
		http.get(`${BASE_URL}/v1/market?lat=-23.5505&lon=-46.6333&radius=5000`),
		"market",
	);
	sleep(1);

	checkOk(
		http.get(
			`${BASE_URL}/v1/complaints/map?lat=-23.5505&lon=-46.6333&radius=5000`,
		),
		"complaints-map",
	);
	sleep(1);

	if (token) {
		const opts = authHeaders(token);
		checkOk(http.get(`${BASE_URL}/v1/complaints`, opts), "complaints-list");
		sleep(1);
	}

	checkOk(http.get(`${BASE_URL}/v1/waste-categories`), "waste-categories");
	sleep(1);

	checkOk(http.get(`${BASE_URL}/health`), "health");
	sleep(1);
}
