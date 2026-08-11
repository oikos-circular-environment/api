import type { AuthProvider } from "../providers/auth-provider.js";

export class RequestPasswordResetV2UseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(email: string): Promise<void> {
		await this.authProvider.requestPasswordReset(email);
	}
}
