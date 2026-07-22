import "fastify";

declare module "fastify" {
	interface FastifyRequest {
		apiClient?: { name: string } | null;
	}
}
