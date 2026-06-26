import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/env/index.js";
import { PrismaClient } from "@/generated/prisma/client.js";
import { seedGoogleAccount } from "./google-account.seed.js";
import { seedRecyclingCompanies } from "./recycling-companies.js";
import { seedUsers } from "./users.seed.js";
import { seedWasteCategories } from "./waste-categories.seed.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seed() {
	await seedWasteCategories(prisma);
	await seedGoogleAccount(prisma);
	await seedUsers(prisma);
	await seedRecyclingCompanies(prisma);
}

seed()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
