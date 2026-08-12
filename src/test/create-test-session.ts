import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export async function createTestSession(userId: string): Promise<string> {
	const token = randomUUID();
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

	await prisma.session.create({
		data: {
			id: randomUUID(),
			token,
			expires_at: expiresAt,
			user_id: userId,
		},
	});

	return token;
}
