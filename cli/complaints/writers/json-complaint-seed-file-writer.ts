import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CityContext } from "../../shared/entities/city-context.js";
import { citySlug } from "../../shared/services/city-slug.js";
import type {
	ComplaintSeed,
	ComplaintSeedFileMeta,
} from "../entities/complaint-seed.js";
import type {
	ComplaintSeedFileWriter,
	ExistsResult,
	WriteResult,
} from "./complaint-seed-file-writer.js";

export const DEFAULT_COMPLAINTS_DIR = resolve("prisma/seeds/complaints");

export class JsonComplaintSeedFileWriter implements ComplaintSeedFileWriter {
	constructor(private readonly outputDir: string = DEFAULT_COMPLAINTS_DIR) {}

	exists(ctx: CityContext): ExistsResult {
		const path = resolve(this.outputDir, `${citySlug(ctx)}.json`);
		return { exists: existsSync(path), path };
	}

	write(
		ctx: CityContext,
		complaints: ComplaintSeed[],
		meta: Omit<ComplaintSeedFileMeta, "total">,
		opts?: { force?: boolean },
	): WriteResult {
		const { exists, path } = this.exists(ctx);

		if (exists && !opts?.force) {
			return { written: false, path };
		}

		mkdirSync(dirname(path), { recursive: true });

		const output = {
			_meta: { ...meta, total: complaints.length },
			complaints,
		};

		writeFileSync(path, JSON.stringify(output, null, 2), "utf-8");

		return { written: true, path };
	}
}
