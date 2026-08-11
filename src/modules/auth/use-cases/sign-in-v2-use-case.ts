import type {
	AuthProvider,
	AuthUser,
	SignInWithPasswordInput,
} from "../providers/auth-provider.js";

export type SignInV2UseCaseResult = {
	token: string;
	user: AuthUser;
};

export class SignInV2UseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: SignInWithPasswordInput,
	): Promise<SignInV2UseCaseResult> {
		const result = await this.authProvider.signInWithPassword(input);

		if (!result.token) {
			throw new Error("Sign-in did not return a token");
		}

		return { token: result.token, user: result.user };
	}
}
