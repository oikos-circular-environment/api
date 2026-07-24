import { randomUUID } from "node:crypto";
import type {
	CreateRefreshToken,
	RefreshTokenRepository,
	StoredRefreshToken,
} from "../refresh-token-repository.js";

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
	public items: StoredRefreshToken[] = [];

	async create({ jti, userId, expiresAt }: CreateRefreshToken) {
		this.items.push({
			id: randomUUID(),
			jti,
			userId,
			expiresAt,
			revokedAt: null,
			createdAt: new Date(),
		});
	}

	async findByJti(jti: string) {
		return this.items.find((item) => item.jti === jti) ?? null;
	}

	async revoke(jti: string) {
		const token = this.items.find((item) => item.jti === jti);
		if (token && token.revokedAt === null) {
			token.revokedAt = new Date();
		}
	}

	async revokeAllForUser(userId: string, options?: { exceptJti?: string }) {
		for (const token of this.items) {
			if (
				token.userId === userId &&
				token.revokedAt === null &&
				token.jti !== options?.exceptJti
			) {
				token.revokedAt = new Date();
			}
		}
	}
}
