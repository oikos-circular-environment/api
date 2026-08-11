import type {
	AuthProvider,
	ResetPasswordInput,
} from "../providers/auth-provider.js";

export class ResetPasswordV2UseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(input: ResetPasswordInput): Promise<void> {
		await this.authProvider.resetPassword(input);
	}
}
