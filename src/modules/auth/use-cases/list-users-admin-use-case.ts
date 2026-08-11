import type {
	AuthProvider,
	AuthUser,
	ListUsersInput,
	ListUsersResult,
} from "../providers/auth-provider.js";

export class ListUsersAdminUseCase {
	constructor(private readonly authProvider: AuthProvider) {}

	async execute(
		input: ListUsersInput,
		headers: Headers,
	): Promise<ListUsersResult> {
		return this.authProvider.listUsers(input, headers);
	}
}

export type { AuthUser, ListUsersResult };
