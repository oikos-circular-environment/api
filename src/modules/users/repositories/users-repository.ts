import type { User } from "@/modules/users/dtos/users-dto.js";

export interface UsersRepository {
	findById(id: string): Promise<User | null>;
	findByEmail(email: string): Promise<User | null>;
	findAll(): Promise<User[]>;
	markAsDeleted(userId: string, deletionJobId: string): Promise<User>;
	cancelDeletion(userId: string): Promise<User>;
	delete(userId: string): Promise<void>;
}
