import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { faker } from "@faker-js/faker";
import type { ComplaintAttachmentSeed } from "../entities/complaint-seed.js";

export const ASSETS_DIR = resolve("cli/assets");

/** A maioria das denúncias tem pelo menos 1 foto — poucas têm 0 ou 3. */
const ATTACHMENT_COUNT_DISTRIBUTION = [
	{ value: 0, weight: 10 },
	{ value: 1, weight: 60 },
	{ value: 2, weight: 25 },
	{ value: 3, weight: 5 },
];

function listAssetFiles(): string[] {
	return readdirSync(ASSETS_DIR)
		.filter((file) => file.endsWith(".jpg") || file.endsWith(".jpeg"))
		.sort();
}

/** Escolhe 0-3 imagens de exemplo de `cli/assets/`, sem repetir arquivo na mesma denúncia. */
export class ComplaintAttachmentPicker {
	private readonly assetFiles: string[];

	constructor(assetFiles: string[] = listAssetFiles()) {
		this.assetFiles = assetFiles;
	}

	pick(): ComplaintAttachmentSeed[] {
		const count = faker.helpers.weightedArrayElement(
			ATTACHMENT_COUNT_DISTRIBUTION,
		);
		const chosen = faker.helpers.arrayElements(this.assetFiles, count);

		return chosen.map((asset_file) => ({ asset_file, type: "PHOTO" as const }));
	}
}
