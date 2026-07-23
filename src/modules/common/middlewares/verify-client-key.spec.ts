import type { FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../errors/app-error.js";
import { createVerifyClientKey } from "./verify-client-key.js";

function makeRequest(headers: Record<string, string> = {}): FastifyRequest {
	return {
		headers,
		url: "/v1/market",
		log: { warn: vi.fn() },
	} as unknown as FastifyRequest;
}

const clients = [
	{ name: "mobile", key: "mobile-raw-key" },
	{ name: "web", key: "web-raw-key" },
];

describe("verify-client-key", () => {
	it("passes and sets request.apiClient when the key matches a known client", async () => {
		const verifyClientKey = createVerifyClientKey({ enforce: true, clients });
		const request = makeRequest({ "x-client-key": "mobile-raw-key" });

		await verifyClientKey(request);

		expect(request.apiClient).toEqual({ name: "mobile" });
	});

	it("matches a different known client independently", async () => {
		const verifyClientKey = createVerifyClientKey({ enforce: true, clients });
		const request = makeRequest({ "x-client-key": "web-raw-key" });

		await verifyClientKey(request);

		expect(request.apiClient).toEqual({ name: "web" });
	});

	it("throws 401 when enforcing and the key is missing", async () => {
		const verifyClientKey = createVerifyClientKey({ enforce: true, clients });
		const request = makeRequest();

		await expect(verifyClientKey(request)).rejects.toThrow(AppError);
		await expect(verifyClientKey(request)).rejects.toMatchObject({
			code: "INVALID_CLIENT_KEY",
			statusCode: 401,
		});
	});

	it("throws 401 when enforcing and the key is invalid", async () => {
		const verifyClientKey = createVerifyClientKey({ enforce: true, clients });
		const request = makeRequest({ "x-client-key": "garbage" });

		await expect(verifyClientKey(request)).rejects.toThrow(AppError);
	});

	it("ignores a client entry configured with an empty key", async () => {
		const verifyClientKey = createVerifyClientKey({
			enforce: true,
			clients: [{ name: "web", key: "" }],
		});
		const request = makeRequest({ "x-client-key": "" });

		await expect(verifyClientKey(request)).rejects.toThrow(AppError);
	});

	it("does not throw when enforce is disabled, but logs the violation", async () => {
		const verifyClientKey = createVerifyClientKey({ enforce: false, clients });
		const request = makeRequest();

		await expect(verifyClientKey(request)).resolves.toBeUndefined();
		expect(request.log.warn).toHaveBeenCalledOnce();
	});

	it("does not call the log warning when enforce is disabled but the key is valid", async () => {
		const verifyClientKey = createVerifyClientKey({
			enforce: false,
			clients,
		});
		const request = makeRequest({ "x-client-key": "mobile-raw-key" });

		await verifyClientKey(request);

		expect(request.apiClient).toEqual({ name: "mobile" });
		expect(request.log.warn).not.toHaveBeenCalled();
	});
});
