import { env } from "@/env/index.js";
import { serverLogger } from "@/lib/logger.js";
import { ConsoleEmailProvider } from "./console/console-email-provider.js";
import type { EmailProvider } from "./email-provider.js";
import { InMemoryEmailProvider } from "./in-memory/in-memory-email-provider.js";

export function makeEmailProvider(): EmailProvider {
	if (env.EMAIL_PROVIDER === "in-memory") {
		return new InMemoryEmailProvider();
	}

	if (env.EMAIL_PROVIDER !== "console") {
		serverLogger.warn(
			{ emailProvider: env.EMAIL_PROVIDER },
			"Unknown EMAIL_PROVIDER; falling back to console",
		);
	}

	return new ConsoleEmailProvider();
}
