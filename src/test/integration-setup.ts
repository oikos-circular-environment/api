import "dotenv/config";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
const envTestLocalPath = resolve(root, ".env.test.local");

const LOCAL_DB_URL = "postgresql://oikos:oikos_dev@localhost:5432/oikos";

let testSchema: string;

export async function setup() {
	try {
		testSchema = `test_${randomUUID().replace(/-/g, "").substring(0, 16)}`;

		const client = new pg.Client({ connectionString: LOCAL_DB_URL });
		await client.connect();

		// Drop stale schemas from previous failed runs
		const stale = await client.query<{ schema_name: string }>(
			`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'test_%'`,
		);
		for (const { schema_name } of stale.rows) {
			await client.query(`DROP SCHEMA "${schema_name}" CASCADE`);
		}

		await client.query(`CREATE SCHEMA "${testSchema}"`);
		await client.end();

		// ?schema= makes Prisma schema-qualify _prisma_migrations lookups (won't inherit from public).
		// Migration SQL uses public.geography() and public.ST_*() so PostGIS types resolve without
		// public in search_path (Prisma 7 does not include public when schema= is set).
		const testDbUrl = `${LOCAL_DB_URL}?schema=${testSchema}`;

		// Write .env.test.local so setupFiles (worker context) can load it via dotenv.
		// REDIS_URL uses DB 1 to prevent dev-server workers (DB 0) from stealing test queue jobs.
		writeFileSync(
			envTestLocalPath,
			`DATABASE_URL=${LOCAL_DB_URL}\nDATABASE_SCHEMA=${testSchema}\nREDIS_URL=redis://localhost:6379/1\n`,
		);

		execSync("npx prisma migrate deploy", {
			cwd: root,
			env: { ...process.env, DATABASE_URL: testDbUrl },
			stdio: "pipe",
		});
	} catch (err) {
		console.error("[integration-setup] setup failed:", err);
		throw err;
	}
}

export async function teardown() {
	try {
		unlinkSync(envTestLocalPath);
	} catch {
		/* already removed */
	}

	if (!testSchema) return;

	const client = new pg.Client({ connectionString: LOCAL_DB_URL });
	await client.connect();
	await client.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
	await client.end();
}
