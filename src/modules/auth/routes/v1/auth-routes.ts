import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { appErrorSchema } from "../../../common/errors/app-error.js";
import { withBearerAuth } from "../../../common/types/openapi-security.js";
import { loginSchema } from "../../dtos/auth-dto.js";
import {
	sessionV2ResponseSchema,
	signInV2ResponseSchema,
} from "../../dtos/auth-v2-dto.js";
import { auth } from "../../providers/auth/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "../../providers/auth/better-auth/better-auth-auth-provider.js";
import { authUserWithOrganizationsResponseMapper } from "../../providers/auth/better-auth/mapper/auth-user-response-mapper.js";
import { PrismaUserOrganizationsRepository } from "../../repositories/prisma/user-organizations-repository-prisma.js";
import { GetSessionUseCase } from "../../use-cases/v2/get-session-use-case.js";
import { SignInUseCase } from "../../use-cases/v2/sign-in-use-case.js";
import { SignOutUseCase } from "../../use-cases/v2/sign-out-use-case.js";

function buildHeaders(request: FastifyRequest): Headers {
	return new Headers(request.headers as Record<string, string>);
}

export async function authRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const authProvider = makeBetterAuthAuthProvider(auth);
	const userOrganizationsRepository = new PrismaUserOrganizationsRepository();

	const signInUseCase = new SignInUseCase(authProvider);
	const signOutUseCase = new SignOutUseCase(authProvider);
	const getSessionUseCase = new GetSessionUseCase(authProvider);

	typedApp.post(
		"/auth/login",
		{
			schema: {
				tags: ["Auth"],
				summary: "Authenticate a user",
				description:
					"Authenticates a user via Better Auth and returns the plain session token (bearer).",
				body: loginSchema,
				response: {
					200: signInV2ResponseSchema,
					400: appErrorSchema,
					401: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const { token, user } = await signInUseCase.execute(request.body);
			const organizations = await userOrganizationsRepository.findByUserId(
				user.id,
			);
			return reply.send({
				token,
				user: authUserWithOrganizationsResponseMapper(user, organizations),
			});
		},
	);

	typedApp.patch(
		"/auth/refresh",
		{
			schema: withBearerAuth({
				tags: ["Auth"],
				summary: "Refresh the current session",
				description:
					"Better Auth sessions renew automatically while active; this " +
					"returns the current session for the presented bearer token.",
				response: {
					200: sessionV2ResponseSchema,
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const { user } = await getSessionUseCase.execute(buildHeaders(request));
			const organizations = await userOrganizationsRepository.findByUserId(
				user.id,
			);
			return reply.send({
				user: authUserWithOrganizationsResponseMapper(user, organizations),
			});
		},
	);

	typedApp.post(
		"/auth/logout",
		{
			schema: withBearerAuth({
				tags: ["Auth"],
				summary: "Log out the current session",
				description: "Revokes the session presented via bearer token.",
				response: {
					204: z.void(),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			await signOutUseCase.execute(buildHeaders(request));
			return reply.status(204).send();
		},
	);
}
