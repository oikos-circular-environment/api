import type {
	AuthProvider,
	ResetPasswordInput,
} from "../../providers/auth/auth-provider.js";

export class ResetPasswordUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(input: ResetPasswordInput): Promise<void> {
		await this.authProvider.resetPassword(input);
	}
}
