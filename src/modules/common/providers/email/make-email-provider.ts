import { env } from "@/env/index.js";
import { ConsoleEmailProvider } from "./console/console-email-provider.js";
import type { EmailProvider } from "./email-provider.js";
import { InMemoryEmailProvider } from "./in-memory/in-memory-email-provider.js";

/**
 * Resolves the email provider from `EMAIL_PROVIDER`:
 *
 * - `console` (default) — logs recipient, subject and payload through
 *   `serverLogger`. Reset links show up in the server log, which is enough to
 *   exercise the flow locally via `/docs`.
 * - `in-memory` — keeps messages in an array so e2e tests can read the reset
 *   token back through `getResetTokenForEmail`. Not for use outside tests.
 * - `resend` — real delivery. **Not implemented yet** (E04, api#65): env
 *   validation already demands `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, so the
 *   factory throws instead of silently falling back to `console`.
 */
export function makeEmailProvider(): EmailProvider {
	if (env.EMAIL_PROVIDER === "resend") {
		throw new Error(
			"Resend email provider is not implemented yet (E04, api#65).",
		);
	}

	if (env.EMAIL_PROVIDER === "in-memory") {
		return new InMemoryEmailProvider();
	}

	return new ConsoleEmailProvider();
}
