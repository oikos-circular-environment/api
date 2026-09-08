import type { FastifyInstance } from "fastify";
import { denunciationRoutes } from "@/modules/denunciation/denunciation-routes.js";
import { supportRoutes } from "@/modules/support/support-routes.js";
import { moderationDenunciationsRoutes } from "./sub-modules/denunciation/moderation-denunciation-routes.js";
import { moderationSupportRoutes } from "./sub-modules/support/moderation-support-routes.js";

export async function moderationRoutes(app: FastifyInstance): Promise<void> {
	await app.register(supportRoutes, { prefix: "/v1" });
	await app.register(denunciationRoutes, { prefix: "/v1" });
	await app.register(moderationSupportRoutes, { prefix: "/v1" });
	await app.register(moderationDenunciationsRoutes, { prefix: "/v1" });
}
