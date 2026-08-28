import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)), "..");

// Load base test env before importing any module that reads env vars.
// A local .env.test.local (gitignored) can override this if needed.
config({ path: resolve(root, ".env.test") });
config({ path: resolve(root, ".env.test.local"), override: true });
