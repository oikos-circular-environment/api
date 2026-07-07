import { faker } from "@faker-js/faker";
import type { CityContext } from "../../shared/entities/city-context.js";
import type { ComplaintSeed } from "../entities/complaint-seed.js";
import type { ComplaintAttachmentPicker } from "./complaint-attachment-picker.js";
import type { ComplaintCategoryPicker } from "./complaint-category-picker.js";
import type { ComplaintStatusPicker } from "./complaint-status-picker.js";
import type { ResolutionGenerator } from "./resolution-generator.js";
import type { SyntheticGeospatialGenerator } from "./synthetic-geospatial-generator.js";
import type { VoteGenerator } from "./vote-generator.js";

/** Compõe todos os services de complaints/ num `ComplaintSeed` completo —
 * mesmo papel que `CompanySeedMapper` tem para empresas. */
export class ComplaintGenerator {
	constructor(
		private readonly categoryPicker: ComplaintCategoryPicker,
		private readonly attachmentPicker: ComplaintAttachmentPicker,
		private readonly geospatialGenerator: SyntheticGeospatialGenerator,
		private readonly statusPicker: ComplaintStatusPicker,
		private readonly voteGenerator: VoteGenerator,
		private readonly resolutionGenerator: ResolutionGenerator,
	) {}

	generate(
		ctx: CityContext,
		residentPoolSize: number,
		residentsWithCompany: Set<number>,
	): ComplaintSeed {
		const author_resident_index = faker.number.int({
			min: 0,
			max: residentPoolSize - 1,
		});
		const status = this.statusPicker.pick();

		return {
			author_resident_index,
			date: faker.date.past({ years: 1 }).toISOString(),
			observations: faker.datatype.boolean({ probability: 0.7 })
				? faker.lorem.sentence()
				: null,
			geospatial: this.geospatialGenerator.generate(ctx),
			waste_category_names: this.categoryPicker.pick(),
			attachments: this.attachmentPicker.pick(),
			status,
			votes: this.voteGenerator.generate(
				status,
				residentPoolSize,
				author_resident_index,
			),
			resolutions: this.resolutionGenerator.generate(
				status,
				residentsWithCompany,
				residentPoolSize,
			),
		};
	}
}
