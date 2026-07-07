# T16 — Seletor de status de denúncia

**Status:** ⬜ Pendente
**Depende de:** T12
**Arquivos:** `cli/complaints/services/complaint-status-picker.ts` (+spec)

## Checklist

- [ ] `ComplaintStatusPicker.pick(): ComplaintStatusSeed` — `faker.helpers.weightedArrayElement`, distribuição `OPEN: 55`, `RESOLVED: 35`, `CANCELED: 10` (constante nomeada, mesmo padrão de `TYPE_DISTRIBUTION` em `synthetic-company-generator.ts`, fácil de ajustar depois)
- [ ] Spec estatístico (N grande, ex. 1000 chamadas) confirma que os três valores aparecem e a proporção é plausível dentro de uma margem razoável
