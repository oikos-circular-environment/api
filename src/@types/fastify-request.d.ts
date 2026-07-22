import "fastify";
import type { ApiClientRecord } from "@/modules/common/providers/api-client/api-client-provider.js";

declare module "fastify" {
	interface FastifyRequest {
		apiClient?: ApiClientRecord | null;
	}
}
