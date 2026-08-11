import type {
	AuthProvider,
	SignUpWithPasswordInput,
} from "../providers/auth-provider.js";

export class SignUpV2UseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(input: SignUpWithPasswordInput): Promise<void> {
		await this.authProvider.signUpWithPassword(input);
	}
}
