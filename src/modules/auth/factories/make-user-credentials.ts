import { faker } from "@faker-js/faker";
import type { LoginInput } from "@/modules/auth/dtos/auth-dto.js";

export const TEST_PASSWORD = "Test@123456";

export function makeUserCredentials(overrides?: Partial<LoginInput>): LoginInput {
	return {
		email: faker.internet.email(),
		password: TEST_PASSWORD,
		...overrides,
	};
}
