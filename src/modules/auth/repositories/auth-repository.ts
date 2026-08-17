export type AuthUserRecord = {
	id: string;
	email: string;
	password: string | null;
};

export interface AuthRepository {
	findByEmail(email: string): Promise<AuthUserRecord | null>;
	findById(id: string): Promise<{ id: string; email: string } | null>;
}
