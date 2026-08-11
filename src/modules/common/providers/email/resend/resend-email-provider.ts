import { Resend } from "resend";
import type {
	EmailMessage,
	EmailProvider,
	EmailRenderer,
} from "../email-provider.js";
import { getResendConfig } from "./resend-config.js";

export class ResendEmailProvider implements EmailProvider {
	private readonly resend: Resend;

	constructor(private readonly renderer: EmailRenderer) {
		const { apiKey } = getResendConfig();
		this.resend = new Resend(apiKey);
	}

	async send<TPayload>(message: EmailMessage<TPayload>): Promise<void> {
		const { fromEmail } = getResendConfig();
		const { html, text } = await this.renderer.render(
			message.type,
			message.payload,
		);

		const { error } = await this.resend.emails.send(
			{
				from: fromEmail,
				to: message.to,
				subject: message.subject,
				html,
				text,
			},
			{
				idempotencyKey: `${message.type}/${message.to}`,
			},
		);

		if (error) {
			throw new Error(
				`Failed to send email via Resend: ${error.message} (type=${message.type}, to=${message.to})`,
			);
		}
	}
}
