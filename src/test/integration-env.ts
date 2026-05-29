import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)), "..");

// Load the ephemeral env file written by globalSetup before any test module is imported
config({ path: resolve(root, ".env.test.local"), override: true });
