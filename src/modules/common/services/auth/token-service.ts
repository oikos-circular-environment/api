import { randomUUID } from "node:crypto";

export const ACCESS_TOKEN_EXPIRES_IN = "1d";
export const REFRESH_TOKEN_EXPIRES_IN = "7d";
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const refreshCookieOptions = {
	path: "/",
	httpOnly: true,
	sameSite: "strict",
	secure: true,
} as const;

export type TokenSigner = {
	sign(
		payload: object,
		options: { sub: string; expiresIn: string },
	): Promise<string>;
};

export type RefreshTokenIssuer = {
	create(data: { jti: string; userId: string; expiresAt: Date }): Promise<void>;
};

export async function issueAuthTokens(
	signer: TokenSigner,
	issuer: RefreshTokenIssuer,
	user: { id: string; email: string },
): Promise<{ token: string; refreshToken: string }> {
	const token = await signer.sign(
		{ user: { id: user.id, email: user.email } },
		{ sub: user.id, expiresIn: ACCESS_TOKEN_EXPIRES_IN },
	);

	const jti = randomUUID();
	const refreshToken = await signer.sign(
		{ user: { id: user.id, email: user.email }, jti },
		{ sub: user.id, expiresIn: REFRESH_TOKEN_EXPIRES_IN },
	);

	await issuer.create({
		jti,
		userId: user.id,
		expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
	});

	return { token, refreshToken };
}
