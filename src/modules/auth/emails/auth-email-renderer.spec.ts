import { describe, expect, it } from "vitest";
import { AuthEmailRenderer } from "./auth-email-renderer.js";

describe("auth-email-renderer", () => {
	const renderer = new AuthEmailRenderer();

	it("renders reset-password email with the provided url and name", async () => {
		const { html, text } = await renderer.render("reset-password", {
			url: "https://app.oikos.company/reset?token=abc",
			token: "abc",
			name: "Maria Souza",
		});

		expect(html).toContain("Redefinir senha");
		expect(html).toContain("https://app.oikos.company/reset?token=abc");
		expect(text).toContain("Redefinir senha");
		expect(text).toContain("Maria Souza");
	});

	it("renders verify-email email with the provided url and name", async () => {
		const { html, text } = await renderer.render("verify-email", {
			url: "https://app.oikos.company/verify?token=xyz",
			token: "xyz",
			name: "João Silva",
		});

		expect(html).toContain("Confirme seu e-mail");
		expect(html).toContain("https://app.oikos.company/verify?token=xyz");
		expect(text).toContain("CONFIRME SEU E-MAIL");
		expect(text).toContain("João Silva");
	});

	it("renders welcome email with the provided login url and name", async () => {
		const { html, text } = await renderer.render("welcome", {
			loginUrl: "https://app.oikos.company/login",
			name: "Ana Pereira",
		});

		expect(html).toContain("Bem-vindo à Oikos");
		expect(html).toContain("https://app.oikos.company/login");
		expect(text).toContain("BEM-VINDO À OIKOS");
		expect(text).toContain("Ana Pereira");
	});

	it("throws for unsupported email types", async () => {
		await expect(renderer.render("unknown", {})).rejects.toThrow(
			"Unsupported email type: unknown",
		);
	});
});
