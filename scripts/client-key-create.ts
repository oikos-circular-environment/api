/**
 * Gera uma nova client-key (credencial de cliente oficial: mobile, web) e
 * persiste apenas o hash SHA-256 no banco. A raw key e impressa uma unica vez
 * — quem rodar este script e responsavel por guardar o valor (GitHub Secrets,
 * gerenciador de segredos, etc). A API nunca armazena a raw key.
 *
 * Ver docs/api-key-methodology.md e plans/plano-seguranca-api-key.md (raiz do
 * pseudo-monorepo oikos).
 *
 * Uso:
 *   npm run client-key:create -- --name mobile
 *   npm run client-key:create -- --name web --rate-limit 200
 */

import { randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { hashClientKey } from "../src/modules/common/providers/api-client/client-key-hash.js";

function parseArgs(argv: string[]): { name: string; rateLimit?: number } {
	const nameIndex = argv.indexOf("--name");
	if (nameIndex === -1 || !argv[nameIndex + 1]) {
		console.error(
			"Uso: npm run client-key:create -- --name <nome> [--rate-limit <n>]",
		);
		process.exit(1);
	}
	const name = argv[nameIndex + 1] as string;

	const rateLimitIndex = argv.indexOf("--rate-limit");
	const rateLimit =
		rateLimitIndex !== -1 && argv[rateLimitIndex + 1]
			? Number(argv[rateLimitIndex + 1])
			: undefined;

	return { name, rateLimit };
}

async function main() {
	const { name, rateLimit } = parseArgs(process.argv.slice(2));

	const rawKey = randomBytes(32).toString("hex");
	const hashedKey = hashClientKey(rawKey);

	await prisma.apiClient.upsert({
		where: { name },
		create: { name, hashed_key: hashedKey, rate_limit: rateLimit },
		update: { hashed_key: hashedKey, active: true, rate_limit: rateLimit },
	});

	console.log(`Client-key criada/rotacionada para "${name}".`);
	console.log("Guarde este valor agora — ele nao sera exibido novamente:");
	console.log(rawKey);
}

main()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
