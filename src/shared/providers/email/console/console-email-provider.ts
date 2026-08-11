import { serverLogger } from "@/lib/logger.js";
import type { EmailMessage, EmailProvider } from "../email-provider.js";

export class ConsoleEmailProvider implements EmailProvider {
	async send<TPayload>(message: EmailMessage<TPayload>): Promise<void> {
		serverLogger.info(
			{
				to: message.to,
				subject: message.subject,
				type: message.type,
				payload: message.payload,
			},
			"email sent",
		);
	}
}
