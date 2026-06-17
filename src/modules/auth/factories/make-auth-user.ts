import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { AuthUser } from "@/modules/auth/dtos/auth-dto.js";

export const TEST_PASSWORD = "Test@123456";

export function makeAuthUser(overrides?: Partial<AuthUser>): AuthUser {
	return {
		id: randomUUID(),
		email: faker.internet.email(),
		password: TEST_PASSWORD,
		...overrides,
	};
}
