import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";

export type AuthUserLike = {
	id: string;
	email: string;
	name: string | null;
	emailVerified: boolean;
	image: string | null;
	role: string;
	banned: boolean;
	banReason: string | null;
	banExpires: Date | null;
	authSource: string;
	createdAt: Date;
	updatedAt: Date;
};

export type SessionReader = {
	getSession(headers: Headers): Promise<{ user: AuthUserLike } | null>;
};

function buildHeaders(request: FastifyRequest): Headers {
	return new Headers(request.headers as Record<string, string>);
}

export function createVerifySession(sessionReader: SessionReader) {
	return async function verifySession(request: FastifyRequest) {
		const result = await sessionReader.getSession(buildHeaders(request));

		if (!result) {
			throw new AppError("Unauthorized.", "UNAUTHORIZED", 401);
		}

		request.authV2User = result.user;
	};
}

/**
 * Reads the session user set by `verifySession`, throwing 401 instead of
 * silently allowing `undefined` if a route forgets to run the preHandler.
 */
export function requireAuthUser(request: FastifyRequest): AuthUserLike {
	if (!request.authV2User) {
		throw new AppError("Unauthorized.", "UNAUTHORIZED", 401);
	}

	return request.authV2User;
}
