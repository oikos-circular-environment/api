import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { appErrorSchema } from "@/modules/common/errors/app-error.js";
import { createVerifySession } from "@/modules/common/middlewares/verify-session.js";
import { withBearerAuth } from "@/modules/common/types/openapi-security.js";
import {
	changePasswordV2Schema,
	forgotPasswordV2ResponseSchema,
	forgotPasswordV2Schema,
	resetPasswordV2Schema,
	sendVerificationEmailV2ResponseSchema,
	sendVerificationEmailV2Schema,
	sessionV2ResponseSchema,
	signInV2ResponseSchema,
	signInV2Schema,
	signUpV2Schema,
	verifyEmailV2ResponseSchema,
	verifyEmailV2Schema,
} from "../../dtos/auth-v2-dto.js";
import { auth } from "../../providers/auth/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "../../providers/auth/better-auth/better-auth-auth-provider.js";
import { authUserWithOrganizationsResponseMapper } from "../../providers/auth/better-auth/mapper/auth-user-response-mapper.js";
import { PrismaUserOrganizationsRepository } from "../../repositories/prisma/user-organizations-repository-prisma.js";
import { ChangePasswordUseCase } from "../../use-cases/v2/change-password-use-case.js";
import { GetSessionUseCase } from "../../use-cases/v2/get-session-use-case.js";
import { RequestPasswordResetUseCase } from "../../use-cases/v2/request-password-reset-use-case.js";
import { ResetPasswordUseCase } from "../../use-cases/v2/reset-password-use-case.js";
import { SendVerificationEmailUseCase } from "../../use-cases/v2/send-verification-email-use-case.js";
import { SignInUseCase } from "../../use-cases/v2/sign-in-use-case.js";
import { SignOutUseCase } from "../../use-cases/v2/sign-out-use-case.js";
import { SignUpUseCase } from "../../use-cases/v2/sign-up-use-case.js";
import { VerifyEmailUseCase } from "../../use-cases/v2/verify-email-use-case.js";

const AUTH_V2_TAG = "Auth V2";

function buildHeaders(request: FastifyRequest): Headers {
	return new Headers(request.headers as Record<string, string>);
}

export async function authV2Routes(app: FastifyInstance): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const authProvider = makeBetterAuthAuthProvider(auth);
	const verifySession = createVerifySession(authProvider);
	const userOrganizationsRepository = new PrismaUserOrganizationsRepository();

	const signUpUseCase = new SignUpUseCase(authProvider);
	const signInUseCase = new SignInUseCase(authProvider);
	const signOutUseCase = new SignOutUseCase(authProvider);
	const getSessionUseCase = new GetSessionUseCase(authProvider);
	const changePasswordUseCase = new ChangePasswordUseCase(authProvider);
	const requestPasswordResetUseCase = new RequestPasswordResetUseCase(
		authProvider,
	);
	const resetPasswordUseCase = new ResetPasswordUseCase(authProvider);
	const sendVerificationEmailUseCase = new SendVerificationEmailUseCase(
		authProvider,
	);
	const verifyEmailUseCase = new VerifyEmailUseCase(authProvider);

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
			const organizations = await userOrganizationsRepository.findByUserId(
				user.id,
			);
			return reply.send({
				token,
				user: authUserWithOrganizationsResponseMapper(user, organizations),
			});
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
			const organizations = await userOrganizationsRepository.findByUserId(
				user.id,
			);
			return reply.send({
				user: authUserWithOrganizationsResponseMapper(user, organizations),
			});
		},
	);

	typedApp.post(
		"/auth/change-password",
		{
			preHandler: [verifySession],
			schema: withBearerAuth({
				tags: [AUTH_V2_TAG],
				summary: "Change password",
				description:
					"Changes the authenticated user's password. Other active sessions " +
					"remain valid; only the password credential is updated.",
				body: changePasswordV2Schema,
				response: {
					204: z.void(),
					400: appErrorSchema,
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			await changePasswordUseCase.execute(request.body, buildHeaders(request));
			return reply.status(204).send();
		},
	);

	typedApp.post(
		"/auth/forgot-password",
		{
			schema: {
				tags: [AUTH_V2_TAG],
				summary: "Request password reset",
				description:
					"Requests a password reset for the given email. The response is " +
					"identical whether the email exists or not to avoid leaking account " +
					"existence.",
				body: forgotPasswordV2Schema,
				response: {
					200: forgotPasswordV2ResponseSchema,
					400: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			await requestPasswordResetUseCase.execute(request.body.email);
			return reply.send({
				message:
					"If this email exists in our system, check your email for the reset link",
			});
		},
	);

	typedApp.post(
		"/auth/reset-password",
		{
			schema: {
				tags: [AUTH_V2_TAG],
				summary: "Reset password",
				description:
					"Resets the password using a reset token sent by email. The token " +
					"can only be used once and expires after a short period.",
				body: resetPasswordV2Schema,
				response: {
					204: z.void(),
					400: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			await resetPasswordUseCase.execute(request.body);
			return reply.status(204).send();
		},
	);

	typedApp.post(
		"/auth/send-verification-email",
		{
			schema: {
				tags: [AUTH_V2_TAG],
				summary: "Resend verification email",
				description:
					"Resends the email verification link. The response is identical " +
					"whether the email exists or not to avoid leaking account existence.",
				body: sendVerificationEmailV2Schema,
				response: {
					200: sendVerificationEmailV2ResponseSchema,
					400: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			await sendVerificationEmailUseCase.execute(request.body.email);
			return reply.send({
				message:
					"If this email exists in our system, check your email for the verification link",
			});
		},
	);

	typedApp.post(
		"/auth/verify-email",
		{
			schema: {
				tags: [AUTH_V2_TAG],
				summary: "Verify email",
				description:
					"Confirms the user's email using the token received by email. " +
					"Called by the web/mobile client after reading the token from the " +
					"verification link, not meant to be opened directly in a browser.",
				body: verifyEmailV2Schema,
				response: {
					200: verifyEmailV2ResponseSchema,
					400: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			await verifyEmailUseCase.execute(request.body.token);
			return reply.send({ message: "Email verified successfully" });
		},
	);
}
