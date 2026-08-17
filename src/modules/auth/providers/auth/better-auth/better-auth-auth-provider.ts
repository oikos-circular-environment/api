import { APIError, type Auth, type BetterAuthOptions } from "better-auth";
import { AuthProviderError } from "@/modules/auth/errors/auth-provider-error.js";
import { EmailNotVerifiedError } from "@/modules/auth/errors/email-not-verified-error.js";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InvalidResetTokenError } from "@/modules/auth/errors/invalid-reset-token-error.js";
import { InvalidRoleError } from "@/modules/auth/errors/invalid-role-error.js";
import { UserAlreadyBannedError } from "@/modules/auth/errors/user-already-banned-error.js";
import { UserAlreadyExistsError } from "@/modules/auth/errors/user-already-exists-error.js";
import { UserNotBannedError } from "@/modules/auth/errors/user-not-banned-error.js";
import { UserNotFoundError } from "@/modules/auth/errors/user-not-found-error.js";
import { WeakPasswordError } from "@/modules/auth/errors/weak-password-error.js";
import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	AuthProvider,
	AuthSession,
	AuthUser,
	BanUserInput,
	ChangePasswordInput,
	CreateUserInput,
	GetUserInput,
	ListUserSessionsInput,
	ListUsersInput,
	ListUsersResult,
	RemoveUserInput,
	ResetPasswordInput,
	RevokeUserSessionsInput,
	SetRoleInput,
	SetUserPasswordInput,
	SignInWithPasswordInput,
	SignUpWithPasswordInput,
	UnbanUserInput,
	UpdateUserInput,
} from "../auth-provider.js";

export type AuthApiUser = {
	id: string;
	email: string;
	name: string | null;
	emailVerified: boolean;
	image?: string | null;
	createdAt: Date;
	updatedAt: Date;
	role?: string;
	banned?: boolean;
	banReason?: string | null;
	banExpires?: Date | null;
};

export type AuthApiSession = {
	id: string;
	token: string;
	expiresAt: Date;
	userId: string;
	impersonatedBy?: string | null;
};

export type AuthApiClient = {
	signUpEmail(args: {
		body: { name: string; email: string; password: string };
		headers: Headers;
	}): Promise<{ token: string | null; user: AuthApiUser }>;
	signInEmail(args: {
		body: { email: string; password: string };
		headers: Headers;
	}): Promise<{ token: string; user: AuthApiUser }>;
	sendVerificationEmail(args: {
		body: { email: string; callbackURL?: string };
	}): Promise<{ status: boolean }>;
	getSession(args: {
		headers: Headers;
	}): Promise<{ session: AuthApiSession; user: AuthApiUser } | null>;
	signOut(args: { headers: Headers }): Promise<{ success: boolean }>;
	changePassword(args: {
		body: { currentPassword: string; newPassword: string };
		headers: Headers;
	}): Promise<{ status: boolean }>;
	requestPasswordReset(args: {
		body: { email: string };
	}): Promise<{ status: boolean; message: string }>;
	resetPassword(args: {
		body: { newPassword: string; token: string };
	}): Promise<{ status: boolean }>;
	listUsers(args: { query: ListUsersInput; headers: Headers }): Promise<{
		users: AuthApiUser[];
		total: number;
		limit?: number;
		offset?: number;
	}>;
	getUser(args: {
		query: { id: string };
		headers: Headers;
	}): Promise<AuthApiUser>;
	createUser(args: {
		body: {
			email: string;
			password?: string;
			name: string;
			role?: string;
			data?: Record<string, unknown>;
		};
		headers: Headers;
	}): Promise<{ user: AuthApiUser }>;
	adminUpdateUser(args: {
		body: { userId: string; data: Record<string, unknown> };
		headers: Headers;
	}): Promise<AuthApiUser>;
	setRole(args: {
		body: { userId: string; role: string };
		headers: Headers;
	}): Promise<{ user: AuthApiUser }>;
	banUser(args: {
		body: { userId: string; banReason?: string; banExpiresIn?: number };
		headers: Headers;
	}): Promise<{ user: AuthApiUser }>;
	unbanUser(args: {
		body: { userId: string };
		headers: Headers;
	}): Promise<{ user: AuthApiUser }>;
	listUserSessions(args: {
		body: { userId: string };
		headers: Headers;
	}): Promise<{ sessions: AuthApiSession[] }>;
	revokeUserSessions(args: {
		body: { userId: string };
		headers: Headers;
	}): Promise<{ success: boolean }>;
	setUserPassword(args: {
		body: { userId: string; newPassword: string };
		headers: Headers;
	}): Promise<{ status: boolean }>;
	removeUser(args: {
		body: { userId: string };
		headers: Headers;
	}): Promise<{ success: boolean }>;
};

export type BetterAuthAuthProviderOptions = {
	api: AuthApiClient;
};

export class BetterAuthAuthProvider implements AuthProvider {
	constructor(private readonly options: BetterAuthAuthProviderOptions) {}

	async signUpWithPassword({ name, email, password }: SignUpWithPasswordInput) {
		try {
			const { token, user } = await this.options.api.signUpEmail({
				body: { name, email, password },
				headers: new Headers(),
			});
			return { token, user: mapUser(user) };
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async signInWithPassword({ email, password }: SignInWithPasswordInput) {
		try {
			const { token, user } = await this.options.api.signInEmail({
				body: { email, password },
				headers: new Headers(),
			});
			return { token, user: mapUser(user) };
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async sendVerificationEmail(email: string) {
		try {
			await this.options.api.sendVerificationEmail({ body: { email } });
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async getSession(headers: Headers) {
		try {
			const session = await this.options.api.getSession({ headers });
			if (!session) return null;
			return {
				session: mapSession(session.session),
				user: mapUser(session.user),
			};
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async signOut(headers: Headers) {
		try {
			await this.options.api.signOut({ headers });
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async changePassword(
		{ currentPassword, newPassword }: ChangePasswordInput,
		headers: Headers,
	) {
		try {
			await this.options.api.changePassword({
				body: { currentPassword, newPassword },
				headers,
			});
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async requestPasswordReset(email: string) {
		try {
			await this.options.api.requestPasswordReset({ body: { email } });
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async resetPassword({ token, newPassword }: ResetPasswordInput) {
		try {
			await this.options.api.resetPassword({
				body: { newPassword, token },
			});
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async listUsers(
		input: ListUsersInput,
		headers: Headers,
	): Promise<ListUsersResult> {
		try {
			const result = await this.options.api.listUsers({
				query: input,
				headers,
			});
			return {
				users: result.users.map(mapUser),
				total: result.total,
				limit: result.limit,
				offset: result.offset,
			};
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async getUser({ userId }: GetUserInput, headers: Headers) {
		try {
			const user = await this.options.api.getUser({
				query: { id: userId },
				headers,
			});
			return mapUser(user);
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async createUser(
		{ email, password, name, role }: CreateUserInput,
		headers: Headers,
	) {
		try {
			const result = await this.options.api.createUser({
				body: { email, password, name, role },
				headers,
			});
			return mapUser(result.user);
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async updateUser({ userId, data }: UpdateUserInput, headers: Headers) {
		try {
			const user = await this.options.api.adminUpdateUser({
				body: { userId, data },
				headers,
			});
			return mapUser(user);
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async setRole({ userId, role }: SetRoleInput, headers: Headers) {
		try {
			const result = await this.options.api.setRole({
				body: { userId, role },
				headers,
			});
			return mapUser(result.user);
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async banUser(
		{ userId, banReason, banExpiresIn }: BanUserInput,
		headers: Headers,
	) {
		try {
			const result = await this.options.api.banUser({
				body: { userId, banReason, banExpiresIn },
				headers,
			});
			return mapUser(result.user);
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async unbanUser({ userId }: UnbanUserInput, headers: Headers) {
		try {
			const result = await this.options.api.unbanUser({
				body: { userId },
				headers,
			});
			return mapUser(result.user);
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async listUserSessions(
		{ userId }: ListUserSessionsInput,
		headers: Headers,
	): Promise<AuthSession[]> {
		try {
			const result = await this.options.api.listUserSessions({
				body: { userId },
				headers,
			});
			return result.sessions.map(mapSession);
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async revokeUserSessions(
		{ userId }: RevokeUserSessionsInput,
		headers: Headers,
	) {
		try {
			await this.options.api.revokeUserSessions({
				body: { userId },
				headers,
			});
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async setUserPassword(
		{ userId, newPassword }: SetUserPasswordInput,
		headers: Headers,
	) {
		try {
			await this.options.api.setUserPassword({
				body: { userId, newPassword },
				headers,
			});
		} catch (error) {
			throw translateApiError(error);
		}
	}

	async removeUser({ userId }: RemoveUserInput, headers: Headers) {
		try {
			await this.options.api.removeUser({
				body: { userId },
				headers,
			});
		} catch (error) {
			throw translateApiError(error);
		}
	}
}

export function makeBetterAuthAuthProvider<O extends BetterAuthOptions>(
	auth: Auth<O>,
): BetterAuthAuthProvider {
	return new BetterAuthAuthProvider({
		api: auth.api as unknown as AuthApiClient,
	});
}

function mapUser(user: AuthApiUser): AuthUser {
	return {
		id: user.id,
		email: user.email,
		name: user.name ?? null,
		emailVerified: user.emailVerified,
		image: user.image ?? null,
		role: user.role ?? "user",
		banned: user.banned ?? false,
		banReason: user.banReason ?? null,
		banExpires: user.banExpires ?? null,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}

function mapSession(session: AuthApiSession): AuthSession {
	return {
		id: session.id,
		token: session.token,
		expiresAt: session.expiresAt,
		userId: session.userId,
		impersonatedBy: session.impersonatedBy ?? null,
	};
}

function translateApiError(error: unknown): AppError {
	if (error instanceof AppError) return error;
	if (!(error instanceof APIError)) {
		return new AuthProviderError(
			error instanceof Error ? error.message : "Authentication provider failed",
			"AUTH_PROVIDER_ERROR",
			500,
		);
	}

	const code =
		typeof error.body?.code === "string" ? error.body.code : undefined;
	const statusCode = error.statusCode ?? 400;

	switch (code) {
		case "INVALID_EMAIL_OR_PASSWORD":
		case "INVALID_PASSWORD":
		case "CREDENTIAL_ACCOUNT_NOT_FOUND":
			return new InvalidCredentialsError();
		case "USER_ALREADY_EXISTS":
		case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
			return new UserAlreadyExistsError();
		case "PASSWORD_TOO_SHORT":
		case "PASSWORD_TOO_LONG":
			return new WeakPasswordError();
		case "INVALID_TOKEN":
		case "TOKEN_EXPIRED":
			return new InvalidResetTokenError();
		case "EMAIL_NOT_VERIFIED":
			return new EmailNotVerifiedError();
		case "USER_NOT_FOUND":
			return new UserNotFoundError();
		case "INVALID_ROLE_TYPE":
		case "YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE":
			return new InvalidRoleError();
		case "USER_ALREADY_BANNED":
			return new UserAlreadyBannedError();
		case "USER_NOT_BANNED":
			return new UserNotBannedError();
		default:
			return new AuthProviderError(
				error.body?.message ?? error.message,
				code ?? "AUTH_PROVIDER_ERROR",
				statusCode,
			);
	}
}
