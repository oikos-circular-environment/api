import type { EmailRenderer } from "@/modules/common/providers/email/email-provider.js";
import { renderEmail } from "./render-email.js";
import ResetPasswordEmail from "./reset-password.js";
import VerifyEmail from "./verify-email.js";
import WelcomeEmail from "./welcome.js";

const DEFAULT_LINK_EXPIRES_IN_MINUTES = 60;

type ResetPasswordPayload = {
	url: string;
	token: string;
	name?: string;
};

type VerifyEmailPayload = {
	url: string;
	token: string;
	name?: string;
};

type WelcomePayload = {
	loginUrl: string;
	name?: string;
};

export class AuthEmailRenderer implements EmailRenderer {
	async render(
		type: string,
		payload: unknown,
	): Promise<{ html: string; text: string }> {
		switch (type) {
			case "reset-password": {
				const data = payload as ResetPasswordPayload;
				return renderEmail(
					ResetPasswordEmail({
						userName: data.name,
						resetUrl: data.url,
						expiresInMinutes: DEFAULT_LINK_EXPIRES_IN_MINUTES,
					}),
				);
			}
			case "verify-email": {
				const data = payload as VerifyEmailPayload;
				return renderEmail(
					VerifyEmail({
						userName: data.name,
						verificationUrl: data.url,
						expiresInMinutes: DEFAULT_LINK_EXPIRES_IN_MINUTES,
					}),
				);
			}
			case "welcome": {
				const data = payload as WelcomePayload;
				return renderEmail(
					WelcomeEmail({
						userName: data.name,
						loginUrl: data.loginUrl,
					}),
				);
			}
			default:
				throw new Error(`Unsupported email type: ${type}`);
		}
	}
}
