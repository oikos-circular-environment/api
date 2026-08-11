import { compare, hash } from "bcryptjs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { env } from "@/env/index.js";
import { prisma } from "@/lib/prisma.js";
import { AuthEmailRenderer } from "@/modules/auth/emails/auth-email-renderer.js";
import { makeEmailProvider } from "@/modules/common/providers/email/make-email-provider.js";

const BCRYPT_COST = 10;

export const emailProvider = makeEmailProvider(new AuthEmailRenderer());

export const auth = betterAuth({
	appName: "Oikos API",
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL ?? env.APP_PUBLIC_URL,
	trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS,
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 6,
		password: {
			hash: async (password) => hash(password, BCRYPT_COST),
			verify: async ({ hash: passwordHash, password }) =>
				compare(password, passwordHash),
		},
		sendResetPassword: async (data) => {
			await emailProvider.send({
				type: "reset-password",
				to: data.user.email,
				subject: "Reset your password",
				payload: {
					url: data.url,
					token: data.token,
					name: data.user.name,
				},
			});
		},
	},
	user: {
		fields: {
			emailVerified: "email_verified",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	},
	account: {
		fields: {
			accountId: "account_id",
			providerId: "provider_id",
			userId: "user_id",
			accessToken: "access_token",
			refreshToken: "refresh_token",
			idToken: "id_token",
			accessTokenExpiresAt: "access_token_expires_at",
			refreshTokenExpiresAt: "refresh_token_expires_at",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	},
	session: {
		fields: {
			userId: "user_id",
			expiresAt: "expires_at",
			ipAddress: "ip_address",
			userAgent: "user_agent",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	},
	verification: {
		fields: {
			expiresAt: "expires_at",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	},
	plugins: [
		admin({
			schema: {
				user: {
					fields: {
						banReason: "ban_reason",
						banExpires: "ban_expires",
					},
				},
				session: {
					fields: {
						impersonatedBy: "impersonated_by",
					},
				},
			},
		}),
		bearer(),
	],
});
