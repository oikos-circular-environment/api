import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)), "..");

// Load base test env, then override with the ephemeral file written by globalSetup.
// .env.test.local carries DATABASE_SCHEMA (dynamic) and overrides from local machine if needed.
config({ path: resolve(root, ".env.test") });
config({ path: resolve(root, ".env.test.local"), override: true });
