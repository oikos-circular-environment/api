import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { Support } from "@/modules/moderation/dtos/moderation-dto.js";

export function makeSupport(overrides?: Partial<Support>): Support {
	return {
		id: randomUUID(),
		title: faker.lorem.sentence(),
		description: faker.lorem.paragraph(),
		type: "SUPPORT",
		environment: null,
		reporter_email: faker.internet.email(),
		status: "OPEN",
		severity: null,
		attachments: [],
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}
