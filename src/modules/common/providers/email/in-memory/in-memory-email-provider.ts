import type { EmailMessage, EmailProvider } from "../email-provider.js";

export class InMemoryEmailProvider implements EmailProvider {
	public messages: EmailMessage<unknown>[] = [];

	async send<TPayload>(message: EmailMessage<TPayload>): Promise<void> {
		this.messages.push(message as EmailMessage<unknown>);
	}

	getMessages(to?: string, type?: string): EmailMessage<unknown>[] {
		return this.messages.filter(
			(message) =>
				(to === undefined || message.to === to) &&
				(type === undefined || message.type === type),
		);
	}

	getResetTokenForEmail(email: string): string | null {
		const message = this.messages.find(
			(item) => item.to === email && item.type === "reset-password",
		);
		if (!message) return null;
		const payload = message.payload as { token: string };
		return payload.token ?? null;
	}

	getVerificationTokenForEmail(email: string): string | null {
		const message = this.messages.find(
			(item) => item.to === email && item.type === "verify-email",
		);
		if (!message) return null;
		const payload = message.payload as { token: string };
		return payload.token ?? null;
	}

	clear(): void {
		this.messages = [];
	}
}
