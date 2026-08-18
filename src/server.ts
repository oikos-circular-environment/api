import { app } from "./app.js";
import { env } from "./env/index.js";

if (process.env.REDIS_URL) {
	const { createResolveByQuorumWorker } = await import(
		"./modules/complaints/workers/index.js"
	);
	createResolveByQuorumWorker();

	const { createAccountDeletionWorker } = await import(
		"./modules/accounts/workers/index.js"
	);
	createAccountDeletionWorker();
}

app
	.listen({
		host: "0.0.0.0",
		port: env.PORT,
	})
	.then(() => {
		console.log(`Server is running on http://localhost:${env.PORT}`);
		console.log(
			`API documentation available at http://localhost:${env.PORT}/docs`,
		);
	});

// Graceful shutdown: fecha o Fastify antes de encerrar o processo,
// dando ao SDK OTel (src/lib/otel.ts) tempo para fazer flush dos spans pendentes.
const shutdown = async () => {
	await app.close();
	process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
