import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";

export function requireRole(expectedRole: string) {
	return async function requireRoleMiddleware(request: FastifyRequest) {
		if (request.authV2User?.role !== expectedRole) {
			throw new AppError("Forbidden.", "FORBIDDEN", 403);
		}
	};
}
