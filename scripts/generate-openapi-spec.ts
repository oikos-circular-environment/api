import { writeFileSync } from "node:fs";
import { app } from "../src/app.js";

await app.ready();
writeFileSync(
	"packages/oikos-sdk/openapi.json",
	JSON.stringify(app.swagger(), null, 2),
);
await app.close();
process.exit(0);
