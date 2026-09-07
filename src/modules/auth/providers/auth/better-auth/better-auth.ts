import { expo } from "@better-auth/expo";
import { compare, hash } from "bcryptjs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { organization } from "better-auth/plugins/organization";
import { env } from "@/env/index.js";
import { prisma } from "@/lib/prisma.js";
import { AuthEmailRenderer } from "@/modules/auth/emails/auth-email-renderer.js";
import { makeEmailProvider } from "@/modules/common/providers/email/make-email-provider.js";
import {
	ac as organizationAc,
	admin as organizationAdmin,
	owner as organizationOwner,
	user as organizationUser,
} from "./organization-permissions.js";
import {
	ac as platformAc,
	moderator as platformModerator,
	user as platformUser,
} from "./platform-permissions.js";

const BCRYPT_COST = 10;

export const emailProvider = makeEmailProvider(new AuthEmailRenderer());

const publicApiUrl = env.BETTER_AUTH_URL ?? env.APP_PUBLIC_URL;

export const auth = betterAuth({
	appName: "Oikos Economia Circular",
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: publicApiUrl,
	trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS,
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 6,
		requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
		password: {
			hash: async (password) => hash(password, BCRYPT_COST),
			verify: async ({ hash: passwordHash, password }) =>
				compare(password, passwordHash),
		},
		sendResetPassword: async (data) => {
			await emailProvider.send({
				type: "reset-password",
				to: data.user.email,
				subject: "Redefinição de senha",
				payload: {
					url: data.url,
					token: data.token,
					name: data.user.name,
				},
			});
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		sendVerificationEmail: async (data) => {
			const verificationUrl = `${env.WEB_APP_URL}/verify-email?token=${encodeURIComponent(data.token)}`;
			await emailProvider.send({
				type: "verify-email",
				to: data.user.email,
				subject: "Confirme seu e-mail",
				payload: {
					url: verificationUrl,
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
		additionalFields: {
			authSource: {
				type: "string",
				input: false,
				fieldName: "auth_source",
				defaultValue: "better_auth",
			},
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
			// activeOrganizationId is mapped by the organization plugin (schema.session.fields)
		},
	},
	verification: {
		fields: {
			expiresAt: "expires_at",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	},
	advanced: {
		database: {
			// Every table here already has `id String @id @default(uuid())` in
			// Prisma — defer to it instead of Better Auth's default base62 id, so
			// every user/account/session id stays a UUID like the rest of the app.
			generateId: false,
		},
	},
	plugins: [
		admin({
			ac: platformAc,
			adminRoles: ["moderator"],
			roles: { moderator: platformModerator, user: platformUser },
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
		openAPI({ disableDefaultReference: true }),
		expo(),
		organization({
			ac: organizationAc,
			creatorRole: "owner",
			roles: {
				owner: organizationOwner,
				admin: organizationAdmin,
				user: organizationUser,
			},
			schema: {
				session: {
					fields: {
						activeOrganizationId: "active_organization_id",
					},
				},
				organization: {
					fields: { createdAt: "created_at", updatedAt: "updated_at" },
				},
				member: {
					fields: {
						organizationId: "organization_id",
						userId: "user_id",
						createdAt: "created_at",
					},
				},
				invitation: {
					fields: {
						organizationId: "organization_id",
						inviterId: "inviter_id",
						expiresAt: "expires_at",
						createdAt: "created_at",
					},
				},
			},
		}),
	],
});
