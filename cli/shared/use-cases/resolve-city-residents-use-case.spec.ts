import { describe, expect, it } from "vitest";
import type { CityContext } from "../entities/city-context.js";
import type {
	CityResidentsFile,
	CityResidentSeed,
	CityResidentsFileMeta,
} from "../entities/city-resident.js";
import { CityResidentGenerator } from "../services/city-resident-generator.js";
import type {
	CityResidentsFileWriter,
	ExistsResult,
	WriteResult,
} from "../writers/city-residents-file-writer.js";
import { ResolveCityResidentsUseCase } from "./resolve-city-residents-use-case.js";

function makeCtx(): CityContext {
	return {
		city: "Sinop",
		cityIbgeId: 5107909,
		state: "Mato Grosso",
		stateIbgeId: 51,
		stateCode: "MT",
		bounds: {
			low: { latitude: -11.95, longitude: -55.6 },
			high: { latitude: -11.75, longitude: -55.4 },
		},
		center: { latitude: -11.86, longitude: -55.5 },
	};
}

class InMemoryCityResidentsFileWriter implements CityResidentsFileWriter {
	private stored: CityResidentsFile | null = null;

	exists(): ExistsResult {
		return { exists: this.stored !== null, path: "/fake/city-residents.json" };
	}

	write(
		_ctx: CityContext,
		residents: CityResidentSeed[],
		meta: Omit<CityResidentsFileMeta, "total">,
		opts?: { force?: boolean },
	): WriteResult {
		if (this.stored && !opts?.force) {
			return { written: false, path: "/fake/city-residents.json" };
		}
		this.stored = { _meta: { ...meta, total: residents.length }, residents };
		return { written: true, path: "/fake/city-residents.json" };
	}

	read(): CityResidentSeed[] {
		if (!this.stored) throw new Error("nothing stored");
		return this.stored.residents;
	}
}

class CountingCityResidentGenerator extends CityResidentGenerator {
	calls = 0;

	override generate(ctx: CityContext, count: number): CityResidentSeed[] {
		this.calls++;
		return super.generate(ctx, count);
	}
}

describe("resolve-city-residents-use-case", () => {
	it("generates and writes a fresh pool when none exists yet", async () => {
		const writer = new InMemoryCityResidentsFileWriter();
		const useCase = new ResolveCityResidentsUseCase(writer);

		const residents = await useCase.execute(makeCtx(), { companiesTarget: 20 });

		expect(residents).toHaveLength(10); // ceil(20/2) = 10, abaixo do piso mínimo de 10 -> 10
		expect(writer.exists().exists).toBe(true);
	});

	it("loads the existing pool without regenerating on a second call", async () => {
		const writer = new InMemoryCityResidentsFileWriter();
		const generator = new CountingCityResidentGenerator();
		const useCase = new ResolveCityResidentsUseCase(writer, generator);
		const ctx = makeCtx();

		const first = await useCase.execute(ctx, { companiesTarget: 20 });
		const second = await useCase.execute(ctx, { companiesTarget: 100 });

		expect(generator.calls).toBe(1);
		expect(second).toStrictEqual(first);
	});

	it("regenerates when force is true", async () => {
		const writer = new InMemoryCityResidentsFileWriter();
		const generator = new CountingCityResidentGenerator();
		const useCase = new ResolveCityResidentsUseCase(writer, generator);
		const ctx = makeCtx();

		await useCase.execute(ctx, { companiesTarget: 20 });
		await useCase.execute(ctx, { companiesTarget: 20, force: true });

		expect(generator.calls).toBe(2);
	});
});
