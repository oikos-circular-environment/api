import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../../src/env/index.js";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { seedAppleAccount } from "./apple-account.seed.js";
import { seedComplaints } from "./complaints.js";
import { seedGoogleAccount } from "./google-account.seed.js";
import { seedRecyclingCompanies } from "./recycling-companies.js";
import { seedUsers } from "./users.seed.js";
import { seedWasteCategories } from "./waste-categories.seed.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seed() {
	await seedWasteCategories(prisma);
	// await seedGoogleAccount(prisma);
	// await seedAppleAccount(prisma);
	// await seedUsers(prisma);
	await seedRecyclingCompanies(prisma);
	// Depende de seedRecyclingCompanies ter rodado antes: resoluções com
	// resolution_hint "PREFER_COMPANY" só encontram uma empresa real do
	// morador se as empresas já existirem no banco neste momento — sem elas,
	// cai para CITIZEN_ONLY (comportamento correto, não é erro).
	await seedComplaints(prisma);
}

seed()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
