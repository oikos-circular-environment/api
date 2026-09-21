import bcrypt from "bcryptjs";
import type { Prisma } from "../../src/generated/prisma/client.js";

const BCRYPT_COST = 10;
const FIXED_SEED_PASSWORD =
	process.env.SEED_FIXED_USER_PASSWORD ?? "Oikos@123456";

async function upsertFixedUser(
	prisma: Prisma.TransactionClient,
	args: { email: string; name: string; role: "user" },
) {
	const existing = await prisma.user.findUnique({
		where: { email: args.email },
		select: { id: true },
	});
	if (existing) return { userId: existing.id };

	const created = await prisma.user.create({
		data: {
			email: args.email,
			name: args.name,
			email_verified: true,
			role: args.role,
			profile: {
				create: {
					full_name: args.name,
					display_name: args.name.split(" ")[0] ?? args.name,
					phone: "66999990000",
				},
			},
		},
	});

	const passwordHash = await bcrypt.hash(FIXED_SEED_PASSWORD, BCRYPT_COST);
	await prisma.account.create({
		data: {
			account_id: created.id,
			provider_id: "credential",
			password: passwordHash,
			user_id: created.id,
		},
	});

	return { userId: created.id };
}

export async function seedFixedUsers(prisma: Prisma.TransactionClient) {
	await upsertFixedUser(prisma, {
		email: "christiancnp@gmail.com",
		name: "Christian (usuário básico)",
		role: "user",
	});
}
