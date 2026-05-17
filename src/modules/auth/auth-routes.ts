import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { AppError, appErrorSchema } from "../common/errors/app-error.js";
import type { AuthTokenPayload } from "../common/types/auth-token-payload.js";
import { loginSchema, refreshBodySchema } from "./dtos/auth-dto.js";
import { PrismaAuthRepository } from "./repositories/prisma/auth-repository-prisma.js";
import { AuthenticateUserUseCase } from "./use-cases/authenticate-user-use-case.js";
import { RefreshTokenUseCase } from "./use-cases/refresh-token-use-case.js";

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
			const authenticateUserUseCase = new AuthenticateUserUseCase(
				authRepository,
			);
			const user = await authenticateUserUseCase.execute({ email, password });

			const token = await reply.jwtSign(
				{ user: { id: user.id, email: user.email } },
				{ sign: { sub: user.id, expiresIn: "1d" } },
			);

			const refreshToken = await reply.jwtSign(
				{ user: { id: user.id, email: user.email } },
				{ sign: { sub: user.id, expiresIn: "7d" } },
			);

			reply
				.setCookie("refreshToken", refreshToken, {
					path: "/",
					httpOnly: true,
					sameSite: "strict",
					secure: true,
				})
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
					"or from the httpOnly cookie (web). Body takes precedence.",
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
			const bodyRefreshToken = request.body?.refreshToken;
			let payload: AuthTokenPayload;

			if (bodyRefreshToken) {
				try {
					payload =
						request.server.jwt.verify<AuthTokenPayload>(bodyRefreshToken);
				} catch {
					throw new AppError(
						"Invalid or expired refresh token",
						"UNAUTHORIZED",
						401,
					);
				}
			} else {
				try {
					await request.jwtVerify({ onlyCookie: true });
					payload = request.user as AuthTokenPayload;
				} catch {
					throw new AppError(
						"Invalid or expired refresh token",
						"UNAUTHORIZED",
						401,
					);
				}
			}

			const authRepository = new PrismaAuthRepository();
			const refreshTokenUseCase = new RefreshTokenUseCase(authRepository);
			const user = await refreshTokenUseCase.execute({ userId: payload.sub });

			const token = await reply.jwtSign(
				{ user: { id: user.id, email: user.email } },
				{ sign: { sub: user.id, expiresIn: "1d" } },
			);

			const newRefreshToken = await reply.jwtSign(
				{ user: { id: user.id, email: user.email } },
				{ sign: { sub: user.id, expiresIn: "7d" } },
			);

			reply
				.setCookie("refreshToken", newRefreshToken, {
					path: "/",
					httpOnly: true,
					sameSite: "strict",
					secure: true,
				})
				.send({ token, refreshToken: newRefreshToken });
		},
	);
}
