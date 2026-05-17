import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { appErrorSchema } from "../common/errors/app-error.js";
import { loginSchema } from "./dtos/auth-dto.js";
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
				.send({ token });
		},
	);

	typedApp.patch(
		"/auth/refresh",
		{
			schema: {
				tags: ["Auth"],
				summary: "Refresh access token",
				description:
					"Issues a new access token using the refresh token cookie.",
				response: {
					200: z.object({
						token: z.string(),
					}),
					401: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			await request.jwtVerify({ onlyCookie: true });

			const authRepository = new PrismaAuthRepository();
			const refreshTokenUseCase = new RefreshTokenUseCase(authRepository);
			const user = await refreshTokenUseCase.execute({
				userId: request.user.sub,
			});

			const token = await reply.jwtSign(
				{ user: { id: user.id, email: user.email } },
				{ sign: { sub: user.id, expiresIn: "1d" } },
			);

			reply.send({ token });
		},
	);
}
