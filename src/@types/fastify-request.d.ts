import "fastify";
import type { AuthUser } from "@/modules/auth/providers/auth-provider.js";

declare module "fastify" {
	interface FastifyRequest {
		apiClient?: { name: string } | null;
		authV2User?: AuthUser;
	}
}
