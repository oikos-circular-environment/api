import { faker } from "@faker-js/faker";
import type { ComplaintStatusSeed } from "../entities/complaint-seed.js";

interface StatusDistributionEntry {
	status: ComplaintStatusSeed;
	weight: number;
}

/** Sem requisito explícito de proporção — default documentável e fácil de ajustar. */
const STATUS_DISTRIBUTION: StatusDistributionEntry[] = [
	{ status: "OPEN", weight: 55 },
	{ status: "RESOLVED", weight: 35 },
	{ status: "CANCELED", weight: 10 },
];

export class ComplaintStatusPicker {
	pick(): ComplaintStatusSeed {
		return faker.helpers.weightedArrayElement(
			STATUS_DISTRIBUTION.map((entry) => ({
				value: entry.status,
				weight: entry.weight,
			})),
		);
	}
}
