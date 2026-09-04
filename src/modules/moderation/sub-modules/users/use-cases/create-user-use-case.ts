import type {
	AuthProvider,
	AuthUser,
} from "@/modules/auth/providers/auth/auth-provider.js";

export type CreateUserUseCaseInput = {
	name: string;
	email: string;
	password?: string;
	role?: string;
};

export class CreateUserUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: CreateUserUseCaseInput,
		headers: Headers,
	): Promise<AuthUser> {
		return this.authProvider.createUser(input, headers);
	}
}
