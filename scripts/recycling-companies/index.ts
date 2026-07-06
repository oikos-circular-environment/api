/**
 * Gera empresas de reciclagem para qualquer cidade brasileira, misturando
 * dados reais do Google Places com dados sintéticos do Faker.
 *
 * Uso:
 *   GOOGLE_PLACES_API_KEY=<sua-chave> npx tsx scripts/recycling-companies/index.ts \
 *     --city="Rondonópolis" --state=MT
 *
 *   # múltiplas cidades numa execução
 *   npx tsx scripts/recycling-companies/index.ts --city="Cuiabá" --state=MT --city="Campinas" --state=SP
 *
 *   # completar cidade pequena até 40 empresas com padding sintético
 *   npx tsx scripts/recycling-companies/index.ts --city="Sinop" --state=MT --target=40
 *
 *   # ignora o cache de arquivo já existente
 *   npx tsx scripts/recycling-companies/index.ts --city="Rondonópolis" --state=MT --force
 *
 * Output: prisma/seeds/recycling-companies/<cidade>-<uf>.json (um arquivo por cidade)
 */
import "dotenv/config";
import { runCli } from "./cli.js";

runCli(process.argv.slice(2)).catch((err) => {
	console.error(err);
	process.exit(1);
});
