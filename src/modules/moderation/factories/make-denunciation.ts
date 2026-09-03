import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { Denunciation } from "@/modules/moderation/dtos/denunciations-dto.js";

export function makeDenunciation(
	overrides?: Partial<Denunciation>,
): Denunciation {
	return {
		id: randomUUID(),
		title: faker.lorem.sentence(),
		description: faker.lorem.paragraph(),
		status: "OPEN",
		severity: null,
		reporter_email: faker.internet.email(),
		reporter_user_id: null,
		reported_user_id: null,
		latitude: null,
		longitude: null,
		attachments: [],
		moderated_by: null,
		moderated_at: null,
		reason: null,
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}
