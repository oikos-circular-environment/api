# CLI de Seed Multi-Domínio (Empresas + Denúncias) — Visão Geral

Hoje `api/scripts/recycling-companies/` é um CLI standalone que, para qualquer cidade brasileira, gera dados de seed de **Empresas de reciclagem** (ver `plans/recycling-companies-seed/`). Ele já resolve a cidade escolhida via IBGE + Google Geocoding (`CityContext` com bounds/centro) — mas essa resolução geográfica só alimenta um domínio, e cada empresa recebe hoje um usuário fictício descartável, sem nenhuma conexão com o resto do grafo de dados.

Objetivo deste trabalho: (1) renomear/elevar esse pacote para `api/cli/` (raiz de `api/`, fora de `scripts/`); (2) expandi-lo para, reaproveitando a MESMA seleção interativa de estado/cidade, gerar também **Denúncias (Complaints)** — com anexos, votações e resoluções; e (3) fazer com que **todo o dado gerado pertença a um mesmo grafo coeso por cidade**: um pool de moradores fictícios (usuário + profile), onde cada morador pode ser dono de até 2 empresas e, independentemente disso, ser autor, votante ou resolvedor de denúncias — nunca populações isoladas que nunca se cruzam.

---

## Por que agora

O domínio de Complaints (`api/src/modules/complaints/`) está completo em produção (rotas, quórum, resoluções, mapa público `/complaints/map`) mas **não tem nenhum seed** — não há como popular o ambiente de dev/teste com denúncias realistas para exercitar o mapa, o fluxo de votação ou o painel de resoluções. O CLI de empresas já resolve exatamente o problema geográfico que faltava (bounds de uma cidade real) — em vez de duplicar essa lógica num script separado, faz sentido um teto único. E, para os dados servirem de verdade para teste manual/demonstração, eles precisam se comportar como um cenário real: a mesma pessoa que "mora" numa cidade pode ter uma empresa de reciclagem E ter denunciado um descarte irregular E ter resolvido a denúncia de outra pessoa — não três populações de fantoches desconectadas.

## Decisões de Design

### Rename e reorganização em `shared/` / `companies/` / `complaints/`

`api/scripts/recycling-companies/` deixa de existir; vira `api/cli/`, com três sub-pacotes:
- **`shared/`** — o que os dois domínios reaproveitam: resolução de cidade (IBGE + Google Geocoding → `CityContext`), o pool de moradores fictícios da cidade (ver abaixo), e utilitários sem estado (`fake-phone.ts`, `AddressSeed`). Nome escolhido para não colidir com `src/modules/common/` (infra genérica da API principal, sem relação).
- **`companies/`** — todo o conteúdo específico de empresa que já existe hoje, realocado, com um ajuste: empresas passam a referenciar um morador da cidade como dono, em vez de inventar um usuário descartável por empresa.
- **`complaints/`** — novo domínio, mesmo padrão de camadas, mas **sem nenhuma API externa**: denúncias são 100% sintéticas, geolocalizadas dentro do `CityContext.bounds` já resolvido (não há "Google Places de denúncias").

### Um único pool de "moradores da cidade" (`CityResidentSeed`), compartilhado pelos dois domínios

Este é o ajuste central pedido: em vez de (a) um usuário descartável por empresa e (b) um pool de "cidadãos" só de denúncia, existe **um único pool de moradores por cidade**, gerado uma vez (`shared/`) e reaproveitado por ambos os pipelines:

- Cada morador (`CityResidentSeed`) tem nome, telefone, email e um endereço fabricado dentro do bounds da cidade (mesmo shape `AddressSeed` já usado por empresas) — no consumidor, vira `User` + `Profile` + `Address` reais.
- Um morador pode ser dono de **0, 1 ou no máximo 2 empresas** (`CompanySeed.owner_resident_index` aponta para esse pool; um assignment respeita o teto de 2 por morador).
- Qualquer morador do pool (dono de empresa ou não) pode ser autor de denúncia, votante, ou resolvedor.
- Quando um morador que é dono de empresa resolve uma denúncia, a resolução pode legitimamente carregar `company_id` daquela empresa — porque é literalmente a mesma pessoa, nunca um "empréstimo" de identidade entre moradores. Isso satisfaz por construção a regra real de negócio (`SubmitResolutionUseCase`: resolvedor precisa ser o dono de fato da empresa referenciada).

O pool é persistido em seu próprio arquivo por cidade (`prisma/seeds/city-residents/<slug>-<uf>.json`), com o mesmo padrão de idempotência dos demais writers ("pula se já existe", `--force` para regenerar) — assim, gerar Empresas e Denúncias em execuções separadas do CLI para a mesma cidade ainda reaproveita o mesmo pool de moradores (quem rodar primeiro cria o arquivo; quem rodar depois só carrega).

### Denúncias não têm FK de cidade — a associação é só geográfica

Diferente de `Company` (que usa `Address` com `city_ibge_id`/`state_ibge_id`), `Complaint` não referencia cidade/estado — só tem um JSON `geospatial` (formato do `expo-location` no mobile) e uma coluna PostGIS `location`. "Gerar denúncias associadas à cidade selecionada" significa, na prática, fabricar coordenadas dentro do bounding box da cidade e montar um `geospatial.addresses` plausível.

### Categorias compartilhadas, resolvidas só no consumidor

Não existe uma tabela de categoria separada para denúncias — `ComplaintWasteCategory` referencia a mesma `WasteCategory` usada por `CompanyWaste`/`CompanyService`. O gerador de JSON só grava `waste_category_names` (nomes do catálogo canônico `src/modules/wastes/data/waste-categories-base.ts`, nunca inventados); a resolução nome→id acontece exclusivamente no consumidor Prisma, mesmo padrão já usado por `prisma/seeds/recycling-companies.ts`.

### Anexos com upload real via `StorageProvider`; avatares ficam vazios

As 7 imagens hoje órfãs em `api/src/assets/` (nenhuma referência em todo o repo, confirmado) migram para `api/cli/assets/` e são renomeadas para um padrão consistente (`complaint-sample-01.jpg` … `complaint-sample-07.jpg` — ver `01-technical-plan.md` §2 para o mapeamento exato nome antigo→novo). O consumidor faz upload **real** via `StorageProvider` já existente (`src/modules/common/providers/storage/`, MinIO local por padrão) — não apenas metadados fake — para que as URLs geradas sejam de fato visualizáveis no app. Isso passa a exigir `docker compose up minio createbuckets` rodando antes de `npm run seed` sempre que houver denúncias com anexo.

Essas imagens servem **só** como anexo de denúncia (`ComplaintAttachment`) — decisão explícita: `Profile.profile_image_id` e `Company.avatar_id` continuam `null` para todo dado gerado por este seed. Não há geração de avatar de perfil nem de logo de empresa nesta entrega.

### Vínculo empresa↔resolvedor: decidido na geração, garantido pela identidade do morador

Diferente de uma versão anterior deste desenho (que cogitava resolver esse vínculo só no consumidor, escolhendo qualquer empresa da cidade), com o pool unificado de moradores o vínculo é **garantido por construção desde a geração do JSON**: uma resolução com `resolution_hint: "PREFER_COMPANY"` só é gerada apontando para um morador que **já é dono de empresa** naquele mesmo arquivo de moradores. O consumidor só precisa confirmar no banco se aquele morador de fato tem empresa(s) associadas (pode ter rodado só o pipeline de denúncias, sem empresas, para essa cidade) — se não tiver, a resolução cai para `company_id: null`.

### Coerência entre `status` e `votes` — não só validade estrutural

Uma denúncia `RESOLVED` só devia existir organicamente se a fórmula real de quórum (`workers/quorum-logic.ts`: peso 2 para o dono, `positivos >= 5 + negativos`) tivesse sido satisfeita. O gerador de votos replica essa fórmula (duplicada localmente com comentário — importar de `workers/` acoplaria o CLI a um worker de produção) para gerar uma quantidade de votos coerente com o `status` alvo: `OPEN` fica deliberadamente abaixo do quórum, `RESOLVED` o atinge (com algum ruído de votos negativos), `CANCELED` não depende de quórum (é ação direta do dono). Votantes são sempre moradores distintos do pool da cidade, excluindo o próprio autor da denúncia.

### CLI: sem seletor de dataset — escolher a cidade gera o pacote completo, o controle é só de quantidade

Ajuste feito depois da primeira versão deste plano: não existe mais um toggle "Empresas / Denúncias / Ambos". Escolher um estado/cidade sempre gera o pacote inteiro e vinculado (moradores + empresas + denúncias) — o que se controla são só as **quantidades** de cada tipo, via três flags numéricas independentes: `--residents` (moradores/usuários), `--companies`, `--complaints`. Cada uma tem um default sensato (ver `01-technical-plan.md` §4.3) para que rodar o CLI sem nenhuma flag numérica ainda produza um cenário completo e útil. Setar uma quantidade como `0` é a forma de "desligar" aquele tipo para uma cidade específica (ex.: `--companies=0` para só adicionar mais denúncias a uma cidade que já tem empresas de uma execução anterior).

`--residents` funciona como um **piso**, não um teto exato: se o número pedido for insuficiente para acomodar `--companies` respeitando o limite de no máximo 2 empresas por morador, o pool é automaticamente aumentado (com uma nota no output do CLI) — nunca falha silenciosamente nem gera menos empresas do que o pedido.

A resolução de cidade (`ResolveCityUseCase`) e a resolução/geração do pool de moradores rodam uma única vez por cidade por execução, compartilhadas pelos pipelines de empresas e denúncias.

## Fora de escopo

- Não há filtro por cidade/estado no endpoint `/complaints/map` hoje (só raio geográfico) — este trabalho não adiciona esse filtro, só garante que as coordenadas geradas caiam dentro do raio que um usuário testando localmente vai consultar.
- Não simula o worker assíncrono de quórum (BullMQ/Redis) — `status` é setado diretamente na criação, seguindo o mesmo princípio já adotado para `is_company_valid` no seed de empresas.
- Não adiciona paralelismo/lote no upload de anexos do consumidor — fica registrado como possível follow-up se o volume de denúncias tornar `npm run seed` perceptivelmente lento.
- Não altera o schema Prisma — 100% geração/consumo de seed data para os modelos já existentes.
- Não gera `ProfileImage`/`CompanyAvatar` — perfis e empresas geradas por este seed ficam sem foto/logo.
- Não migra os JSONs de empresa já gerados no formato antigo (`prisma/seeds/recycling-companies/*.json`, com usuário 1-por-empresa) — arquivos gerados antes desta mudança continuam compatíveis com o consumidor antigo; a migração para o novo formato com `owner_resident_index` só se aplica a cidades regeradas depois desta mudança (ver riscos em `01-technical-plan.md`).
