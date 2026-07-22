import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";

export type ClientKeyEntry = { name: string; key: string };

function keysMatch(a: string, b: string): boolean {
	const bufferA = Buffer.from(a);
	const bufferB = Buffer.from(b);

	if (bufferA.length !== bufferB.length) {
		return false;
	}

	return timingSafeEqual(bufferA, bufferB);
}

export function createVerifyClientKey(options: {
	enforce: boolean;
	clients: ClientKeyEntry[];
}) {
	const { enforce } = options;
	const clients = options.clients.filter((client) => client.key.length > 0);

	return async function verifyClientKey(request: FastifyRequest) {
		const header = request.headers["x-client-key"];
		const rawKey = Array.isArray(header) ? header[0] : header;

		const match = rawKey
			? clients.find((client) => keysMatch(client.key, rawKey))
			: undefined;

		if (match) {
			request.apiClient = { name: match.name };
			return;
		}

		if (!enforce) {
			request.log.warn(
				{ url: request.url },
				"missing or invalid X-Client-Key (CLIENT_KEY_ENFORCE=false, request allowed)",
			);
			return;
		}

		throw new AppError(
			"Invalid or missing client key.",
			"INVALID_CLIENT_KEY",
			401,
		);
	};
}
