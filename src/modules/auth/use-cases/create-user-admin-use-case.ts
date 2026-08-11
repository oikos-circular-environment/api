import type { AuthProvider, AuthUser } from "../providers/auth-provider.js";

export type CreateUserAdminUseCaseInput = {
	name: string;
	email: string;
	password?: string;
	role?: string;
};

export class CreateUserAdminUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: CreateUserAdminUseCaseInput,
		headers: Headers,
	): Promise<AuthUser> {
		return this.authProvider.createUser(input, headers);
	}
}
