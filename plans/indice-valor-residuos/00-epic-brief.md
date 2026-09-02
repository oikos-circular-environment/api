# Índice de Valor de Resíduos — Epic Brief

## Resumo

Hoje o preço de um resíduo (`CompanyWaste.price`) já existe no sistema, mas é um valor solto por empresa: sem histórico, sem agregação, sem distinção entre o que a empresa paga (compra) e o que cobra (venda), e vinculado a uma `WasteCategory` genérica demais para ancorar preço de mercado — "Metal/Alumínio", por exemplo, mistura alumínio, cobre, ferro e latão, que têm cotações completamente diferentes. O objetivo deste épico é transformar esse dado disperso em um índice de valor: média e histórico de preços praticados, navegável nacionalmente com filtro por estado e cidade, resolvendo uma lacuna que hoje nem o CEMPRE cobre (dados nacionais não consolidados, sem granularidade geográfica). Num primeiro momento o índice é só transparência/consulta; é a base de dado para uma futura camada de marketplace/negociação, mas isso está fora do escopo deste épico.

## Contexto & Problema

**Quem é afetado:** Empresas/cooperativas que cadastram resíduos na plataforma (fonte do dado) e qualquer usuário que queira consultar o valor de mercado de um resíduo antes de negociar (consumidor do dado).

**Onde no produto:** Módulo de resíduos das empresas (`company_wastes`, `waste_categories`/`waste_subcategories`) — captura e categorização do valor; e uma nova superfície de consulta (índice/dashboard de preços), ainda a definir em fluxo separado.

**Dor atual:**
- `CompanyWaste.price` é um valor único, sem histórico — não dá para saber se subiu, caiu, ou como se compara à média
- Não existe agregação: nenhum lugar mostra "valor médio praticado" por material ou região
- `CompanyWaste` vincula-se só a `WasteCategory` (categoria ampla), sem subcategoria — impossível separar cobre de ferro dentro de "Metal/Alumínio" para efeito de preço
- Não há distinção entre valor de compra e valor de venda no mesmo campo `price`
- O único paralelo de mercado (CEMPRE) publica tabela indicativa periódica, não consolidada e sem granularidade por cidade/estado — gap real, não só da Oikos

**Resultado esperado:** A plataforma passa a exibir, por material e região (nacional, com filtro de estado e cidade, sempre com agregador visível em todo nível), o valor médio praticado e seu histórico — construído a partir do dado que as empresas já informam, com categorização de material refinada (subcategoria) e separação compra/venda como pré-requisito de qualidade para esse dado ser confiável.

## Fora de escopo

- Marketplace/negociação entre empresas e catadores (visão futura, não deste épico)
- Cruzamento com cotação de commodity externa (LME/alumínio) — pode ser explorado depois, não é pré-requisito
