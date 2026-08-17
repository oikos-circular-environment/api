import type {
	AuthProvider,
	AuthUser,
	SignInWithPasswordInput,
} from "../../providers/auth/auth-provider.js";

export type SignInUseCaseResult = {
	token: string;
	user: AuthUser;
};

export class SignInUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(input: SignInWithPasswordInput): Promise<SignInUseCaseResult> {
		const result = await this.authProvider.signInWithPassword(input);

		if (!result.token) {
			throw new Error("Sign-in did not return a token");
		}

		return { token: result.token, user: result.user };
	}
}
