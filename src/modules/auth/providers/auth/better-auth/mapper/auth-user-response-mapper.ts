import type { AuthV2UserResponse } from "@/modules/auth/dtos/auth-v2-dto.js";
import type { AuthUser } from "../../auth-provider.js";

export function authUserResponseMapper(
	user: AuthUser,
): Omit<AuthV2UserResponse, "organizations"> {
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
		auth_source: user.authSource,
		created_at: user.createdAt.toISOString(),
		updated_at: user.updatedAt.toISOString(),
	};
}
