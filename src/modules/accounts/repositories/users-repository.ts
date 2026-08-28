import type { CreateUser, User } from "@/modules/accounts/dtos/accounts-dto.js";

export interface UsersRepository {
	findById(id: string): Promise<User | null>;
	findByEmail(email: string): Promise<User | null>;
	findByIdWithPassword(
		id: string,
	): Promise<{ id: string; email: string; password: string | null } | null>;
	create(data: CreateUser): Promise<User>;
	findAll(): Promise<User[]>;
	markAsDeleted(userId: string, deletionJobId: string): Promise<User>;
	cancelDeletion(userId: string): Promise<User>;
	updatePassword(userId: string, passwordHash: string): Promise<void>;
	delete(userId: string): Promise<void>;
}
