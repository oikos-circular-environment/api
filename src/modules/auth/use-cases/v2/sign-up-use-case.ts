import type {
	AuthProvider,
	SignUpWithPasswordInput,
} from "../../providers/auth/auth-provider.js";

export class SignUpUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(input: SignUpWithPasswordInput): Promise<void> {
		await this.authProvider.signUpWithPassword(input);
	}
}
