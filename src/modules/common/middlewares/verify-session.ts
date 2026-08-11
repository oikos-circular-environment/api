import type { FastifyRequest } from "fastify";
import type { AuthProvider } from "@/modules/auth/providers/auth-provider.js";
import { AppError } from "../errors/app-error.js";

function buildHeaders(request: FastifyRequest): Headers {
	return new Headers(request.headers as Record<string, string>);
}

export function createVerifySession(authProvider: AuthProvider) {
	return async function verifySession(request: FastifyRequest) {
		const result = await authProvider.getSession(buildHeaders(request));

		if (!result) {
			throw new AppError("Unauthorized.", "UNAUTHORIZED", 401);
		}

		request.authV2User = result.user;
	};
}
