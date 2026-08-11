import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { appErrorSchema } from "@/modules/common/errors/app-error.js";
import { withBearerAuth } from "@/modules/common/types/openapi-security.js";
import {
	sessionV2ResponseSchema,
	signInV2ResponseSchema,
	signInV2Schema,
	signUpV2Schema,
} from "../dtos/auth-v2-dto.js";
import type { AuthUser } from "../providers/auth-provider.js";
import { auth } from "../providers/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "../providers/better-auth/better-auth-auth-provider.js";
import { GetSessionV2UseCase } from "../use-cases/get-session-v2-use-case.js";
import { SignInV2UseCase } from "../use-cases/sign-in-v2-use-case.js";
import { SignOutV2UseCase } from "../use-cases/sign-out-v2-use-case.js";
import { SignUpV2UseCase } from "../use-cases/sign-up-v2-use-case.js";

const AUTH_V2_TAG = "Auth V2";

function buildHeaders(request: FastifyRequest): Headers {
	return new Headers(request.headers as Record<string, string>);
}

function mapAuthUserToResponse(user: AuthUser) {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		emailVerified: user.emailVerified,
		image: user.image,
		role: user.role,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	};
}

export async function authV2Routes(app: FastifyInstance): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const authProvider = makeBetterAuthAuthProvider(auth);

	const signUpUseCase = new SignUpV2UseCase(authProvider);
	const signInUseCase = new SignInV2UseCase(authProvider);
	const signOutUseCase = new SignOutV2UseCase(authProvider);
	const getSessionUseCase = new GetSessionV2UseCase(authProvider);

	typedApp.post(
		"/auth/sign-up",
		{
			schema: {
				tags: [AUTH_V2_TAG],
				summary: "Sign up with email and password",
				description: "Creates a new v2 user account and credential.",
				body: signUpV2Schema,
				response: {
					201: z.void(),
					400: appErrorSchema,
					409: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			await signUpUseCase.execute(request.body);
			return reply.status(201).send();
		},
	);

	typedApp.post(
		"/auth/sign-in",
		{
			schema: {
				tags: [AUTH_V2_TAG],
				summary: "Sign in with email and password",
				description:
					"Authenticates a v2 user and returns the plain session token (bearer).",
				body: signInV2Schema,
				response: {
					200: signInV2ResponseSchema,
					400: appErrorSchema,
					401: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const { token, user } = await signInUseCase.execute(request.body);
			return reply.send({ token, user: mapAuthUserToResponse(user) });
		},
	);

	typedApp.post(
		"/auth/sign-out",
		{
			schema: withBearerAuth({
				tags: [AUTH_V2_TAG],
				summary: "Sign out the current v2 session",
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

	typedApp.get(
		"/auth/session",
		{
			schema: withBearerAuth({
				tags: [AUTH_V2_TAG],
				summary: "Get current v2 session",
				description: "Returns the current user, including their role.",
				response: {
					200: sessionV2ResponseSchema,
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const { user } = await getSessionUseCase.execute(buildHeaders(request));
			return reply.send({ user: mapAuthUserToResponse(user) });
		},
	);
}
