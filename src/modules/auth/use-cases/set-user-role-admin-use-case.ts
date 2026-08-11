import type { AuthProvider, AuthUser } from "../providers/auth-provider.js";

export type SetUserRoleAdminUseCaseInput = {
	userId: string;
	role: string;
};

export class SetUserRoleAdminUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: SetUserRoleAdminUseCaseInput,
		headers: Headers,
	): Promise<AuthUser> {
		return this.authProvider.setRole(input, headers);
	}
}
