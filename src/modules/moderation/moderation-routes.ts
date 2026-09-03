import type { FastifyInstance } from "fastify";
import { moderationDenunciationsRoutes } from "./moderation-denunciation-routes.js";
import { moderationSupportRoutes } from "./moderation-support-routes.js";
import { moderationUsersRoutes } from "./moderation-user-routes.js";

export async function moderationRoutes(app: FastifyInstance): Promise<void> {
	await app.register(moderationSupportRoutes, { prefix: "/v1" });
	await app.register(moderationDenunciationsRoutes, { prefix: "/v1" });
	await app.register(moderationUsersRoutes, { prefix: "/v2/moderation" });
}
