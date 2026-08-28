import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { AppError, appErrorSchema } from "../../../common/errors/app-error.js";
import { verifyJwt } from "../../../common/middlewares/verify-jwt.js";
import {
	ACCESS_TOKEN_EXPIRES_IN,
	issueAuthTokens,
	REFRESH_TOKEN_EXPIRES_IN,
	REFRESH_TOKEN_TTL_MS,
	refreshCookieOptions,
} from "../../../common/services/auth/token-service.js";
import type { AuthTokenPayload } from "../../../common/types/auth-token-payload.js";
import { withBearerAuth } from "../../../common/types/openapi-security.js";
import { loginSchema, refreshBodySchema } from "../../dtos/auth-dto.js";
import { PrismaAuthRepository } from "../../repositories/prisma/auth-repository-prisma.js";
import { PrismaRefreshTokenRepository } from "../../repositories/prisma/refresh-token-repository-prisma.js";
import { AuthenticateUserUseCase } from "../../use-cases/v1/authenticate-user-use-case.js";
import { RefreshTokenUseCase } from "../../use-cases/v1/refresh-token-use-case.js";

export async function authRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();

	typedApp.post(
		"/auth/login",
		{
			schema: {
				tags: ["Auth"],
				summary: "Authenticate a user",
				description: "Authenticates a user and returns an access token.",
				body: loginSchema,
				response: {
					200: z.object({
						token: z.string(),
						refreshToken: z.string(),
					}),
					401: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const { email, password } = request.body;
			const authRepository = new PrismaAuthRepository();
			const refreshTokenRepository = new PrismaRefreshTokenRepository();
			const authenticateUserUseCase = new AuthenticateUserUseCase(
				authRepository,
			);
			const user = await authenticateUserUseCase.execute({ email, password });

			const { token, refreshToken } = await issueAuthTokens(
				{
					sign: async (payload, options) =>
						reply.jwtSign(payload, { sign: options }),
				},
				refreshTokenRepository,
				user,
			);

			reply
				.setCookie("refreshToken", refreshToken, refreshCookieOptions)
				.send({ token, refreshToken });
		},
	);

	typedApp.patch(
		"/auth/refresh",
		{
			schema: {
				tags: ["Auth"],
				summary: "Refresh access token",
				description:
					"Issues a new access token and a rotated refresh token. " +
					"Accepts the refresh token from the request body (mobile) " +
					"or from the httpOnly cookie (web). Body takes precedence. " +
					"The presented refresh token is revoked on rotation.",
				body: refreshBodySchema,
				response: {
					200: z.object({
						token: z.string(),
						refreshToken: z.string(),
					}),
					401: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const payload = resolveRefreshPayload(request);

			if (!payload.jti) {
				throw new AppError(
					"Invalid or expired refresh token",
					"UNAUTHORIZED",
					401,
				);
			}

			const authRepository = new PrismaAuthRepository();
			const refreshTokenRepository = new PrismaRefreshTokenRepository();
			const refreshTokenUseCase = new RefreshTokenUseCase(
				authRepository,
				refreshTokenRepository,
			);

			const newJti = randomUUID();
			const user = await refreshTokenUseCase.execute({
				userId: payload.sub,
				currentJti: payload.jti,
				newJti,
				newExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
			});

			const token = await reply.jwtSign(
				{ user: { id: user.id, email: user.email } },
				{ sign: { sub: user.id, expiresIn: ACCESS_TOKEN_EXPIRES_IN } },
			);

			const newRefreshToken = await reply.jwtSign(
				{ user: { id: user.id, email: user.email }, jti: newJti },
				{ sign: { sub: user.id, expiresIn: REFRESH_TOKEN_EXPIRES_IN } },
			);

			reply
				.setCookie("refreshToken", newRefreshToken, refreshCookieOptions)
				.send({ token, refreshToken: newRefreshToken });
		},
	);

	typedApp.register(async (authenticatedApp) => {
		const typedAuth = authenticatedApp.withTypeProvider<ZodTypeProvider>();

		typedAuth.addHook("onRequest", async (request) => {
			await verifyJwt(request);
		});

		typedAuth.post(
			"/auth/logout",
			{
				schema: withBearerAuth({
					tags: ["Auth"],
					summary: "Log out the current session",
					description:
						"Revokes the presented refresh token so it can no longer be " +
						"rotated. Accepts the refresh token from the request body or the " +
						"httpOnly cookie. Idempotent.",
					body: refreshBodySchema,
					response: {
						200: z.object({ message: z.string() }),
						401: appErrorSchema,
					},
				}),
			},
			async (request, reply) => {
				const refreshTokenRepository = new PrismaRefreshTokenRepository();

				const jti = tryReadRefreshJti(request);
				if (jti) {
					await refreshTokenRepository.revoke(jti);
				}

				reply.clearCookie("refreshToken", refreshCookieOptions);
				return reply.status(200).send({ message: "Logged out." });
			},
		);
	});
}

/**
 * Verifies and returns the refresh-token payload from the request body
 * (preferred) or the httpOnly cookie. Throws 401 when neither is valid.
 */
function resolveRefreshPayload(request: FastifyRequest): AuthTokenPayload {
	const bodyRefreshToken = (
		request.body as { refreshToken?: string } | undefined
	)?.refreshToken;

	if (bodyRefreshToken) {
		try {
			return request.server.jwt.verify<AuthTokenPayload>(bodyRefreshToken);
		} catch {
			throw new AppError(
				"Invalid or expired refresh token",
				"UNAUTHORIZED",
				401,
			);
		}
	}

	const cookieRefreshToken = request.cookies?.refreshToken;
	if (cookieRefreshToken) {
		try {
			return request.server.jwt.verify<AuthTokenPayload>(cookieRefreshToken);
		} catch {
			throw new AppError(
				"Invalid or expired refresh token",
				"UNAUTHORIZED",
				401,
			);
		}
	}

	throw new AppError("Invalid or expired refresh token", "UNAUTHORIZED", 401);
}

/**
 * Best-effort extraction of the refresh-token `jti` for logout. Returns null
 * when no valid refresh token is presented (logout stays idempotent).
 */
function tryReadRefreshJti(request: FastifyRequest): string | null {
	const bodyRefreshToken = (
		request.body as { refreshToken?: string } | undefined
	)?.refreshToken;
	const token = bodyRefreshToken ?? request.cookies?.refreshToken;
	if (!token) return null;

	try {
		const payload = request.server.jwt.verify<AuthTokenPayload>(token);
		return payload.jti ?? null;
	} catch {
		return null;
	}
}
