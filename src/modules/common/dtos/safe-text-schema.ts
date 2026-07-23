import sanitizeHtml from "sanitize-html";
import z from "zod";

export function sanitizeText(value: string): string {
	return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
}

export function safeTextSchema({
	min,
	max,
	minMessage,
	maxMessage,
}: {
	min: number;
	max: number;
	minMessage?: string;
	maxMessage?: string;
}) {
	return z
		.string()
		.trim()
		.min(min, minMessage)
		.max(max, maxMessage)
		.transform(sanitizeText);
}
