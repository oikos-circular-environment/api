import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { SupportRequest } from "@/modules/moderation/dtos/moderation-dto.js";

export function makeSupportRequest(
	overrides?: Partial<SupportRequest>,
): SupportRequest {
	return {
		id: randomUUID(),
		title: faker.lorem.sentence(),
		description: faker.lorem.paragraph(),
		status: "PENDING",
		attachments: [],
		created_at: new Date(),
		...overrides,
	};
}
