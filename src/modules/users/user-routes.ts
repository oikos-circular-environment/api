import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { appErrorSchema } from "../common/errors/app-error.js";
import { createUserSchema } from "./dtos/users-dto.js";
import { PrismaUsersRepository } from "./repositories/prisma/users-repository-prisma.js";
import { AuthenticateUserUseCase } from "./use-cases/authenticate-user-use-case.js";
import { RegisterUserUseCase } from "./use-cases/register-user-use-case.js";

export async function userRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();

	typedApp.post(
		"/users/register",
		{
			schema: {
				tags: ["Users"],
				summary: "Register a new user",
				description:
					"Creates a new user account with the provided information.",
				body: createUserSchema,
				response: {
					204: z.object(),

					409: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const { email, password } = request.body;
			const usersRepository = new PrismaUsersRepository();
			const registerUserUseCase = new RegisterUserUseCase(usersRepository);
			await registerUserUseCase.execute({
				email,
				password,
			});

			reply.status(204);
		},
	);

	typedApp.post(
		"/users/auth",
		{
			schema: {
				tags: ["Users"],
				summary: "Authenticate a user",
				description: "Authenticates a user and returns a token.",
				body: createUserSchema,
				response: {
					200: z.object({
						token: z.string(),
					}),
				},
			},
		},
		async (request, reply) => {
			const { email, password } = request.body;
			const usersRepository = new PrismaUsersRepository();
			const authenticateUserUseCase = new AuthenticateUserUseCase(
				usersRepository,
			);
			const user = await authenticateUserUseCase.execute({
				email,
				password,
			});

			const token = await reply.jwtSign(
				{
					user: {
						id: user.id,
						email: user.email,
					},
				},
				{
					sign: {
						sub: user.id,
					},
				},
			);

			reply.send({
				token,
			});
		},
	);
}
