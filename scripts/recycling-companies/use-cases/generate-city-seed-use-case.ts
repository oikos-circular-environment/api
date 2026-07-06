import type { CityContext } from "../entities/city-context.js";
import type { SyntheticCompanyGenerator } from "../services/synthetic-company-generator.js";
import type { SeedFileWriter } from "../writers/seed-file-writer.js";
import type { FetchCityCompaniesUseCase } from "./fetch-city-companies-use-case.js";
import type { ResolveCityUseCase } from "./resolve-city-use-case.js";

/** Queries fixas, sem cap — mesma estratégia já usada em fetch-recycling-places.ts. */
export const RECYCLING_SEARCH_QUERIES = [
	"reciclagem",
	"cooperativa reciclagem",
	"ferro velho",
	"sucata",
];

export interface GenerateCitySeedOptions {
	target?: number;
	force?: boolean;
}

export interface GenerateCitySeedResult {
	ctx: CityContext;
	realCount: number;
	syntheticCount: number;
	written: boolean;
	path: string;
}

/**
 * Orquestrador de ponta a ponta para uma cidade: resolve contexto geográfico
 * → busca empresas reais → completa com sintéticas se `target` pedir mais →
 * grava o arquivo de seed.
 */
export class GenerateCitySeedUseCase {
	constructor(
		private readonly resolveCityUseCase: ResolveCityUseCase,
		private readonly fetchCompaniesUseCase: FetchCityCompaniesUseCase,
		private readonly syntheticGenerator: SyntheticCompanyGenerator,
		private readonly writer: SeedFileWriter,
	) {}

	async execute(
		city: string,
		stateCode: string,
		opts: GenerateCitySeedOptions = {},
	): Promise<GenerateCitySeedResult> {
		const ctx = await this.resolveCityUseCase.execute(city, stateCode);
		const real = await this.fetchCompaniesUseCase.execute(
			ctx,
			RECYCLING_SEARCH_QUERIES,
		);

		const missing = Math.max(0, (opts.target ?? 0) - real.length);
		const synthetic = Array.from({ length: missing }, () =>
			this.syntheticGenerator.generate(ctx),
		);

		const companies = [...real, ...synthetic];

		const { written, path } = this.writer.write(
			ctx,
			companies,
			{
				generated_at: new Date().toISOString(),
				city: ctx.city,
				state_code: ctx.stateCode,
				queries_used: RECYCLING_SEARCH_QUERIES,
			},
			{ force: opts.force },
		);

		return {
			ctx,
			realCount: real.length,
			syntheticCount: synthetic.length,
			written,
			path,
		};
	}
}
