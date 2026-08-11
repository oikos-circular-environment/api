export type EmailMessage<TPayload = unknown> = {
	to: string;
	subject: string;
	type: string;
	payload: TPayload;
};

export interface EmailProvider {
	send<TPayload>(message: EmailMessage<TPayload>): Promise<void>;
}

export type EmailRenderer = {
	render(
		type: string,
		payload: unknown,
	): Promise<{ html: string; text: string }>;
};
