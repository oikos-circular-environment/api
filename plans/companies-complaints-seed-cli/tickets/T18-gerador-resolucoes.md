# T18 — Gerador de resoluções (`resolution_hint`)

**Status:** ⬜ Pendente
**Depende de:** T12
**Arquivos:** `cli/complaints/services/resolution-generator.ts` (+spec)

## Checklist

- [ ] `ResolutionGenerator.generate(status: ComplaintStatusSeed, residentsWithCompany: Set<number>, residentPoolSize: number, authorIndex: number): ResolutionSeed[]`
- [ ] Retorna `[]` se `status !== "RESOLVED"` (denúncia `CANCELED` não passa pelo fluxo de resolução; `OPEN` ainda não foi resolvida)
- [ ] Se `RESOLVED`: gera 1-2 resoluções, cada uma com `resident_index` distinto entre si dentro da mesma denúncia (nunca duplicado); diferente de votos, o autor PODE estar entre os sorteados (reflete o fluxo real de o dono encerrar a própria denúncia)
- [ ] `resolution_hint: "PREFER_COMPANY"` só é atribuído se o `resident_index` sorteado estiver em `residentsWithCompany` (e com alguma probabilidade, ex. 70% — nem todo morador dono de empresa necessariamente resolve "como empresa"); senão `"CITIZEN_ONLY"`
- [ ] Spec cobre: nunca gera resolução para `OPEN`/`CANCELED`; nunca duplica `resident_index` na mesma denúncia; `PREFER_COMPANY` nunca aparece para um índice fora de `residentsWithCompany`
