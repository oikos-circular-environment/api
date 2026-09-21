import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { faker } from "@faker-js/faker";
import type { ComplaintAttachmentSeed } from "../entities/complaint-seed.js";

export const ASSETS_DIR = resolve("cli/assets");

/**
 * Toda denúncia precisa nascer com pelo menos 1 foto — nenhuma denúncia real
 * existe sem imagem anexada, então 0 nunca é uma opção aqui.
 */
const ATTACHMENT_COUNT_DISTRIBUTION = [
	{ value: 1, weight: 65 },
	{ value: 2, weight: 25 },
	{ value: 3, weight: 10 },
];

function listAssetFiles(): string[] {
	return readdirSync(ASSETS_DIR)
		.filter((file) => file.endsWith(".jpg") || file.endsWith(".jpeg"))
		.sort();
}

/** Escolhe 1-3 imagens de exemplo de `cli/assets/`, sem repetir arquivo na mesma denúncia. */
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
