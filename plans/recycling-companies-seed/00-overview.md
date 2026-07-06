# Gerador de Empresas de Reciclagem Multi-Cidade — Visão Geral

Hoje `scripts/fetch-recycling-places.ts` é um script único, hardcoded para Rondonópolis-MT (bounding box, IBGE ids e estado fixos no topo do arquivo). Toda empresa recebe os mesmos 4 resíduos e 3 serviços fixos, e um CNPJ fake sequencial sem dígito verificador. Isso não escala para os testes que precisam rodar contra outras cidades com dados variados.

Objetivo: um pacote modular que, para qualquer cidade brasileira escolhida (nome + UF), busca empresas reais via Google Places, complementa lacunas via Faker, classifica corretamente o tipo de empresa, e opcionalmente completa até uma meta de quantidade com empresas sintéticas — mantendo nome/endereço/geolocalização fiéis ao Google sempre que existirem.

---

## Bug descoberto (pré-requisito do trabalho)

`prisma/seeds/recycling-companies.ts` **ignora completamente** os campos `wastes`/`services` do JSON gerado e sempre aplica suas próprias constantes `DEFAULT_WASTES`/`DEFAULT_SERVICES` fixas para toda empresa. Mesmo que o gerador produza variedade, ela nunca chega ao banco hoje. Corrigir isso é pré-requisito para o objetivo de "dados variados" fazer sentido — ver `01-technical-plan.md`.

## Dataset legado desalinhado

`prisma/seeds/recycling-companies.json` (48 empresas de Rondonópolis) usa um shape antigo: `waste_type: "RECYCLABLE"` em vez de `waste_category_name`, `services: []`, campos que não existem no Prisma (`is_headquarters`, `accept_appointments`), e **`quantity: "0.00"` em todo item — o que viola `companyWasteSchema.quantity.positive()`**. A migração desse arquivo exige uma transformação pontual, não uma cópia direta.

---

## Decisões de Design

### Resolução geográfica 100% dinâmica
Sem lista de cidades mantida manualmente. Google Geocoding resolve bounds/centro da cidade; a API pública do IBGE (`servicodados.ibge.gov.br`, gratuita, sem chave) resolve `city_ibge_id`/`state_ibge_id`/`state_code`. Confirmado por teste real: a API do IBGE não tem busca por nome — a chamada correta é `estados/{UF}/municipios` (lista da UF) com match client-side por nome normalizado.

Para o Geocoding, usamos o SDK oficial `@googlemaps/google-maps-services-js` (nova devDependency) em vez de `fetch()` cru — é estável, cobre Geocoding de primeira classe com autenticação simples por API key. Para Places, permanece `fetch()` cru: o mesmo SDK só cobre a API **legada** de Places, e o único SDK oficial da "Places API (New)" está em preview (instável) e pressupõe autenticação via ADC/service account, incompatível com a chave simples já usada hoje.

### Arquitetura orientada a objetos, sem persistência nova por enquanto
O código é organizado em camadas explícitas — `entities/` (tipos de domínio), `providers/` (interfaces + implementações para as APIs externas), `services/` (lógica de domínio pura, uma responsabilidade por classe), `use-cases/` (orquestração via injeção de construtor) e `writers/` (saída do arquivo de seed) — espelhando o padrão já usado em `src/modules/` (interface + implementação, injeção via construtor, sem container de IoC). Isso deixa o código pronto para, no futuro, virar um serviço isolado sem redesenho.

**Persistência de dados brutos fica para depois.** Avaliamos SQLite (`node:sqlite`, nativo do Node 24) como cache de dados brutos, mas foi descartado por ora: quando chegar a hora de persistir, deve ser via **Prisma** — consistente com o resto do stack, não outra ferramenta. Por enquanto validamos via JSON (como já era feito), e só depois de validado o fluxo ponta a ponta é que a persistência entra, se fizer sentido.

### Google é fonte de verdade para identidade real; Faker só preenche lacunas
Nome, endereço e geolocalização **nunca são fabricados** quando existe dado real do Google — isso traz familiaridade a quem testa. Faker preenche apenas o que falta (telefone, email, horários, CNPJ/CPF válido, variedade de resíduos/serviços). Empresas 100% sintéticas só existem se `--target` pedir mais unidades do que o Google retornou para aquela cidade.

### Diversificação de `company_type`/`identity_type` por sinais reais
Classificação heurística a partir de nome/endereço retornado pelo Google: prefeitura/secretaria/ecoponto → `GOVERNMENT`; cooperativa/associação/ONG → `ONG`; sucata/ferro-velho informal → `COLLECTOR` com CPF; default → `COMPANY`/CNPJ. Ecopontos (locais geridos por município) são marcados explicitamente (`_source.is_ecoponto`) para permitir análises futuras.

### Migração, não regeneração, do dataset de Rondonópolis
Preserva o custo já pago em chamadas à API do Google. Uma transformação local (zero rede) corrige o shape para o schema atual e substitui `quantity: "0.00"` por valores positivos.

### Arquivos `.http` (REST Client) para inspeção manual
Pasta dedicada com requests prontos (Google Places Text Search/Details, Google Geocoding, IBGE municípios) usando a sintaxe da extensão [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client), para conferir request/response de cada API externa antes de confiar nelas no código. Não faz parte do fluxo de execução do script.

---

## Seleção interativa de estado/cidade — implementado (Lote 7)

O que estava registrado abaixo como melhoria futura foi implementado no Lote 7 (`tickets/T18`–`T22`): quando `--city`/`--state` são omitidos (e há um terminal real), o CLI entra em modo interativo com `@clack/prompts` — `select` de estado (endpoint `estados` do IBGE) → `autocomplete` de cidade (endpoint `estados/{UF}/municipios`) → loop "adicionar outra cidade?" → prompts de `target`/`force`. Progresso e erros por etapa são mostrados via Listr2 (task list). Ver `01-technical-plan.md` para os detalhes de arquitetura e `02-execution-plan.md`/`tickets/T18`–`T22` para o que foi feito.

## Fora de escopo

- Não há dimensão de produto/UX — é uma ferramenta de tooling para gerar dados de teste/dev.
- Não inclui persistência de dados brutos (cache de respostas do Google/IBGE) — fica para uma fase futura, via Prisma, após validação via JSON.
- Não inclui deduplicação de `identity` entre execuções separadas do processo (o `Set` de unicidade vive só durante uma execução; o backstop entre execuções é a constraint `@unique` do banco).
- Não inclui a re-geração de variedade para o dataset já migrado de Rondonópolis (fica registrado como follow-up opcional).
- Não inclui um servidor HTTP próprio (ideia de "serviço isolado consumível pela API principal" fica só como preparação arquitetural — interfaces/DI — não como entrega desta etapa).
- **CLI/TUI improvements — parcialmente implementado no Lote 7:** `@clack/prompts` (seleção interativa) e `Listr2` (task list com progresso/erro por etapa) foram adotados — ver seção acima. `parseArgs` nativo continua sendo usado para parsing de flags (não foi substituído). Alternativas pesquisadas e **não** adotadas, registradas para referência futura:
  - **Commander.js** — framework completo com subcomandos, validação, help automático, substituindo `parseArgs` cru. Não adotado: o CLI não tem subcomandos, `parseArgs` já atende.
  - **Ora (`oraPromise`)** — spinners avulsos para promises. Não adotado: Listr2 já cobre a mesma necessidade com visão de lista de tasks.
  - **Ink + Ink UI** — TUI completa com React no terminal, útil se o CLI evoluir para um dashboard interativo em tempo real. Fora de escopo por ora.
  - **Enquirer / Inquirer.js** — alternativas ao Clack com mais tipos de prompt. Não adotado: Clack já cobre `select`/`autocomplete`/`text`/`confirm`.
  - **Terminal Kit** — TUI não-React de baixo nível. Fora de escopo.
