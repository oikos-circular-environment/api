# T8 — Preenchimento de lacunas (gap-filler)

**Status:** ✅ Concluído
**Depende de:** T4, T5, T6, T7
**Arquivos:** `services/company-gap-filler.ts` (+spec)

## Checklist

- [x] `class CompanyGapFiller.fill(place)` — recebe `GoogleBusinessHoursParser` injetado (default `new GoogleBusinessHoursParser()`)
- [x] Regra: usa dado real do Google quando existe; gera `phones`/`email`/`business_hours` só quando ausente
- [x] Spec: place com tudo preenchido → nada é gerado; place sem telefone/email/horário → tudo sintético e válido
- [x] `npm run test -- company-gap-filler` passa (4 testes)
- [x] `generateSyntheticHours` exportado para reuso em `synthetic-company-generator.ts` (T10)
