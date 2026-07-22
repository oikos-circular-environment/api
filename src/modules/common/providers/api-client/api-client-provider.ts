import { prisma } from "@/lib/prisma.js";
import { hashClientKey, hashesMatch } from "./client-key-hash.js";

export type ApiClientRecord = {
	id: string;
	name: string;
	rateLimit: number | null;
};

type CachedClient = ApiClientRecord & {
	hashedKey: string;
	expiresAt: Date | null;
};

// TTL curto em vez de bcrypt/comparacao por request: mantem revogacao efetiva
// em ate ~1min sem gerar uma query de banco a cada requisicao. Cacheamos a
// lista inteira de clientes ativos (poucos, fixos) em vez de indexar por chave
// recebida — evita crescimento ilimitado de cache por chaves forjadas.
const CACHE_TTL_MS = 60_000;

let cache: { clients: CachedClient[]; cachedAt: number } | null = null;

async function getActiveClients(): Promise<CachedClient[]> {
	if (cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
		return cache.clients;
	}

	const rows = await prisma.apiClient.findMany({ where: { active: true } });

	const clients: CachedClient[] = rows.map((row) => ({
		id: row.id,
		name: row.name,
		rateLimit: row.rate_limit,
		hashedKey: row.hashed_key,
		expiresAt: row.expires_at,
	}));

	cache = { clients, cachedAt: Date.now() };

	return clients;
}

export async function findApiClientByRawKey(
	rawKey: string,
): Promise<ApiClientRecord | null> {
	const incomingHash = hashClientKey(rawKey);
	const clients = await getActiveClients();

	const match = clients.find((client) =>
		hashesMatch(client.hashedKey, incomingHash),
	);

	if (!match) {
		return null;
	}

	if (match.expiresAt && match.expiresAt.getTime() < Date.now()) {
		return null;
	}

	return { id: match.id, name: match.name, rateLimit: match.rateLimit };
}

export function invalidateApiClientCache(): void {
	cache = null;
}
