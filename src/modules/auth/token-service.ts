import { randomUUID } from "node:crypto";
import type { FastifyReply } from "fastify";
import type { RefreshTokenRepository } from "./repositories/refresh-token-repository.js";

export const ACCESS_TOKEN_EXPIRES_IN = "1d";
export const REFRESH_TOKEN_EXPIRES_IN = "7d";
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const refreshCookieOptions = {
	path: "/",
	httpOnly: true,
	sameSite: "strict",
	secure: true,
} as const;

/**
 * Signs a fresh access/refresh pair for the given user, persists the refresh
 * token (with its `jti`) so it can be revoked later, and sets the refresh
 * cookie. Shared by login and change-password — the two flows that mint a
 * brand-new session for the current device.
 */
export async function issueAuthTokens(
	reply: FastifyReply,
	refreshTokenRepository: RefreshTokenRepository,
	user: { id: string; email: string },
): Promise<{ token: string; refreshToken: string }> {
	const token = await reply.jwtSign(
		{ user: { id: user.id, email: user.email } },
		{ sign: { sub: user.id, expiresIn: ACCESS_TOKEN_EXPIRES_IN } },
	);

	const jti = randomUUID();
	const refreshToken = await reply.jwtSign(
		{ user: { id: user.id, email: user.email }, jti },
		{ sign: { sub: user.id, expiresIn: REFRESH_TOKEN_EXPIRES_IN } },
	);

	await refreshTokenRepository.create({
		jti,
		userId: user.id,
		expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
	});

	reply.setCookie("refreshToken", refreshToken, refreshCookieOptions);

	return { token, refreshToken };
}
