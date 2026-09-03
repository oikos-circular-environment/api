import type { FastifyInstance } from "fastify";
import { denunciationsUserRoutes } from "./denunciations-user-routes.js";
import { moderationDenunciationsRoutes } from "./moderation-denunciation-routes.js";
import { moderationSupportRoutes } from "./moderation-support-routes.js";
import { moderationUsersRoutes } from "./moderation-user-routes.js";
import { supportRoutes } from "./support-routes.js";

export async function moderationRoutes(app: FastifyInstance): Promise<void> {
	await app.register(supportRoutes, { prefix: "/v1" });
	await app.register(denunciationsUserRoutes, { prefix: "/v1" });
	await app.register(moderationSupportRoutes, { prefix: "/v1" });
	await app.register(moderationDenunciationsRoutes, { prefix: "/v1" });
	await app.register(moderationUsersRoutes, { prefix: "/v2/moderation" });
}
