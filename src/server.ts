import { app } from "./app.js";
import { env } from "./env/index.js";

// Registra workers BullMQ apenas se REDIS_URL estiver configurado
if (process.env.REDIS_URL) {
	const { createResolveByQuorumWorker } =
		await import("./modules/complaints/workers/index.js");
	createResolveByQuorumWorker();
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
