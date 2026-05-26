import { beforeEach, describe, expect, it } from "vitest";
import type { MarketCompany } from "../dtos/market-dto.js";
import { InMemoryMarketRepository } from "../repositories/in-memory/in-memory-market-repository.js";
import { ListMarketUseCase } from "./list-market-use-case.js";

// Ponto de referência — centro de Rondonópolis
const ORIGIN = { lat: -16.4707, lon: -54.6375 };

// Empresa 1 — Bio Ecologica (~3.3km do centro)
// Tem wastes, sem services
const makeCompany = (
	overrides: Partial<MarketCompany> = {},
): MarketCompany => ({
	id: "company-1",
	business_name: "Bio Ecologica",
	corporate_name: "Bio Ecologica LTDA",
	company_type: "COMPANY",
	accept_appointments: false,
	status: true,
	address: {
		id: "addr-1",
		zip_code: "78745-710",
		street: "R. L",
		number: "554",
		complement: null,
		district: "Distrito Industrial",
		city: "Rondonópolis",
		state: "Mato Grosso",
		state_code: "MT",
		latitude: -16.4757009,
		longitude: -54.6684927,
	},
	phones: ["(66) 99999-0001"],
	services: [],
	wastes: [
		{
			id: "waste-1",
			name: "Papel e Papelão",
			description: "Jornais, revistas, caixas",
			price: 0.5,
			unit: "KG",
			waste_type: "RECYCLABLE",
			quantity: 0,
			observations: null,
			sub_items: ["jornal", "papelão"],
		},
		{
			id: "waste-2",
			name: "Plástico",
			description: "PET, PEAD, PVC",
			price: 0.8,
			unit: "KG",
			waste_type: "RECYCLABLE",
			quantity: 0,
			observations: null,
			sub_items: ["PET", "PEAD"],
		},
	],
	business_hours: [
		{
			id: "bh-1",
			day_of_week: "MONDAY",
			is_open: true,
			time_slots: [{ id: "ts-1", start_time: "07:00", end_time: "17:00" }],
		},
	],
	distance_in_meters: 0, // será sobrescrito pelo repositório
	...overrides,
});

describe("ListMarketUseCase", () => {
	let repo: InMemoryMarketRepository;
	let sut: ListMarketUseCase;

	beforeEach(() => {
		repo = new InMemoryMarketRepository();
		sut = new ListMarketUseCase(repo);
	});

	it("deve listar empresas dentro do raio", async () => {
		repo.companies = [makeCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].id).toBe("company-1");
	});

	it("não deve listar empresas fora do raio", async () => {
		repo.companies = [makeCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 1000 });
		expect(result.companies).toHaveLength(0);
	});

	it("deve ordenar por distância crescente", async () => {
		// Empresa A mais perto (~500m do centro)
		const companyA = makeCompany({
			id: "company-a",
			business_name: "Empresa A",
			address: {
				id: "addr-a",
				zip_code: "78700-000",
				street: "R. A",
				number: "1",
				complement: null,
				district: "Centro",
				city: "Rondonópolis",
				state: "Mato Grosso",
				state_code: "MT",
				// ~500m do centro
				latitude: -16.4707 + 0.0045,
				longitude: -54.6375,
			},
		});

		// Empresa B mais longe (~3.3km do centro)
		const companyB = makeCompany({
			id: "company-b",
			business_name: "Empresa B",
			address: {
				id: "addr-b",
				zip_code: "78745-710",
				street: "R. L",
				number: "554",
				complement: null,
				district: "Distrito Industrial",
				city: "Rondonópolis",
				state: "Mato Grosso",
				state_code: "MT",
				latitude: -16.4757009,
				longitude: -54.6684927,
			},
		});

		repo.companies = [companyB, companyA];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(2);
		expect(result.companies[0].id).toBe("company-a");
	});

	it("deve filtrar por texto em business_name", async () => {
		repo.companies = [makeCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000, q: "Bio" });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].business_name).toBe("Bio Ecologica");
	});

	it("não deve retornar empresa que não bate com texto em business_name", async () => {
		repo.companies = [makeCompany()];
		const result = await sut.execute({
			...ORIGIN,
			radius: 5000,
			q: "Inexistente",
		});
		expect(result.companies).toHaveLength(0);
	});

	it("deve filtrar por texto em nome de resíduo (wastes)", async () => {
		repo.companies = [makeCompany()];
		const result = await sut.execute({
			...ORIGIN,
			radius: 5000,
			q: "Plástico",
		});
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].wastes.some((w) => w.name === "Plástico")).toBe(
			true,
		);
	});

	it("deve filtrar por texto em nome de serviço (services)", async () => {
		const companyWithService = makeCompany({
			id: "company-service",
			business_name: "Empresa de Serviços",
			services: [
				{
					id: "service-1",
					name: "Coleta domiciliar",
					description: "Coleta de resíduos na porta",
					price: 50,
					unit: "KG",
					waste_type: "RECYCLABLE",
					quantity: 0,
					observations: null,
					sub_items: [],
				},
			],
			wastes: [],
		});
		repo.companies = [companyWithService];
		const result = await sut.execute({ ...ORIGIN, radius: 5000, q: "Coleta" });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].id).toBe("company-service");
	});

	it("deve filtrar por categoria waste — retorna apenas com wastes", async () => {
		const companyWithWastes = makeCompany({ id: "company-waste" });
		const companyWithoutWastes = makeCompany({
			id: "company-no-waste",
			business_name: "Empresa Sem Resíduos",
			wastes: [],
		});
		repo.companies = [companyWithWastes, companyWithoutWastes];
		const result = await sut.execute({
			...ORIGIN,
			radius: 5000,
			category: "waste",
		});
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].id).toBe("company-waste");
	});

	it("deve filtrar por categoria services — retorna apenas com services", async () => {
		const companyWithServices = makeCompany({
			id: "company-services",
			business_name: "Empresa de Serviços",
			services: [
				{
					id: "service-1",
					name: "Coleta domiciliar",
					description: null,
					price: 50,
					unit: "KG",
					waste_type: "RECYCLABLE",
					quantity: 0,
					observations: null,
					sub_items: [],
				},
			],
			wastes: [],
		});
		const companyWithoutServices = makeCompany({
			id: "company-no-services",
			business_name: "Empresa Sem Serviços",
		});
		repo.companies = [companyWithServices, companyWithoutServices];
		const result = await sut.execute({
			...ORIGIN,
			radius: 5000,
			category: "services",
		});
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].id).toBe("company-services");
	});

	it("deve retornar distance_in_meters correto para Bio Ecologica", async () => {
		repo.companies = [makeCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		const distance = result.companies[0].distance_in_meters;
		expect(distance).toBeGreaterThan(3000);
		expect(distance).toBeLessThan(3700);
	});

	it("deve retornar business_hours preenchido", async () => {
		repo.companies = [makeCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		const businessHours = result.companies[0].business_hours;
		expect(businessHours.length).toBeGreaterThanOrEqual(1);
		expect(businessHours[0].time_slots.length).toBeGreaterThanOrEqual(1);
	});

	it("deve retornar next_cursor na primeira página quando há mais resultados", async () => {
		repo.companies = Array.from({ length: 5 }, (_, i) =>
			makeCompany({
				id: `company-${i + 1}`,
				business_name: `Empresa ${i + 1}`,
			}),
		);
		const result = await sut.execute({ ...ORIGIN, radius: 5000, limit: 2 });
		expect(result.next_cursor).not.toBeNull();
	});

	it("deve retornar next_cursor null na última página", async () => {
		repo.companies = Array.from({ length: 3 }, (_, i) =>
			makeCompany({
				id: `company-${i + 1}`,
				business_name: `Empresa ${i + 1}`,
			}),
		);
		const result = await sut.execute({ ...ORIGIN, radius: 5000, limit: 10 });
		expect(result.next_cursor).toBeNull();
	});

	it("deve navegar corretamente entre páginas com cursor", async () => {
		repo.companies = Array.from({ length: 4 }, (_, i) =>
			makeCompany({
				id: `company-${i + 1}`,
				business_name: `Empresa ${i + 1}`,
			}),
		);

		const page1 = await sut.execute({ ...ORIGIN, radius: 5000, limit: 2 });
		expect(page1.companies).toHaveLength(2);
		expect(page1.next_cursor).not.toBeNull();

		const page2 = await sut.execute({
			...ORIGIN,
			radius: 5000,
			limit: 2,
			cursor: page1.next_cursor!,
		});
		expect(page2.companies).toHaveLength(2);

		const page1Ids = page1.companies.map((c) => c.id);
		const page2Ids = page2.companies.map((c) => c.id);
		const allIds = [...page1Ids, ...page2Ids];
		expect(new Set(allIds).size).toBe(4);

		const hasIntersection = page1Ids.some((id) => page2Ids.includes(id));
		expect(hasIntersection).toBe(false);
	});

	it("deve excluir silenciosamente empresa sem endereço (lat/lon null)", async () => {
		const companyWithoutLatLon = makeCompany({
			id: "company-no-coords",
			address: {
				id: "addr-null",
				zip_code: "78700-000",
				street: "R. Sem Coords",
				number: "1",
				complement: null,
				district: "Centro",
				city: "Rondonópolis",
				state: "Mato Grosso",
				state_code: "MT",
				latitude: null,
				longitude: null,
			},
		});
		repo.companies = [companyWithoutLatLon];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(0);
		expect(result.next_cursor).toBeNull();
	});

	it("deve retornar lista vazia quando nenhuma empresa no raio", async () => {
		repo.companies = [makeCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 100 });
		expect(result.companies).toStrictEqual([]);
		expect(result.next_cursor).toBeNull();
	});

	it("deve combinar filtros de texto e categoria", async () => {
		const companyWithPlastico = makeCompany({
			id: "company-plastico",
			business_name: "Reciclagem Total",
		});

		const companyWithoutPlastico = makeCompany({
			id: "company-papel",
			business_name: "Papel Certo",
			wastes: [
				{
					id: "waste-only-papel",
					name: "Papel e Papelão",
					description: "Jornais, revistas, caixas",
					price: 0.5,
					unit: "KG",
					waste_type: "RECYCLABLE",
					quantity: 0,
					observations: null,
					sub_items: ["jornal"],
				},
			],
		});

		repo.companies = [companyWithPlastico, companyWithoutPlastico];
		const result = await sut.execute({
			...ORIGIN,
			radius: 5000,
			q: "Plástico",
			category: "waste",
		});
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].id).toBe("company-plastico");
	});

	it("deve retornar phones da empresa", async () => {
		repo.companies = [
			makeCompany({ phones: ["(66) 99999-0001", "(66) 3411-0002"] }),
		];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].phones).toEqual([
			"(66) 99999-0001",
			"(66) 3411-0002",
		]);
	});

	it("deve retornar phones vazio quando empresa não tem telefone", async () => {
		repo.companies = [makeCompany({ phones: [] })];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].phones).toEqual([]);
	});

	it("deve aplicar radius padrão de 1000m quando não informado", async () => {
		// Bio Ecologica está a ~3.3km do centro — fora do raio padrão de 1000m
		repo.companies = [makeCompany()];
		const result = await sut.execute({ ...ORIGIN });
		expect(result.companies).toHaveLength(0);
	});
});
