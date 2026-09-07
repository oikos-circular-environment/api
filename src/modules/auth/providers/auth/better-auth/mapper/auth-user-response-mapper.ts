import type { AuthUserResponse } from "@/modules/auth/dtos/auth-user-dto.js";
import type { AuthUser } from "../../auth-provider.js";

export function authUserResponseMapper(
	user: AuthUser,
): Omit<AuthUserResponse, "organizations"> {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		email_verified: user.emailVerified,
		image: user.image,
		role: user.role,
		banned: user.banned,
		ban_reason: user.banReason,
		ban_expires: user.banExpires?.toISOString() ?? null,
		created_at: user.createdAt.toISOString(),
		updated_at: user.updatedAt.toISOString(),
	};
}

export function authUserWithOrganizationsResponseMapper(
	user: AuthUser,
	organizations: Array<{
		id: string;
		companyId: string | null;
		name: string;
		role: string;
	}>,
): AuthUserResponse {
	return {
		...authUserResponseMapper(user),
		organizations: organizations.map((org) => ({
			id: org.id,
			company_id: org.companyId,
			name: org.name,
			role: org.role,
		})),
	};
}
