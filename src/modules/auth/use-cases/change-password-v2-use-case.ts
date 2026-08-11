import type {
	AuthProvider,
	ChangePasswordInput,
} from "../providers/auth-provider.js";

export class ChangePasswordV2UseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(input: ChangePasswordInput, headers: Headers): Promise<void> {
		await this.authProvider.changePassword(input, headers);
	}
}
