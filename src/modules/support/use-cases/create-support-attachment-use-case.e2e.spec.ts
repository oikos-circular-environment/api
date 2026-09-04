import "dotenv/config";
import { randomUUID } from "node:crypto";
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
	files: MultipartFileInput[] = [],
): Promise<{ payload: Buffer; contentType: string }> {
	const form = new FormData();

	for (const file of files) {
		form.append(
			file.field ?? "file",
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

describe("create-support-attachment", () => {
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

	async function createSupport(): Promise<string> {
		const res = await app.inject({
			method: "POST",
			url: "/v1/support",
			payload: {
				title: "App crashes on login",
				description: "It crashes every time I try to log in.",
				type: "ERROR",
				reporter_email: "reporter@example.com",
			},
		});
		expect(res.statusCode).toBe(200);
		const supportId = res.json<{ support: { id: string } }>().support.id;
		createdSupportIds.push(supportId);
		return supportId;
	}

	it("200 — uploads a valid jpeg attachment", async () => {
		const supportId = await createSupport();

		const { payload, contentType } = await buildMultipartPayload([
			{ fileName: "1.jpg", mimeType: "image/jpeg", content: JPEG_MAGIC_BYTES },
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/support/${supportId}/attachments`,
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json<{
			support: { attachments: { file_name: string }[] };
		}>();
		expect(body.support.attachments).toHaveLength(1);
		expect(body.support.attachments[0]?.file_name).toBe("1.jpg");
	});

	it("400 — rejects more than one file in the same request", async () => {
		const supportId = await createSupport();

		const { payload, contentType } = await buildMultipartPayload([
			{ fileName: "1.jpg", mimeType: "image/jpeg", content: JPEG_MAGIC_BYTES },
			{ fileName: "2.png", mimeType: "image/png", content: PNG_MAGIC_BYTES },
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/support/${supportId}/attachments`,
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_TOO_MANY_FILES");
	});

	it("400 — rejects an invalid file type", async () => {
		const supportId = await createSupport();

		const { payload, contentType } = await buildMultipartPayload([
			{
				fileName: "animation.gif",
				mimeType: "image/gif",
				content: Buffer.from("gif-content"),
			},
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/support/${supportId}/attachments`,
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_ATTACHMENT_TYPE_INVALID");
	});

	it("400 — rejects a file exceeding the size limit", async () => {
		const supportId = await createSupport();

		const { payload, contentType } = await buildMultipartPayload([
			{
				fileName: "huge.png",
				mimeType: "image/png",
				content: Buffer.alloc(10 * 1024 * 1024 + 1),
			},
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/support/${supportId}/attachments`,
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_ATTACHMENT_TOO_LARGE");
	});

	it("404 — rejects an attachment for a non-existent support id", async () => {
		const { payload, contentType } = await buildMultipartPayload([
			{ fileName: "1.jpg", mimeType: "image/jpeg", content: JPEG_MAGIC_BYTES },
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/support/${randomUUID()}/attachments`,
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(404);
		expect(res.json().code).toBe("SUPPORT_NOT_FOUND");
	});

	it("422 — rejects an attachment for a support that is not OPEN", async () => {
		const supportId = await createSupport();
		await prisma.support.update({
			where: { id: supportId },
			data: { status: "RESOLVED" },
		});

		const { payload, contentType } = await buildMultipartPayload([
			{ fileName: "1.jpg", mimeType: "image/jpeg", content: JPEG_MAGIC_BYTES },
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/support/${supportId}/attachments`,
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(422);
		expect(res.json().code).toBe("SUPPORT_ALREADY_MODERATED");
	});

	it("400 — rejects the sixth attachment on the same support", async () => {
		const supportId = await createSupport();

		for (let i = 0; i < 5; i++) {
			const { payload, contentType } = await buildMultipartPayload([
				{
					fileName: `${i}.jpg`,
					mimeType: "image/jpeg",
					content: JPEG_MAGIC_BYTES,
				},
			]);

			const res = await app.inject({
				method: "POST",
				url: `/v1/support/${supportId}/attachments`,
				headers: { "content-type": contentType },
				payload,
			});
			expect(res.statusCode).toBe(200);
		}

		const { payload, contentType } = await buildMultipartPayload([
			{
				fileName: "one-too-many.jpg",
				mimeType: "image/jpeg",
				content: JPEG_MAGIC_BYTES,
			},
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/support/${supportId}/attachments`,
			headers: { "content-type": contentType },
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("SUPPORT_TOO_MANY_ATTACHMENTS");
	});
});
