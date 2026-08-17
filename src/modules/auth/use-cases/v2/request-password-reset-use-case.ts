import type { AuthProvider } from "../../providers/auth/auth-provider.js";

export class RequestPasswordResetUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(email: string): Promise<void> {
		await this.authProvider.requestPasswordReset(email);
	}
}
