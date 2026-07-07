import { faker } from "@faker-js/faker";
import type { CityContext } from "../../shared/entities/city-context.js";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import type { ComplaintSeed } from "../entities/complaint-seed.js";
import type { ComplaintAttachmentPicker } from "./complaint-attachment-picker.js";
import type { ComplaintCategoryPicker } from "./complaint-category-picker.js";
import type { ComplaintStatusPicker } from "./complaint-status-picker.js";
import type { ResolutionGenerator } from "./resolution-generator.js";
import type { SyntheticGeospatialGenerator } from "./synthetic-geospatial-generator.js";
import type { VoteGenerator } from "./vote-generator.js";

export interface GeneratedComplaint {
	/** Índice do usuário autor em `users` — quem aninha a denúncia em
	 * `UserSeed.complaints` é `GenerateCityComplaintsUseCase`. */
	authorIndex: number;
	complaint: ComplaintSeed;
}

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
		users: UserSeed[],
		usersWithCompany: Set<number>,
	): GeneratedComplaint {
		const authorIndex = faker.number.int({
			min: 0,
			max: users.length - 1,
		});
		const status = this.statusPicker.pick();

		const complaint: ComplaintSeed = {
			date: faker.date.past({ years: 1 }).toISOString(),
			observations: faker.datatype.boolean({ probability: 0.7 })
				? faker.lorem.sentence()
				: null,
			geospatial: this.geospatialGenerator.generate(ctx),
			waste_category_names: this.categoryPicker.pick(),
			attachments: this.attachmentPicker.pick(),
			status,
			votes: this.voteGenerator.generate(status, users, authorIndex),
			resolutions: this.resolutionGenerator.generate(
				status,
				usersWithCompany,
				users,
			),
		};

		return { authorIndex, complaint };
	}
}
