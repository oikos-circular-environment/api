export type StoredRefreshToken = {
	id: string;
	jti: string;
	userId: string;
	expiresAt: Date;
	revokedAt: Date | null;
	createdAt: Date;
};

export type CreateRefreshToken = {
	jti: string;
	userId: string;
	expiresAt: Date;
};

export interface RefreshTokenRepository {
	create(data: CreateRefreshToken): Promise<void>;
	findByJti(jti: string): Promise<StoredRefreshToken | null>;
	revoke(jti: string): Promise<void>;
	revokeAllForUser(
		userId: string,
		options?: { exceptJti?: string },
	): Promise<void>;
}
