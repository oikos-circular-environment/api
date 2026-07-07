# T13 — Seletor de categorias de denúncia

**Status:** ⬜ Pendente
**Depende de:** T12
**Arquivos:** `cli/complaints/services/complaint-category-picker.ts` (+spec)

## Checklist

- [ ] Import de `CATEGORIES` de `../../../src/modules/wastes/data/waste-categories-base.js` (import relativo cruzando para `src/`, mesmo padrão já usado por `waste-service-generator.ts`)
- [ ] `ComplaintCategoryPicker.pick(): string[]` — `faker.helpers.arrayElements(ALL_CATEGORY_NAMES, { min: 1, max: 3 })`, nunca inventa nome fora do catálogo canônico
- [ ] NÃO reaproveita `WasteServiceGenerator` (que gera preço/quantidade/unidade — atributos que não existem em `ComplaintWasteCategory`, uma tabela de junção pura)
- [ ] Spec cobre: toda string retornada existe em `CATEGORIES.map(c => c.name)`; quantidade sempre entre 1 e 3; sem duplicatas dentro do mesmo retorno
