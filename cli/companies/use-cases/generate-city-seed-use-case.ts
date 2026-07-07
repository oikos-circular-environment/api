import type { CityContext } from "../../shared/entities/city-context.js";
import type { CityResidentSeed } from "../../shared/entities/city-resident.js";
import type { CompanySeed, UnownedCompanySeed } from "../entities/company-seed.js";
import type { CompanyOwnerAssigner } from "../services/company-owner-assigner.js";
import type { CompanySeedRepairer } from "../services/company-seed-repairer.js";
import type { SyntheticCompanyGenerator } from "../services/synthetic-company-generator.js";
import type {
	ExistsResult,
	SeedFileWriter,
	WriteResult,
} from "../writers/seed-file-writer.js";
import type { FetchCityCompaniesUseCase } from "./fetch-city-companies-use-case.js";
import type { ResolveCityUseCase } from "../../shared/use-cases/resolve-city-use-case.js";

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
	repairReport: string[];
}

export interface ValidateAndRepairResult {
	companies: UnownedCompanySeed[];
	report: string[];
}

/**
 * Orquestrador de ponta a ponta para uma cidade: resolve contexto geográfico
 * → busca empresas reais → completa com sintéticas se `target` pedir mais →
 * valida/repara (segunda onda, rede de segurança) → grava o arquivo de seed.
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
		private readonly repairer: CompanySeedRepairer,
		private readonly ownerAssigner: CompanyOwnerAssigner,
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

	fetchRealCompanies(ctx: CityContext): Promise<UnownedCompanySeed[]> {
		return this.fetchCompaniesUseCase.execute(ctx, RECYCLING_SEARCH_QUERIES);
	}

	generateSynthetic(
		ctx: CityContext,
		realCount: number,
		target?: number,
	): UnownedCompanySeed[] {
		const missing = Math.max(0, (target ?? 0) - realCount);
		return Array.from({ length: missing }, () =>
			this.syntheticGenerator.generate(ctx),
		);
	}

	/**
	 * Segunda onda: repara lacunas (telefone/horário ausentes) em cada
	 * empresa e descarta as que continuarem inválidas mesmo após a
	 * correção, em vez de deixar dado inválido chegar no arquivo de seed.
	 */
	validateAndRepair(companies: UnownedCompanySeed[]): ValidateAndRepairResult {
		const kept: UnownedCompanySeed[] = [];
		const report: string[] = [];

		for (const company of companies) {
			const result = this.repairer.repair(company);

			if (result.stillInvalid) {
				report.push(
					`${company.corporate_name}: descartada (dado inválido mesmo após correção)`,
				);
				continue;
			}

			if (result.fixes.length > 0) {
				report.push(`${company.corporate_name}: ${result.fixes.join(", ")}`);
			}

			kept.push(result.seed);
		}

		return { companies: kept, report };
	}

	/**
	 * Última fase — a lista de empresas só está "fechada" (reais + sintéticas
	 * + reparadas) aqui, então a atribuição de dono acontece depois de
	 * `validateAndRepair`, nunca antes.
	 */
	assignOwners(
		companies: UnownedCompanySeed[],
		residents: CityResidentSeed[],
	): CompanySeed[] {
		return this.ownerAssigner.assign(companies, residents);
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
		residents: CityResidentSeed[],
		opts: GenerateCitySeedOptions = {},
	): Promise<GenerateCitySeedResult> {
		const ctx = await this.resolveCity(city, stateCode);
		const real = await this.fetchRealCompanies(ctx);
		const synthetic = this.generateSynthetic(ctx, real.length, opts.target);
		const { companies, report } = this.validateAndRepair([
			...real,
			...synthetic,
		]);
		const owned = this.assignOwners(companies, residents);

		const { written, path } = this.writeSeed(ctx, owned, {
			force: opts.force,
		});

		return {
			ctx,
			realCount: real.length,
			syntheticCount: synthetic.length,
			written,
			path,
			repairReport: report,
		};
	}
}
