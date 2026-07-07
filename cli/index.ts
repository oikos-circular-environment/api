/**
 * Gera usuários, empresas de reciclagem e denúncias para qualquer cidade
 * brasileira, misturando dados reais do Google Places com dados sintéticos
 * do Faker.
 *
 * Uso:
 *   GOOGLE_PLACES_API_KEY=<sua-chave> npx tsx cli/index.ts \
 *     --city="Rondonópolis" --state=MT
 *
 *   # múltiplas cidades numa execução
 *   npx tsx cli/index.ts --city="Cuiabá" --state=MT --city="Campinas" --state=SP
 *
 *   # controla quantidades por cidade (0 desativa aquele tipo)
 *   npx tsx cli/index.ts --city="Sinop" --state=MT --residents=10 --companies=40 --complaints=50
 *
 * Output: prisma/seeds/data-generated/<cidade>-<uf>.json (um arquivo por
 * cidade, com um array `users[]` — cada usuário carrega as empresas que
 * possui e as denúncias que fez)
 */
import "dotenv/config";
import { runCli } from "./cli.js";

runCli(process.argv.slice(2)).catch((err) => {
	console.error(err);
	process.exit(1);
});
