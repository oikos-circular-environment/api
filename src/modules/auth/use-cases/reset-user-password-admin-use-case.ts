import type { AuthProvider } from "../providers/auth-provider.js";

export type ResetUserPasswordAdminUseCaseInput = {
	userId: string;
	newPassword: string;
};

export class ResetUserPasswordAdminUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: ResetUserPasswordAdminUseCaseInput,
		headers: Headers,
	): Promise<void> {
		return this.authProvider.setUserPassword(input, headers);
	}
}
