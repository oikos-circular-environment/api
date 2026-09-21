import { randomUUID } from "node:crypto";
import type { TestHelpers } from "better-auth/plugins";
import { auth } from "@/modules/auth/providers/auth/better-auth/better-auth.js";

type CreateUserOverrides = Parameters<TestHelpers["createUser"]>[0];

let testUtilsPromise: Promise<TestHelpers> | null = null;

function getTestUtils(): Promise<TestHelpers> {
	if (!testUtilsPromise) {
		testUtilsPromise = auth.$context.then((ctx) => ctx.test);
	}
	return testUtilsPromise;
}

export async function createTestUser(overrides?: CreateUserOverrides) {
	const test = await getTestUtils();
	const user = test.createUser({
		id: randomUUID(),
		email: `e2e-${randomUUID()}@test.local`,
		name: "E2E User",
		emailVerified: true,
		...overrides,
	});
	await test.saveUser(user);
	return user;
}

export async function loginTestUser(userId: string) {
	const test = await getTestUtils();
	return test.login({ userId });
}

export async function createAuthenticatedTestUser(
	overrides?: CreateUserOverrides,
) {
	const user = await createTestUser(overrides);
	const { token, headers } = await loginTestUser(user.id);
	return { user, token, headers };
}

export async function deleteTestUser(userId: string) {
	const test = await getTestUtils();
	await test.deleteUser(userId);
}
