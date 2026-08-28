import { env } from "@/env/index.js";
import { ConsoleEmailProvider } from "./console/console-email-provider.js";
import type { EmailProvider, EmailRenderer } from "./email-provider.js";
import { InMemoryEmailProvider } from "./in-memory/in-memory-email-provider.js";
import { ResendEmailProvider } from "./resend/resend-email-provider.js";

/**
 * Resolves the email provider from `EMAIL_PROVIDER`:
 *
 * - `console` (default) — logs recipient, subject and payload through
 *   `serverLogger`. Reset links show up in the server log, which is enough to
 *   exercise the flow locally via `/docs`.
 * - `in-memory` — keeps messages in an array so e2e tests can read the reset
 *   token back through `getResetTokenForEmail`. Not for use outside tests.
 * - `resend` — real delivery. Requires an `EmailRenderer` to translate message
 *   type + payload into html/text.
 */
export function makeEmailProvider(renderer?: EmailRenderer): EmailProvider {
	if (env.EMAIL_PROVIDER === "resend") {
		if (!renderer) {
			throw new Error("EmailRenderer is required when EMAIL_PROVIDER=resend.");
		}
		return new ResendEmailProvider(renderer);
	}

	if (env.EMAIL_PROVIDER === "in-memory") {
		return new InMemoryEmailProvider();
	}

	return new ConsoleEmailProvider();
}
