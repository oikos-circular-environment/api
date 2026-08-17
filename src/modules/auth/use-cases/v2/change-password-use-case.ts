import type {
	AuthProvider,
	ChangePasswordInput,
} from "../../providers/auth/auth-provider.js";

export class ChangePasswordUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(input: ChangePasswordInput, headers: Headers): Promise<void> {
		await this.authProvider.changePassword(input, headers);
	}
}
