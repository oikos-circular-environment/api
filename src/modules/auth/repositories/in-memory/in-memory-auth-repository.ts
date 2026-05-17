import { randomUUID } from "node:crypto";
import type { AuthUser } from "@/modules/auth/dtos/auth-dto.js";
import type { AuthRepository } from "../auth-repository.js";

export class InMemoryAuthRepository implements AuthRepository {
	public items: AuthUser[] = [];

	async findByEmail(email: string) {
		return this.items.find((item) => item.email === email) ?? null;
	}

	async findById(id: string) {
		const user = this.items.find((item) => item.id === id);
		if (!user) return null;
		return { id: user.id, email: user.email };
	}

	async create(data: { email: string; password: string }) {
		const user: AuthUser = {
			id: randomUUID(),
			...data,
		};
		this.items.push(user);
		return user;
	}
}
