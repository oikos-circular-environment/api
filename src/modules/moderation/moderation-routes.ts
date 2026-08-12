import type { FastifyInstance } from "fastify";
import { moderationAdminRoutes } from "./moderation-admin-routes.js";
import { moderationSupportRoutes } from "./moderation-support-routes.js";

export async function moderationRoutes(app: FastifyInstance): Promise<void> {
	await app.register(moderationSupportRoutes, { prefix: "/v1" });
	await app.register(moderationAdminRoutes, { prefix: "/v2/moderation" });
}
