import { env } from "@/env/index.js";
import { ConsoleEmailProvider } from "./console/console-email-provider.js";
import type { EmailProvider } from "./email-provider.js";
import { InMemoryEmailProvider } from "./in-memory/in-memory-email-provider.js";

export function makeEmailProvider(): EmailProvider {
	if (env.EMAIL_PROVIDER === "in-memory") {
		return new InMemoryEmailProvider();
	}

	return new ConsoleEmailProvider();
}
