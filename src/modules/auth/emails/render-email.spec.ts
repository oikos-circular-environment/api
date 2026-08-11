import { Html, Text } from "@react-email/components";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderEmail } from "./render-email.js";

interface TestEmailProps {
	message: string;
}

function TestEmail({ message }: TestEmailProps) {
	return createElement(
		Html,
		{ lang: "pt-BR" },
		createElement(Text, null, message),
	);
}

describe("render-email", () => {
	it("renders html and plain text from a react element", async () => {
		const { html, text } = await renderEmail(
			createElement(TestEmail, { message: "hello world" }),
		);

		expect(html).toContain("hello world");
		expect(text).toContain("hello world");
	});

	it("returns html distinct from plain text", async () => {
		const { html, text } = await renderEmail(
			createElement(TestEmail, { message: "test content" }),
		);

		expect(html).toContain("<html");
		expect(text).not.toContain("<html");
		expect(text).toBe("test content");
	});
});
