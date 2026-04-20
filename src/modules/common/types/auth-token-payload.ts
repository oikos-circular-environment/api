export type AuthTokenUser = {
  id: string;
  email: string;
};

export type AuthTokenPayload = {
  sub: string;
  user: AuthTokenUser;
  iat?: number;
  exp?: number;
};
