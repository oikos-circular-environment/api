import type {
	AuthProvider,
	AuthUser,
} from "@/modules/auth/providers/auth/auth-provider.js";

export type SetUserRoleUseCaseInput = {
	userId: string;
	role: string;
};

export class SetUserRoleUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: SetUserRoleUseCaseInput,
		headers: Headers,
	): Promise<AuthUser> {
		return this.authProvider.setRole(input, headers);
	}
}
