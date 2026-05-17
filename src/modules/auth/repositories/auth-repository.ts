import type { AuthUser } from "@/modules/auth/dtos/auth-dto.js";

export interface AuthRepository {
	findByEmail(email: string): Promise<AuthUser | null>;
	findById(id: string): Promise<{ id: string; email: string } | null>;
}
