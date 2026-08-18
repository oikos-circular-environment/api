import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../../src/env/index.js";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { seedGeneratedCityData } from "./data-generated.js";
import { seedFixedUsers } from "./fixed-users.seed.js";
import { seedWasteCategories } from "./waste-categories.seed.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seed() {
	await seedWasteCategories(prisma);
	await seedFixedUsers(prisma);
	// Ordem interna (moradores → empresas → denúncias) garante que resoluções
	// com resolution_hint "PREFER_COMPANY" encontrem a empresa real do morador
	// já no banco — sem isso, cai para CITIZEN_ONLY (comportamento correto,
	// não é erro).
	await seedGeneratedCityData(prisma);
}

seed()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
