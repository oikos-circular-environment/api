import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("create-support", () => {
	const createdSupportIds: string[] = [];

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdSupportIds.length > 0) {
			await prisma.support.deleteMany({
				where: { id: { in: createdSupportIds } },
			});
			createdSupportIds.length = 0;
		}
	});

	it("200 — creates support with no attachments", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			payload: {
				title: "App crashes on login",
				description: "It crashes every time I try to log in.",
				type: "ERROR",
				reporter_email: "user@example.com",
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.support.title).toBe("App crashes on login");
		expect(body.support.type).toBe("ERROR");
		expect(body.support.status).toBe("OPEN");
		expect(body.support.reporter_email).toBe("user@example.com");
		expect(body.support.attachments).toStrictEqual([]);
		createdSupportIds.push(body.support.id);
	});

	it("200 — defaults type to SUPPORT when omitted from the request", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			payload: {
				title: "Feature idea",
				description: "It would be nice to have dark mode.",
				reporter_email: "user@example.com",
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.support.type).toBe("SUPPORT");
		createdSupportIds.push(body.support.id);
	});

	it("200 — creates support with environment payload", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			payload: {
				title: "Crash on submit",
				description: "App crashes when I tap submit.",
				type: "ERROR",
				reporter_email: "user@example.com",
				environment: {
					platform: "android",
					app_version: "1.2.3",
				},
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.support.environment.platform).toBe("android");
		createdSupportIds.push(body.support.id);
	});

	it("400 — missing title and description", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			payload: {
				reporter_email: "user@example.com",
			},
		});

		expect(res.statusCode).toBe(400);
	});

	it("400 — missing reporter_email", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			payload: {
				title: "No email",
				description: "Sending without an email.",
			},
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_EMAIL_REQUIRED");
	});

	it("400 — invalid environment shape", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			payload: {
				title: "Invalid environment",
				description: "Sending a malformed environment field.",
				reporter_email: "user@example.com",
				environment: { platform: "windows", app_version: "1.0.0" },
			},
		});

		expect(res.statusCode).toBe(400);
	});
});
