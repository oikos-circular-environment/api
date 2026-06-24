import { randomUUID } from "node:crypto";
import type { CreateUser, User } from "@/modules/users/dtos/users-dto.js";
import type { UsersRepository } from "@/modules/users/repositories/users-repository.js";

export class InMemoryUsersRepository implements UsersRepository {
	public items: User[] = [];

	async findById(id: string) {
		const user = this.items.find((item) => item.id === id);

		if (!user) {
			return null;
		}

		return user;
	}

	async findByEmail(email: string) {
		const user = this.items.find((item) => item.email === email);

		if (!user) {
			return null;
		}

		return user;
	}

	async create(data: CreateUser) {
		const user: User = {
			id: randomUUID(),
			email: data.email,
			password: data.password,
			created_at: new Date(),
			deleted_at: null,
			deletion_job_id: null,
		};

		this.items.push(user);

		return user;
	}

	async findAll(): Promise<User[]> {
		return this.items;
	}

	async markAsDeleted(userId: string, deletionJobId: string) {
		const index = this.items.findIndex((item) => item.id === userId);
		this.items[index].deleted_at = new Date();
		this.items[index].deletion_job_id = deletionJobId;
		return this.items[index];
	}

	async cancelDeletion(userId: string) {
		const index = this.items.findIndex((item) => item.id === userId);
		this.items[index].deleted_at = null;
		this.items[index].deletion_job_id = null;
		return this.items[index];
	}

	async delete(userId: string) {
		const index = this.items.findIndex((item) => item.id === userId);
		this.items.splice(index, 1);
	}
}
