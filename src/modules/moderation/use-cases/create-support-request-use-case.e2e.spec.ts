import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

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

describe("create-support-request", () => {
	const createdSupportRequestIds: string[] = [];

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdSupportRequestIds.length > 0) {
			await prisma.supportRequest.deleteMany({
				where: { id: { in: createdSupportRequestIds } },
			});
			createdSupportRequestIds.length = 0;
		}
	});

	it("200 — creates support request with 2 images", async () => {
		const { payload, contentType } = await buildMultipartPayload(
			{
				title: "App crashes on login",
				description: "It crashes every time I try to log in.",
			},
			[
				{
					fileName: "1.png",
					mimeType: "image/png",
					content: Buffer.from("png-content-1"),
				},
				{
					fileName: "2.jpg",
					mimeType: "image/jpeg",
					content: Buffer.from("jpeg-content-2"),
				},
			],
		);

		const res = await app.inject({
			method: "POST",
			url: "/v1/moderation/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.supportRequest.title).toBe("App crashes on login");
		expect(body.supportRequest.status).toBe("PENDING");
		expect(body.supportRequest.attachments).toHaveLength(2);
		createdSupportRequestIds.push(body.supportRequest.id);
	});

	it("400 — missing title and description", async () => {
		const { payload, contentType } = await buildMultipartPayload({});

		const res = await app.inject({
			method: "POST",
			url: "/v1/moderation/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_REQUEST_INVALID_BODY");
	});

	it("400 — invalid attachment mime type", async () => {
		const { payload, contentType } = await buildMultipartPayload(
			{ title: "Invalid file", description: "Sending a gif." },
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
			url: "/v1/moderation/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_REQUEST_ATTACHMENT_TYPE_INVALID");
	});

	it("400 — more than 5 images", async () => {
		const files: MultipartFileInput[] = Array.from({ length: 6 }, (_, i) => ({
			fileName: `image-${i}.png`,
			mimeType: "image/png",
			content: Buffer.from("png-content"),
		}));

		const { payload, contentType } = await buildMultipartPayload(
			{ title: "Too many files", description: "Sending too many attachments." },
			files,
		);

		const res = await app.inject({
			method: "POST",
			url: "/v1/moderation/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_REQUEST_TOO_MANY_FILES");
	});

	it("400 — attachment exceeds 10MB", async () => {
		const { payload, contentType } = await buildMultipartPayload(
			{ title: "Big file", description: "Sending a file too big." },
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
			url: "/v1/moderation/support",
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_REQUEST_ATTACHMENT_TOO_LARGE");
	});
});
