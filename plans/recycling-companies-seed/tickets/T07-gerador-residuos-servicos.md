# T7 — Gerador de resíduos/serviços variados

**Status:** ✅ Concluído
**Depende de:** T1
**Arquivos:** `services/waste-service-generator.ts` (+spec)

## Checklist

- [x] `class WasteServiceGenerator` com `RECYCLER_CATEGORY_POOL`/`ECOPONTO_CATEGORY_POOL` (import de `CATEGORIES` em `waste-categories-base.ts`, via `../../../src/modules/wastes/data/waste-categories-base.js`)
- [x] `generateWastes(pool)` / `generateServices(pool)` — 2 a 6 itens distintos por chamada, sem nomes duplicados (nome do item = nome da categoria, garante unicidade por construção)
- [x] Spec cobre pool recycler vs. ecoponto, unicidade de nomes, `price`/`quantity` sempre positivos
- [x] `npm run test -- waste-service-generator` passa (5 testes)
