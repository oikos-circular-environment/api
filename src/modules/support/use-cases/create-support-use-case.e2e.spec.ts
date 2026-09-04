import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import {
	JPEG_MAGIC_BYTES,
	PNG_MAGIC_BYTES,
} from "@/modules/common/test/image-fixtures.js";

type MultipartFileInput = {
	field?: string;
	fileName: string;
	mimeType: string;
	content: Buffer;
};

async function buildMultipartPayload(
	fields: Record<string, string>,
	files: MultipartFileInput[] = [],
): Promise<{ payload: Buffer; contentType: string }> {
	const form = new FormData();

	for (const [key, value] of Object.entries(fields)) {
		form.append(key, value);
	}

	for (const file of files) {
		form.append(
			file.field ?? "images",
			new Blob([new Uint8Array(file.content)], { type: file.mimeType }),
			file.fileName,
		);
	}

	const request = new Request("http://localhost", {
		method: "POST",
		body: form,
	});
	const arrayBuffer = await request.arrayBuffer();
	const contentType = request.headers.get("content-type");

	if (!contentType) {
		throw new Error(
			"Missing content-type header while building multipart payload",
		);
	}

	return { payload: Buffer.from(arrayBuffer), contentType };
}

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

	it("200 — creates support with 2 images", async () => {
		const { payload, contentType } = await buildMultipartPayload(
			{
				title: "App crashes on login",
				description: "It crashes every time I try to log in.",
				type: "ERROR",
				reporter_email: "user@example.com",
			},
			[
				{
					fileName: "1.png",
					mimeType: "image/png",
					content: PNG_MAGIC_BYTES,
				},
				{
					fileName: "2.jpg",
					mimeType: "image/jpeg",
					content: JPEG_MAGIC_BYTES,
				},
			],
		);

		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.support.title).toBe("App crashes on login");
		expect(body.support.type).toBe("ERROR");
		expect(body.support.status).toBe("OPEN");
		expect(body.support.reporter_email).toBe("user@example.com");
		expect(body.support.attachments).toHaveLength(2);
		createdSupportIds.push(body.support.id);
	});

	it("200 — defaults type to SUPPORT when omitted from the request", async () => {
		const { payload, contentType } = await buildMultipartPayload({
			title: "Feature idea",
			description: "It would be nice to have dark mode.",
			reporter_email: "user@example.com",
		});

		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.support.type).toBe("SUPPORT");
		createdSupportIds.push(body.support.id);
	});

	it("200 — creates support with environment payload", async () => {
		const { payload, contentType } = await buildMultipartPayload({
			title: "Crash on submit",
			description: "App crashes when I tap submit.",
			type: "ERROR",
			reporter_email: "user@example.com",
			environment: JSON.stringify({
				platform: "android",
				app_version: "1.2.3",
			}),
		});

		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.support.environment.platform).toBe("android");
		createdSupportIds.push(body.support.id);
	});

	it("400 — missing title and description", async () => {
		const { payload, contentType } = await buildMultipartPayload({
			reporter_email: "user@example.com",
		});

		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_INVALID_BODY");
	});

	it("400 — missing reporter_email", async () => {
		const { payload, contentType } = await buildMultipartPayload({
			title: "No email",
			description: "Sending without an email.",
		});

		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_EMAIL_REQUIRED");
	});

	it("400 — invalid environment JSON", async () => {
		const { payload, contentType } = await buildMultipartPayload({
			title: "Invalid environment",
			description: "Sending a malformed environment field.",
			reporter_email: "user@example.com",
			environment: "{not-json",
		});

		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_INVALID_BODY");
	});

	it("400 — invalid attachment mime type", async () => {
		const { payload, contentType } = await buildMultipartPayload(
			{
				title: "Invalid file",
				description: "Sending a gif.",
				reporter_email: "user@example.com",
			},
			[
				{
					fileName: "animation.gif",
					mimeType: "image/gif",
					content: Buffer.from("gif-content"),
				},
			],
		);

		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_ATTACHMENT_TYPE_INVALID");
	});

	it("400 — more than 5 images", async () => {
		const files: MultipartFileInput[] = Array.from({ length: 6 }, (_, i) => ({
			fileName: `image-${i}.png`,
			mimeType: "image/png",
			content: Buffer.from("png-content"),
		}));

		const { payload, contentType } = await buildMultipartPayload(
			{
				title: "Too many files",
				description: "Sending too many attachments.",
				reporter_email: "user@example.com",
			},
			files,
		);

		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_TOO_MANY_FILES");
	});

	it("400 — attachment exceeds 10MB", async () => {
		const { payload, contentType } = await buildMultipartPayload(
			{
				title: "Big file",
				description: "Sending a file too big.",
				reporter_email: "user@example.com",
			},
			[
				{
					fileName: "huge.png",
					mimeType: "image/png",
					content: Buffer.alloc(10 * 1024 * 1024 + 1),
				},
			],
		);

		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_ATTACHMENT_TOO_LARGE");
	});

	it("400 — attachment content does not match declared type", async () => {
		const { payload, contentType } = await buildMultipartPayload(
			{
				title: "Spoofed file",
				description: "Declaring image/png but sending plain text.",
				reporter_email: "user@example.com",
			},
			[
				{
					fileName: "fake.png",
					mimeType: "image/png",
					content: Buffer.from("not-really-a-png"),
				},
			],
		);

		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_ATTACHMENT_CONTENT_INVALID");
	});
});
