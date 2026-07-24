export type AuthTokenUser = {
	id: string;
	email: string;
};

export type AuthTokenPayload = {
	sub: string;
	user: AuthTokenUser;
	jti?: string;
	iat?: number;
	exp?: number;
};
