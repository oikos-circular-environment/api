import bcrypt from "bcryptjs";
import { env } from "../../src/env/index.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";

export async function seedAppleAccount(prisma: PrismaClient) {
	const email = env.APPLE_ACCOUNT_EMAIL;
	const password = env.APPLE_ACCOUNT_PASSWORD;

	if (!email || !password) {
		console.log(
			"Skipping Apple validation account seed (APPLE_ACCOUNT_EMAIL/PASSWORD not set)",
		);
		return;
	}

	console.log("Seeding Apple validation account...");

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		console.log(`  skip: ${email} (already exists)`);
		return;
	}

	const passwordHash = await bcrypt.hash(password, 10);

	await prisma.user.create({
		data: { email, password: passwordHash },
	});

	console.log(`  created: ${email} ✓`);
}
