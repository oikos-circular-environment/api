/**
 * Migra o dataset legado de Rondonópolis (prisma/seeds/recycling-companies.json,
 * gerado por uma versão anterior do gerador) para o novo contrato multi-cidade
 * (prisma/seeds/recycling-companies/rondonopolis-mt.json).
 *
 * Transformação local, zero chamadas de rede — preserva o custo já pago em
 * chamadas ao Google Places. Corrige dois problemas do shape antigo:
 *   - `waste_type: "RECYCLABLE"` + nome legado → `waste_category_name` real
 *   - `quantity: "0.00"` (inválido, viola `companyWasteSchema.quantity.positive()`)
 *     → valores positivos padrão (os mesmos do antigo `defaultWastes()`)
 *
 * Uso: npx tsx scripts/recycling-companies/migrate-legacy-seed.ts
 */
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const LEGACY_PATH = resolve("prisma/seeds/recycling-companies.json");
const OUTPUT_DIR = resolve("prisma/seeds/recycling-companies");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "rondonopolis-mt.json");

const WASTE_NAME_TO_CATEGORY: Record<string, string> = {
	"Papel e Papelão": "Papel / Papelão",
	Plástico: "Plástico",
	Metal: "Metal / Alumínio",
	Vidro: "Vidro",
};

const DEFAULT_QUANTITY_BY_NAME: Record<string, number> = {
	"Papel e Papelão": 500,
	Plástico: 300,
	Metal: 200,
	Vidro: 300,
};

interface LegacyWaste {
	name: string;
	description: string | null;
	price: string;
	unit: string;
}

interface LegacyCompany {
	_source: { google_place_id: string; rating: number; types: string[] };
	corporate_name: string;
	business_name: string | null;
	identity: string;
	identity_type: string;
	company_type: string;
	status: boolean;
	email: string | null;
	phones: string[];
	website: string | null;
	started_activity_in: string;
	address: unknown;
	business_hours: unknown[];
	wastes: LegacyWaste[];
	services: unknown[];
}

interface LegacyFile {
	_meta: {
		generated_at: string;
		total: number;
		city: string;
		state_code: string;
		queries_used: string[];
	};
	companies: LegacyCompany[];
}

function migrateWaste(waste: LegacyWaste) {
	const categoryName = WASTE_NAME_TO_CATEGORY[waste.name];
	const quantity = DEFAULT_QUANTITY_BY_NAME[waste.name];

	if (!categoryName || quantity === undefined) {
		throw new Error(
			`Categoria desconhecida no dataset legado: "${waste.name}" — adicione o mapeamento antes de migrar`,
		);
	}

	return {
		name: waste.name,
		description: waste.description,
		price: Number(waste.price),
		unit: waste.unit,
		waste_category_name: categoryName,
		quantity,
	};
}

export function migrateLegacySeed(): void {
	if (!existsSync(LEGACY_PATH)) {
		console.log("Nenhum dataset legado encontrado — nada a migrar.");
		return;
	}

	const legacy: LegacyFile = JSON.parse(readFileSync(LEGACY_PATH, "utf-8"));

	const companies = legacy.companies.map((company) => ({
		_source: {
			google_place_id: company._source.google_place_id,
			rating: company._source.rating,
			types: company._source.types,
			is_ecoponto: false,
			synthetic: false,
		},
		corporate_name: company.corporate_name,
		business_name: company.business_name,
		identity: company.identity,
		identity_type: company.identity_type,
		company_type: company.company_type,
		status: company.status,
		email: company.email,
		phones: company.phones,
		website: company.website,
		started_activity_in: company.started_activity_in,
		address: company.address,
		business_hours: company.business_hours,
		wastes: company.wastes.map(migrateWaste),
		services: [],
	}));

	mkdirSync(OUTPUT_DIR, { recursive: true });

	const output = {
		_meta: {
			generated_at: legacy._meta.generated_at,
			total: companies.length,
			city: legacy._meta.city,
			state_code: legacy._meta.state_code,
			queries_used: legacy._meta.queries_used,
		},
		companies,
	};

	writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
	rmSync(LEGACY_PATH);

	console.log(`Migrado: ${companies.length} empresas → ${OUTPUT_PATH}`);
	console.log(`Removido: ${LEGACY_PATH}`);
}

migrateLegacySeed();
