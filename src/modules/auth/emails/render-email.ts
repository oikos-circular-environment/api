import { render } from "@react-email/render";
import type { ReactElement } from "react";

interface RenderEmailResult {
	html: string;
	text: string;
}

export async function renderEmail(
	element: ReactElement,
): Promise<RenderEmailResult> {
	const [html, text] = await Promise.all([
		render(element),
		render(element, { plainText: true }),
	]);

	return { html, text };
}
