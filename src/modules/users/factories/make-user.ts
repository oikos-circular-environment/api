import { faker } from "@faker-js/faker";
import type { CreateUser } from "@/modules/users/dtos/users-dto.js";

export const TEST_PASSWORD = "Test@123456";

export function makeUserInput(overrides?: Partial<CreateUser>): CreateUser {
	return {
		email: faker.internet.email(),
		password: TEST_PASSWORD,
		...overrides,
	};
}
