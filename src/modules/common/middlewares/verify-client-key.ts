import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";
import {
	type ApiClientRecord,
	findApiClientByRawKey,
} from "../providers/api-client/api-client-provider.js";

type ClientKeyLookup = (rawKey: string) => Promise<ApiClientRecord | null>;

// Nao le `env` diretamente (import de @/env/index.js falha em unit tests
// puros, que nao carregam dotenv) - quem monta a instancia real (app.ts) ja
// depende de env e repassa o valor explicitamente.
export function createVerifyClientKey(options: {
	enforce: boolean;
	lookup?: ClientKeyLookup;
}) {
	const { enforce } = options;
	const lookup = options.lookup ?? findApiClientByRawKey;

	return async function verifyClientKey(request: FastifyRequest) {
		const header = request.headers["x-client-key"];
		const rawKey = Array.isArray(header) ? header[0] : header;

		const client = rawKey ? await lookup(rawKey) : null;

		if (client) {
			request.apiClient = client;
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
