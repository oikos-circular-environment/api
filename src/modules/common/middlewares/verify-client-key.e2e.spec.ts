import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";

describe("verify-client-key (wiring, CLIENT_KEY_ENFORCE=false in test env)", () => {
	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	it("allows a request with a valid client-key", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/waste-categories",
			headers: { "x-client-key": "test-mobile-client-key" },
		});

		expect(res.statusCode).toBe(200);
	});

	it("allows a request without any client-key (enforce disabled in test env)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/waste-categories",
		});

		expect(res.statusCode).toBe(200);
	});

	it("allows a request with an invalid client-key (enforce disabled in test env)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/waste-categories",
			headers: { "x-client-key": "not-a-real-key" },
		});

		expect(res.statusCode).toBe(200);
	});

	it("does not block /health regardless of client-key", async () => {
		const res = await app.inject({ method: "GET", url: "/health" });

		expect(res.statusCode).toBe(200);
	});
});
