import bcrypt from "bcryptjs";
import { env } from "../../src/env/index.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";

export async function seedGoogleAccount(prisma: PrismaClient) {
	const email = env.GOOGLE_ACCOUNT_EMAIL;
	const password = env.GOOGLE_ACCOUNT_PASSWORD;

	console.log("Seeding Google validation account...");

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
