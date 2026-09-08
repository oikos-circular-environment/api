import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { healthCheckResponseSchema, runHealthChecks } from "./health-check.js";

export async function healthRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();

	typedApp.get(
		"/health",
		{
			schema: {
				tags: ["Health"],
				summary: "Health check",
				description:
					"Checks connectivity to the database, Redis and storage. Always returns HTTP 200; check the `status` field per resource.",
				security: [],
				response: {
					200: healthCheckResponseSchema,
				},
			},
		},
		() => runHealthChecks(),
	);
}
