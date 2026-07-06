import type { CityContext } from "../entities/city-context.js";
import type { CompanySeed } from "../entities/company-seed.js";
import type { SyntheticCompanyGenerator } from "../services/synthetic-company-generator.js";
import type {
	ExistsResult,
	SeedFileWriter,
	WriteResult,
} from "../writers/seed-file-writer.js";
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
 *
 * Cada fase é exposta como método público separado (além de `execute`, que
 * as encadeia como conveniência) para permitir progresso granular por etapa
 * — ex.: uma task list do Listr2 no CLI interativo.
 */
export class GenerateCitySeedUseCase {
	constructor(
		private readonly resolveCityUseCase: ResolveCityUseCase,
		private readonly fetchCompaniesUseCase: FetchCityCompaniesUseCase,
		private readonly syntheticGenerator: SyntheticCompanyGenerator,
		private readonly writer: SeedFileWriter,
	) {}

	resolveCity(city: string, stateCode: string): Promise<CityContext> {
		return this.resolveCityUseCase.execute(city, stateCode);
	}

	/**
	 * Checagem pura, sem side-effect — chamar antes de `fetchRealCompanies`
	 * evita gastar a busca cara no Google Places quando o seed já existe.
	 */
	checkExisting(ctx: CityContext): ExistsResult {
		return this.writer.exists(ctx);
	}

	fetchRealCompanies(ctx: CityContext): Promise<CompanySeed[]> {
		return this.fetchCompaniesUseCase.execute(ctx, RECYCLING_SEARCH_QUERIES);
	}

	generateSynthetic(
		ctx: CityContext,
		realCount: number,
		target?: number,
	): CompanySeed[] {
		const missing = Math.max(0, (target ?? 0) - realCount);
		return Array.from({ length: missing }, () =>
			this.syntheticGenerator.generate(ctx),
		);
	}

	writeSeed(
		ctx: CityContext,
		companies: CompanySeed[],
		opts: { force?: boolean } = {},
	): WriteResult {
		return this.writer.write(
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
	}

	async execute(
		city: string,
		stateCode: string,
		opts: GenerateCitySeedOptions = {},
	): Promise<GenerateCitySeedResult> {
		const ctx = await this.resolveCity(city, stateCode);
		const real = await this.fetchRealCompanies(ctx);
		const synthetic = this.generateSynthetic(ctx, real.length, opts.target);
		const companies = [...real, ...synthetic];

		const { written, path } = this.writeSeed(ctx, companies, {
			force: opts.force,
		});

		return {
			ctx,
			realCount: real.length,
			syntheticCount: synthetic.length,
			written,
			path,
		};
	}
}
