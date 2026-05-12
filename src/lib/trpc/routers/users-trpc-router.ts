import { createUserSchema } from "@/modules/users/dtos/users-dto.js";
import { PrismaUsersRepository } from "@/modules/users/repositories/prisma/users-repository-prisma.js";
import { AuthenticateUserUseCase } from "@/modules/users/use-cases/authenticate-user-use-case.js";
import { RegisterUserUseCase } from "@/modules/users/use-cases/register-user-use-case.js";
import { publicProcedure, router } from "../trpc.js";

const usersRepository = new PrismaUsersRepository();

export const usersTrpcRouter = router({
	register: publicProcedure
		.input(createUserSchema)
		.mutation(async ({ input }) => {
			const registerUserUseCase = new RegisterUserUseCase(usersRepository);
			return registerUserUseCase.execute(input);
		}),

	auth: publicProcedure
		.input(createUserSchema)
		.mutation(async ({ input, ctx }) => {
			const authenticateUserUseCase = new AuthenticateUserUseCase(
				usersRepository,
			);
			const user = await authenticateUserUseCase.execute(input);

			const token = await ctx.res.jwtSign(
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

			return { token };
		}),
});
