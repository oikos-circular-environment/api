import 'dotenv/config';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

const LOCAL_DB_URL = 'postgresql://oikos:oikos_dev@localhost:5432/oikos';

let testSchema: string;

export async function setup() {
  testSchema = `test_${randomUUID().replace(/-/g, '').substring(0, 16)}`;

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

  // search_path includes public so PostGIS types/functions remain accessible
  const testDbUrl = `${LOCAL_DB_URL}?options=-c%20search_path%3D${testSchema}%2Cpublic`;
  process.env.DATABASE_URL = testDbUrl;

  execSync('npx prisma migrate deploy', {
    cwd: root,
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'pipe',
  });
}

export async function teardown() {
  if (!testSchema) return;

  const client = new pg.Client({ connectionString: LOCAL_DB_URL });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
  await client.end();
}
