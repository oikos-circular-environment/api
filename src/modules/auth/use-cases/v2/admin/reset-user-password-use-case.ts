import type { AuthProvider } from "../../../providers/auth/auth-provider.js";

export type ResetUserPasswordUseCaseInput = {
	userId: string;
	newPassword: string;
};

export class ResetUserPasswordUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: ResetUserPasswordUseCaseInput,
		headers: Headers,
	): Promise<void> {
		return this.authProvider.setUserPassword(input, headers);
	}
}
