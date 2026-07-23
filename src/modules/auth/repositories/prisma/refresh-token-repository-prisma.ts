import { prisma } from "@/lib/prisma.js";
import type {
	CreateRefreshToken,
	RefreshTokenRepository,
	StoredRefreshToken,
} from "../refresh-token-repository.js";

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
	async create({ jti, userId, expiresAt }: CreateRefreshToken) {
		await prisma.refreshToken.create({
			data: { jti, user_id: userId, expires_at: expiresAt },
		});
	}

	async findByJti(jti: string): Promise<StoredRefreshToken | null> {
		const token = await prisma.refreshToken.findUnique({ where: { jti } });

		if (!token) return null;

		return {
			id: token.id,
			jti: token.jti,
			userId: token.user_id,
			expiresAt: token.expires_at,
			revokedAt: token.revoked_at,
			createdAt: token.created_at,
		};
	}

	async revoke(jti: string) {
		await prisma.refreshToken.updateMany({
			where: { jti, revoked_at: null },
			data: { revoked_at: new Date() },
		});
	}

	async revokeAllForUser(userId: string, options?: { exceptJti?: string }) {
		await prisma.refreshToken.updateMany({
			where: {
				user_id: userId,
				revoked_at: null,
				...(options?.exceptJti ? { jti: { not: options.exceptJti } } : {}),
			},
			data: { revoked_at: new Date() },
		});
	}
}
