import "fastify";
import type { AuthUser } from "@/modules/auth/providers/auth/auth-provider.js";

declare module "fastify" {
	interface FastifyRequest {
		apiClient?: { name: string } | null;
		authUser?: AuthUser;
	}
}
