import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CityContext } from "../entities/city-context.js";
import { citySlug } from "../services/city-slug.js";
import type {
	CityData,
	CityDataFile,
	CityDataWriter,
	WriteResult,
} from "./city-data-writer.js";

export const DEFAULT_CITY_DATA_DIR = resolve("prisma/seeds/data-generated");

export class JsonCityDataWriter implements CityDataWriter {
	constructor(private readonly outputDir: string = DEFAULT_CITY_DATA_DIR) {}

	write(
		ctx: CityContext,
		data: CityData,
		meta: { generated_at: string },
	): WriteResult {
		const path = resolve(this.outputDir, `${citySlug(ctx)}.json`);
		mkdirSync(dirname(path), { recursive: true });

		const output: CityDataFile = {
			_meta: {
				generated_at: meta.generated_at,
				city: ctx.city,
				state_code: ctx.stateCode,
				users_total: data.users.length,
				companies_total: data.users.reduce(
					(sum, user) => sum + user.companies.length,
					0,
				),
				complaints_total: data.users.reduce(
					(sum, user) => sum + user.complaints.length,
					0,
				),
			},
			users: data.users,
		};

		writeFileSync(path, JSON.stringify(output, null, 2), "utf-8");

		return { written: true, path };
	}
}
