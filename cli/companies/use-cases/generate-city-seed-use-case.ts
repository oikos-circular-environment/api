import type { CityContext } from "../../shared/entities/city-context.js";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import type { ResolveCityUseCase } from "../../shared/use-cases/resolve-city-use-case.js";
import type { CompanySeed } from "../entities/company-seed.js";
import type { CompanyOwnerAssigner } from "../services/company-owner-assigner.js";
import type { CompanySeedRepairer } from "../services/company-seed-repairer.js";
import type { SyntheticCompanyGenerator } from "../services/synthetic-company-generator.js";
import type { FetchCityCompaniesUseCase } from "./fetch-city-companies-use-case.js";

/** Queries fixas, sem cap — mesma estratégia já usada em fetch-recycling-places.ts. */
export const RECYCLING_SEARCH_QUERIES = [
	"reciclagem",
	"cooperativa reciclagem",
	"ferro velho",
	"sucata",
];

export interface GenerateCitySeedOptions {
	target?: number;
}

export interface GenerateCitySeedResult {
	ctx: CityContext;
	realCount: number;
	syntheticCount: number;
	ownedCompaniesByUser: Map<number, CompanySeed[]>;
	repairReport: string[];
}

export interface ValidateAndRepairResult {
	companies: CompanySeed[];
	report: string[];
}

/**
 * Orquestrador de empresas para uma cidade: resolve contexto geográfico →
 * busca empresas reais (cortadas em `target`) → completa com sintéticas se
 * `target` pedir mais → valida/repara (segunda onda, rede de segurança) →
 * atribui donos. A escrita do arquivo combinado da cidade acontece fora
 * desta classe (ver `cli/cli.ts`), depois que empresas E denúncias estiverem
 * prontas.
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
	) {}

	resolveCity(city: string, stateCode: string): Promise<CityContext> {
		return this.resolveCityUseCase.execute(city, stateCode);
	}

	/**
	 * Busca todas as empresas reais disponíveis e corta para `target` quando o
	 * Google Places retorna mais do que o pedido — sem isso, um excedente de
	 * reais (ex.: 44 encontradas para um alvo de 20) estoura a capacidade do
	 * pool de usuários, que é dimensionado a partir do target pedido, não do
	 * total real encontrado.
	 */
	async fetchRealCompanies(
		ctx: CityContext,
		target?: number,
	): Promise<CompanySeed[]> {
		const companies = await this.fetchCompaniesUseCase.execute(
			ctx,
			RECYCLING_SEARCH_QUERIES,
		);

		if (target !== undefined && companies.length > target) {
			return companies.slice(0, target);
		}

		return companies;
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

	/**
	 * Segunda onda: repara lacunas (telefone/horário ausentes) em cada
	 * empresa e descarta as que continuarem inválidas mesmo após a
	 * correção, em vez de deixar dado inválido chegar no arquivo de seed.
	 */
	validateAndRepair(companies: CompanySeed[]): ValidateAndRepairResult {
		const kept: CompanySeed[] = [];
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
	 * `validateAndRepair`, nunca antes. Retorna um mapa índice-do-usuário →
	 * empresas dele; quem aninha isso em `UserSeed.companies` é `cli/cli.ts`.
	 */
	assignOwners(
		companies: CompanySeed[],
		users: UserSeed[],
	): Map<number, CompanySeed[]> {
		return this.ownerAssigner.assign(companies, users);
	}

	async execute(
		city: string,
		stateCode: string,
		users: UserSeed[],
		opts: GenerateCitySeedOptions = {},
	): Promise<GenerateCitySeedResult> {
		const ctx = await this.resolveCity(city, stateCode);
		const real = await this.fetchRealCompanies(ctx, opts.target);
		const synthetic = this.generateSynthetic(ctx, real.length, opts.target);
		const { companies, report } = this.validateAndRepair([
			...real,
			...synthetic,
		]);
		const ownedCompaniesByUser = this.assignOwners(companies, users);

		return {
			ctx,
			realCount: real.length,
			syntheticCount: synthetic.length,
			ownedCompaniesByUser,
			repairReport: report,
		};
	}
}
