import { APIError, type Auth, type BetterAuthOptions } from "better-auth";
import { AuthProviderError } from "@/modules/auth/errors/auth-provider-error.js";
import { EmailNotVerifiedError } from "@/modules/auth/errors/email-not-verified-error.js";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InvalidResetTokenError } from "@/modules/auth/errors/invalid-reset-token-error.js";
import { UserAlreadyExistsError } from "@/modules/auth/errors/user-already-exists-error.js";
import { WeakPasswordError } from "@/modules/auth/errors/weak-password-error.js";
import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	AuthProvider,
	AuthSession,
	AuthUser,
	ChangePasswordInput,
	ResetPasswordInput,
	SignInWithPasswordInput,
	SignUpWithPasswordInput,
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
};

export type AuthApiSession = {
	id: string;
	token: string;
	expiresAt: Date;
	userId: string;
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
		case "USER_NOT_FOUND":
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
		default:
			return new AuthProviderError(
				error.body?.message ?? error.message,
				code ?? "AUTH_PROVIDER_ERROR",
				statusCode,
			);
	}
}
