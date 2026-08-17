import { env } from "@/env/index.js";

export function getResendConfig(): {
	apiKey: string;
	fromEmail: string;
} {
	const { RESEND_API_KEY, RESEND_FROM_EMAIL } = env;
	if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
		throw new Error("Resend config unavailable. Ensure EMAIL_PROVIDER=resend");
	}
	return { apiKey: RESEND_API_KEY, fromEmail: RESEND_FROM_EMAIL };
}
