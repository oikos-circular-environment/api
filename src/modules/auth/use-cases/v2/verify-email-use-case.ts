import type { AuthProvider } from "../../providers/auth/auth-provider.js";

export class VerifyEmailUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(token: string): Promise<void> {
		await this.authProvider.verifyEmail(token);
	}
}
