import type { Prisma } from "@/generated/prisma/client.js";
import type { CreateUser, User } from "@/modules/accounts/dtos/accounts-dto.js";

export interface UsersRepository {
	findById(id: string): Promise<User | null>;
	findByEmail(email: string): Promise<User | null>;
	create(data: CreateUser): Promise<User>;
	findAll(): Promise<User[]>;
	markAsDeleted(userId: string, deletionJobId: string): Promise<User>;
	cancelDeletion(userId: string): Promise<User>;
	delete(userId: string): Promise<void>;
	updateName(
		userId: string,
		name: string,
		tx?: Prisma.TransactionClient,
	): Promise<void>;
	updateImage(
		userId: string,
		image: string | null,
		tx?: Prisma.TransactionClient,
	): Promise<void>;
}
