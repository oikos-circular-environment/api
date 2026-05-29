import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "@/env/index.js";
import { PrismaClient } from "@/generated/prisma/client.js";

const pool = new pg.Pool({
	connectionString: env.DATABASE_URL,
	max: 20,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 5_000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };
