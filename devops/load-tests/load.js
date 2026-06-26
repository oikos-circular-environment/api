/**
 * Load test — simula carga realista com ramp-up gradual até 50 VUs.
 * Mix de tráfego: 60% browse público, 30% leitura autenticada, 10% escrita.
 *
 * Pré-requisitos:
 *   TEST_USER_EMAIL e TEST_USER_PASSWORD com um usuário válido no banco.
 *
 * Uso:
 *   docker run --rm --network=host \
 *     -e BASE_URL=http://localhost:3333 \
 *     -e TEST_USER_EMAIL=user@example.com \
 *     -e TEST_USER_PASSWORD=senha \
 *     -e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
 *     -e K6_TEST_NAME=load \
 *     -v "$(pwd)/devops/load-tests:/scripts" \
 *     grafana/k6:latest run --out=experimental-prometheus-rw /scripts/load.js
 */

import { sleep } from "k6";
import http from "k6/http";
import { BASE_URL, makeOptions } from "./config/base-options.js";
import { authHeaders, getToken } from "./helpers/auth.js";
import { checkOk } from "./helpers/checks.js";

export const options = makeOptions([
	{ duration: "2m", target: 10 }, // ramp-up
	{ duration: "2m", target: 10 }, // warm hold
	{ duration: "3m", target: 50 }, // ramp-up para carga nominal
	{ duration: "4m", target: 50 }, // hold
	{ duration: "2m", target: 0 }, // ramp-down
]);

export function setup() {
	const email = __ENV.TEST_USER_EMAIL;
	const password = __ENV.TEST_USER_PASSWORD;
	if (!email || !password) return { token: null };
	return { token: getToken(BASE_URL, email, password) };
}

export default function ({ token }) {
	const roll = Math.random();

	if (roll < 0.6) {
		// 60% — browse público (sem auth)
		publicBrowse();
	} else if (roll < 0.9) {
		// 30% — leitura autenticada
		if (token) authenticatedRead(token);
		else publicBrowse();
	} else {
		// 10% — escrita (autenticada)
		if (token) authenticatedWrite(token);
		else publicBrowse();
	}
}

function publicBrowse() {
	checkOk(
		http.get(
			`${BASE_URL}/v1/market?lat=-23.5505&lon=-46.6333&radius=5000&limit=10`,
		),
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

	checkOk(http.get(`${BASE_URL}/v1/waste-categories`), "waste-categories");
	sleep(1);
}

function authenticatedRead(token) {
	const opts = authHeaders(token);

	checkOk(http.get(`${BASE_URL}/v1/complaints`, opts), "complaints-list");
	sleep(1);

	checkOk(http.get(`${BASE_URL}/health`), "health");
	sleep(1);
}

function authenticatedWrite(token) {
	const opts = authHeaders(token);

	// Listar complaints para pegar um ID real
	const list = http.get(`${BASE_URL}/v1/complaints`, opts);
	if (list.status !== 200) return;

	const complaints = list.json("data");
	if (complaints && complaints.length > 0) {
		const id = complaints[0].id;
		checkOk(
			http.get(`${BASE_URL}/v1/complaints/${id}`, opts),
			"complaint-detail",
		);
	}
	sleep(2);
}
