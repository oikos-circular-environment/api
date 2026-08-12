import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { User } from "@/modules/users/dtos/users-dto.js";

export function makeUser(overrides?: Partial<User>): User {
	return {
		id: randomUUID(),
		email: faker.internet.email(),
		created_at: new Date(),
		deleted_at: null,
		deletion_job_id: null,
		...overrides,
	};
}
