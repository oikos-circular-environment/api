import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { User } from "@/modules/users/dtos/users-dto.js";

export const TEST_PASSWORD = "Test@123456";

export type UserWithPassword = User & { password: string };

export function makeUser(
	overrides?: Partial<Omit<User, "password">>,
): UserWithPassword {
	return {
		id: randomUUID(),
		email: faker.internet.email(),
		password: TEST_PASSWORD,
		created_at: new Date(),
		deleted_at: null,
		deletion_job_id: null,
		...overrides,
	};
}
