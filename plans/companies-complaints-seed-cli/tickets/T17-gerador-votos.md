# T17 — Gerador de votos (coerência com quórum)

**Status:** ⬜ Pendente
**Depende de:** T12
**Arquivos:** `cli/complaints/services/vote-generator.ts` (+spec)

## Checklist

- [ ] Duplicar localmente a fórmula de `src/modules/complaints/workers/quorum-logic.ts` (`calculateWeights`: peso 2 para o autor, peso 1 para os demais) — **com um comentário explícito** apontando o arquivo original como fonte da verdade; NÃO importar de `workers/` (acoplaria o CLI a um worker de produção)
- [ ] `VoteGenerator.generate(status: ComplaintStatusSeed, residentPoolSize: number, authorIndex: number): VoteSeed[]`:
  - `RESOLVED`: sorteia votantes distintos (excluindo `authorIndex`) até que `positive >= 5 + negative`, com ruído de alguns votos negativos
  - `OPEN`: 0-4 votos, garantindo que a fórmula NÃO atinja o quórum
  - `CANCELED`: 0-3 votos livres (sem restrição de quórum)
- [ ] Nunca gera dois votos com o mesmo `resident_index` na mesma denúncia; nunca inclui `authorIndex`
- [ ] Spec cobre os três status: `RESOLVED` sempre atinge quórum pela fórmula duplicada; `OPEN` nunca atinge; votantes sempre distintos e nunca incluem o autor
