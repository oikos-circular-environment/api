import type { AuthProvider } from "../../providers/auth/auth-provider.js";

export class SendVerificationEmailUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(email: string): Promise<void> {
		await this.authProvider.sendVerificationEmail(email);
	}
}
