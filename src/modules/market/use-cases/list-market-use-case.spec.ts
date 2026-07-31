import { assert, beforeEach, describe, expect, it } from "vitest";
import { makeMarketCompany } from "@/modules/market/factories/make-market-company.js";
import { makeMarketItem } from "@/modules/market/factories/make-market-item.js";
import { InMemoryMarketRepository } from "../repositories/in-memory/in-memory-market-repository.js";
import { ListMarketUseCase } from "./list-market-use-case.js";

// reference point — Rondonópolis city center
const ORIGIN = { lat: -16.4707, lon: -54.6375 };

const STUB_CATEGORY = {
	id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	name: "Papel / Papelão",
	hazard_levels: ["LOW" as const],
};

const PLASTICO_CATEGORY = {
	id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	name: "Plástico",
	hazard_levels: ["LOW" as const],
};

// default company — Bio Ecologica (~3.3km from center), has wastes, no services
const makeDefaultCompany = (overrides = {}) =>
	makeMarketCompany({
		id: "company-1",
		business_name: "Bio Ecologica",
		corporate_name: "Bio Ecologica LTDA",
		phones: ["(66) 99999-0001"],
		wastes: [
			makeMarketItem({
				id: "waste-1",
				name: "Papel e Papelão",
				description: "Jornais, revistas, caixas",
				price: 0.5,
				waste_category_id: STUB_CATEGORY.id,
				waste_category: STUB_CATEGORY,
				quantity: 0,
			}),
			makeMarketItem({
				id: "waste-2",
				name: "Plástico",
				description: "PET, PEAD, PVC",
				price: 0.8,
				waste_category_id: PLASTICO_CATEGORY.id,
				waste_category: PLASTICO_CATEGORY,
				quantity: 0,
			}),
		],
		business_hours: [
			{
				id: "bh-1",
				day_of_week: "MONDAY" as const,
				is_open: true,
				time_slots: [{ id: "ts-1", start_time: "07:00", end_time: "17:00" }],
			},
		],
		...overrides,
	});

describe("list-market-use-case", () => {
	let repo: InMemoryMarketRepository;
	let sut: ListMarketUseCase;

	beforeEach(() => {
		repo = new InMemoryMarketRepository();
		sut = new ListMarketUseCase(repo);
	});

	it("lists companies within radius", async () => {
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].id).toBe("company-1");
	});

	it("excludes companies outside radius", async () => {
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 1000 });
		expect(result.companies).toHaveLength(0);
	});

	it("sorts by distance ascending", async () => {
		const companyA = makeMarketCompany({
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
				latitude: -16.4707 + 0.0045,
				longitude: -54.6375,
			},
		});

		const companyB = makeMarketCompany({
			id: "company-b",
			business_name: "Empresa B",
		});

		repo.companies = [companyB, companyA];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(2);
		expect(result.companies[0].id).toBe("company-a");
	});

	it("filters by business_name text", async () => {
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000, q: "Bio" });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].business_name).toBe("Bio Ecologica");
	});

	it("excludes companies that don't match business_name text", async () => {
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({
			...ORIGIN,
			radius: 5000,
			q: "Inexistente",
		});
		expect(result.companies).toHaveLength(0);
	});

	it("filters by waste name", async () => {
		repo.companies = [makeDefaultCompany()];
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

	it("filters by business_name text ignoring accents", async () => {
		repo.companies = [
			makeDefaultCompany({ business_name: "Recicladora Alemão" }),
		];
		const result = await sut.execute({
			...ORIGIN,
			radius: 5000,
			q: "alemao",
		});
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].business_name).toBe("Recicladora Alemão");
	});

	it("filters by waste name ignoring accents", async () => {
		repo.companies = [
			makeDefaultCompany({
				wastes: [
					makeMarketItem({
						id: "waste-oil",
						name: "Óleo de cozinha",
						description: "Óleo usado",
						price: 1.2,
						waste_category_id: PLASTICO_CATEGORY.id,
						waste_category: PLASTICO_CATEGORY,
						quantity: 0,
					}),
				],
			}),
		];
		const result = await sut.execute({ ...ORIGIN, radius: 5000, q: "oleo" });
		expect(result.companies).toHaveLength(1);
	});

	it("filters by service name", async () => {
		const companyWithService = makeMarketCompany({
			id: "company-service",
			business_name: "Empresa de Serviços",
			services: [
				makeMarketItem({
					id: "service-1",
					name: "Coleta domiciliar",
					description: "Coleta de resíduos na porta",
					price: 50,
					waste_category_id: STUB_CATEGORY.id,
					waste_category: STUB_CATEGORY,
					quantity: 0,
				}),
			],
			wastes: [],
		});
		repo.companies = [companyWithService];
		const result = await sut.execute({ ...ORIGIN, radius: 5000, q: "Coleta" });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].id).toBe("company-service");
	});

	it("filters by waste category", async () => {
		const companyWithWastes = makeDefaultCompany({ id: "company-waste" });
		const companyWithoutWastes = makeMarketCompany({
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

	it("filters by services category", async () => {
		const companyWithServices = makeMarketCompany({
			id: "company-services",
			business_name: "Empresa de Serviços",
			services: [
				makeMarketItem({
					id: "service-1",
					name: "Coleta domiciliar",
					description: null,
					price: 50,
					waste_category_id: STUB_CATEGORY.id,
					waste_category: STUB_CATEGORY,
					quantity: 0,
				}),
			],
			wastes: [],
		});
		const companyWithoutServices = makeDefaultCompany({
			id: "company-no-services",
			business_name: "Empresa Sem Serviços",
			services: [],
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

	it("returns correct distance_in_meters for Bio Ecologica", async () => {
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		const distance = result.companies[0].distance_in_meters;
		expect(distance).toBeGreaterThan(3000);
		expect(distance).toBeLessThan(3700);
	});

	it("returns business_hours populated", async () => {
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		const businessHours = result.companies[0].business_hours;
		expect(businessHours.length).toBeGreaterThanOrEqual(1);
		expect(businessHours[0].time_slots.length).toBeGreaterThanOrEqual(1);
	});

	it("returns next_cursor on first page when more results exist", async () => {
		repo.companies = Array.from({ length: 5 }, (_, i) =>
			makeMarketCompany({
				id: `company-${i + 1}`,
				business_name: `Empresa ${i + 1}`,
			}),
		);
		const result = await sut.execute({ ...ORIGIN, radius: 5000, limit: 2 });
		expect(result.next_cursor).not.toBeNull();
	});

	it("returns null next_cursor on last page", async () => {
		repo.companies = Array.from({ length: 3 }, (_, i) =>
			makeMarketCompany({
				id: `company-${i + 1}`,
				business_name: `Empresa ${i + 1}`,
			}),
		);
		const result = await sut.execute({ ...ORIGIN, radius: 5000, limit: 10 });
		expect(result.next_cursor).toBeNull();
	});

	it("paginates correctly with cursor", async () => {
		repo.companies = Array.from({ length: 4 }, (_, i) =>
			makeMarketCompany({
				id: `company-${i + 1}`,
				business_name: `Empresa ${i + 1}`,
			}),
		);

		const page1 = await sut.execute({ ...ORIGIN, radius: 5000, limit: 2 });
		expect(page1.companies).toHaveLength(2);
		expect(page1.next_cursor).not.toBeNull();
		assert(page1.next_cursor !== null);

		const page2 = await sut.execute({
			...ORIGIN,
			radius: 5000,
			limit: 2,
			cursor: page1.next_cursor,
		});
		expect(page2.companies).toHaveLength(2);

		const page1Ids = page1.companies.map((c) => c.id);
		const page2Ids = page2.companies.map((c) => c.id);
		const allIds = [...page1Ids, ...page2Ids];
		expect(new Set(allIds).size).toBe(4);

		const hasIntersection = page1Ids.some((id) => page2Ids.includes(id));
		expect(hasIntersection).toBe(false);
	});

	it("returns empty list when no companies in radius", async () => {
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 100 });
		expect(result.companies).toStrictEqual([]);
		expect(result.next_cursor).toBeNull();
	});

	it("combines text and category filters", async () => {
		const companyWithPlastico = makeDefaultCompany({
			id: "company-plastico",
			business_name: "Reciclagem Total",
		});

		const companyWithoutPlastico = makeMarketCompany({
			id: "company-papel",
			business_name: "Papel Certo",
			services: [],
			wastes: [
				makeMarketItem({
					id: "waste-only-papel",
					name: "Papel e Papelão",
					description: "Jornais, revistas, caixas",
					price: 0.5,
					waste_category_id: STUB_CATEGORY.id,
					waste_category: STUB_CATEGORY,
					quantity: 0,
				}),
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

	it("returns company phones", async () => {
		repo.companies = [
			makeDefaultCompany({ phones: ["(66) 99999-0001", "(66) 3411-0002"] }),
		];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].phones).toEqual([
			"(66) 99999-0001",
			"(66) 3411-0002",
		]);
	});

	it("returns empty phones when company has none", async () => {
		repo.companies = [makeDefaultCompany({ phones: [] })];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].phones).toEqual([]);
	});

	it("returns business_name", async () => {
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].business_name).toBe("Bio Ecologica");
	});

	it("returns address latitude and longitude", async () => {
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].address.latitude).toEqual(expect.any(Number));
		expect(result.companies[0].address.longitude).toEqual(expect.any(Number));
	});

	it("returns identity and identity_type for CNPJ", async () => {
		repo.companies = [
			makeDefaultCompany({
				identity: "12345678000190",
				identity_type: "CNPJ" as const,
			}),
		];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].identity).toBe("12345678000190");
		expect(result.companies[0].identity_type).toBe("CNPJ");
	});

	it("hides identity when identity_type is CPF (LGPD)", async () => {
		repo.companies = [
			makeDefaultCompany({
				identity: "12345678901",
				identity_type: "CPF" as const,
			}),
		];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].identity).toBeNull();
		expect(result.companies[0].identity_type).toBeNull();
	});

	it("defaults radius to 1000m when not provided", async () => {
		// Bio Ecologica is ~3.3km from center — outside the default 1000m radius
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({ ...ORIGIN });
		expect(result.companies).toHaveLength(0);
	});

	it("returns null avatar when company has no image", async () => {
		repo.companies = [makeDefaultCompany()];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0]).toHaveProperty("avatar");
		expect(result.companies[0].avatar).toBeNull();
	});

	it("returns avatar url when company has one", async () => {
		repo.companies = [
			makeDefaultCompany({
				avatar: "https://example.com/avatar.jpg",
			}),
		];
		const result = await sut.execute({ ...ORIGIN, radius: 5000 });
		expect(result.companies).toHaveLength(1);
		expect(result.companies[0].avatar).toBe("https://example.com/avatar.jpg");
	});
});
