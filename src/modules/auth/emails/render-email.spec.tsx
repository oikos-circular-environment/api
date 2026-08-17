import { Html, Text } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { renderEmail } from "./render-email.js";

interface TestEmailProps {
	message: string;
}

function TestEmail({ message }: TestEmailProps) {
	return (
		<Html lang="pt-BR">
			<Text>{message}</Text>
		</Html>
	);
}

describe("render-email", () => {
	it("renders html and plain text from a react element", async () => {
		const { html, text } = await renderEmail(
			<TestEmail message="hello world" />,
		);

		expect(html).toContain("hello world");
		expect(text).toContain("hello world");
	});

	it("returns html distinct from plain text", async () => {
		const { html, text } = await renderEmail(
			<TestEmail message="test content" />,
		);

		expect(html).toContain("<html");
		expect(text).not.toContain("<html");
		expect(text).toBe("test content");
	});
});
