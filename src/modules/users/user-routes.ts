import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { appErrorSchema } from "../common/errors/app-error.js";
import { createUserSchema } from "./dtos/users-dto.js";
import { PrismaUsersRepository } from "./repositories/prisma/users-repository-prisma.js";
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
}
