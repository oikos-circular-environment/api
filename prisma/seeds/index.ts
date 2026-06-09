import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { seedRecyclingCompanies } from "./recycling-companies.js";
import { seedWasteCategories } from "./waste-categories.seed.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function seed() {
	await seedWasteCategories(prisma);
	await seedRecyclingCompanies(prisma);
}

seed()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
