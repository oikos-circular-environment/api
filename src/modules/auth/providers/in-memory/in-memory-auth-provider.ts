import { randomUUID } from "node:crypto";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InvalidResetTokenError } from "@/modules/auth/errors/invalid-reset-token-error.js";
import { UserAlreadyExistsError } from "@/modules/auth/errors/user-already-exists-error.js";
import { WeakPasswordError } from "@/modules/auth/errors/weak-password-error.js";
import type {
	AuthProvider,
	AuthSession,
	AuthUser,
	ChangePasswordInput,
	ResetPasswordInput,
	SessionResult,
	SignInWithPasswordInput,
	SignUpWithPasswordInput,
} from "../auth-provider.js";

const MIN_PASSWORD_LENGTH = 6;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "better-auth.session_token";

type ResetTokenRecord = {
	email: string;
	expiresAt: Date;
};

export class InMemoryAuthProvider implements AuthProvider {
	public users: AuthUser[] = [];
	public sessions = new Map<string, AuthSession>();
	public resetTokens = new Map<string, ResetTokenRecord>();
	private readonly passwords = new Map<string, string>();

	async signUpWithPassword({ name, email, password }: SignUpWithPasswordInput) {
		assertPasswordLength(password);
		if (this.users.some((user) => user.email === email)) {
			throw new UserAlreadyExistsError();
		}

		const user: AuthUser = {
			id: randomUUID(),
			email,
			name,
			emailVerified: false,
			image: null,
			role: "user",
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		this.users.push(user);
		this.passwords.set(user.id, password);

		const session = this.createSession(user.id);
		return { token: session.token, user };
	}

	async signInWithPassword({ email, password }: SignInWithPasswordInput) {
		const user = this.users.find((item) => item.email === email);
		if (!user || this.passwords.get(user.id) !== password) {
			throw new InvalidCredentialsError();
		}

		const session = this.createSession(user.id);
		return { token: session.token, user };
	}

	async getSession(headers: Headers): Promise<SessionResult | null> {
		const token = extractSessionToken(headers);
		if (!token) return null;

		const session = this.sessions.get(token);
		if (!session) return null;
		if (session.expiresAt.getTime() <= Date.now()) {
			this.sessions.delete(token);
			return null;
		}

		const user = this.users.find((item) => item.id === session.userId);
		if (!user) return null;
		return { session, user };
	}

	async signOut(headers: Headers) {
		const token = extractSessionToken(headers);
		if (token) this.sessions.delete(token);
	}

	async changePassword(
		{ currentPassword, newPassword }: ChangePasswordInput,
		headers: Headers,
	) {
		const session = await this.getSession(headers);
		if (!session) throw new InvalidCredentialsError();
		if (this.passwords.get(session.user.id) !== currentPassword) {
			throw new InvalidCredentialsError();
		}

		assertPasswordLength(newPassword);
		this.passwords.set(session.user.id, newPassword);
	}

	async requestPasswordReset(email: string) {
		if (!this.users.some((user) => user.email === email)) return;
		this.resetTokens.set(randomUUID(), {
			email,
			expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
		});
	}

	async resetPassword({ token, newPassword }: ResetPasswordInput) {
		const record = this.resetTokens.get(token);
		if (!record || record.expiresAt.getTime() <= Date.now()) {
			throw new InvalidResetTokenError();
		}

		assertPasswordLength(newPassword);

		const user = this.users.find((item) => item.email === record.email);
		if (!user) throw new InvalidResetTokenError();

		this.passwords.set(user.id, newPassword);
		this.resetTokens.delete(token);
	}

	getPendingResetToken(email: string): string | null {
		for (const [token, record] of this.resetTokens) {
			if (record.email === email && record.expiresAt.getTime() > Date.now()) {
				return token;
			}
		}
		return null;
	}

	private createSession(userId: string): AuthSession {
		const session: AuthSession = {
			id: randomUUID(),
			token: randomUUID(),
			expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
			userId,
		};
		this.sessions.set(session.token, session);
		return session;
	}
}

function assertPasswordLength(password: string) {
	if (password.length < MIN_PASSWORD_LENGTH) throw new WeakPasswordError();
}

function extractSessionToken(headers: Headers): string | null {
	const authorization = headers.get("authorization");
	if (authorization?.startsWith("Bearer ")) {
		return authorization.slice("Bearer ".length);
	}

	const cookie = headers.get("cookie");
	if (!cookie) return null;

	const prefix = `${SESSION_COOKIE_NAME}=`;
	const match = cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(prefix));
	return match ? match.slice(prefix.length) : null;
}
