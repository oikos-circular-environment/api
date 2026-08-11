import { InvalidCredentialsError } from "../errors/invalid-credentials-error.js";
import type { AuthProvider, AuthUser } from "../providers/auth-provider.js";

export class GetSessionV2UseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(headers: Headers): Promise<{ user: AuthUser }> {
		const session = await this.authProvider.getSession(headers);

		if (!session) {
			throw new InvalidCredentialsError();
		}

		return { user: session.user };
	}
}
