# T5 — Classificador de tipo de empresa

**Status:** ✅ Concluído
**Depende de:** T1
**Arquivos:** `services/company-type-classifier.ts` (+spec)

## Checklist

- [x] `class CompanyTypeClassifier.classify(place)`
- [x] Sinal prefeitura/secretaria/ecoponto → `GOVERNMENT` + `is_ecoponto: true` (só quando a palavra "ecoponto" aparece)
- [x] Sinal cooperativa/associação/ong → `ONG`
- [x] Sinal sucata/ferro-velho informal (sem qualificador de empresa) → `COLLECTOR`/CPF
- [x] Default → `COMPANY`/CNPJ
- [x] Spec cobrindo os 4 casos + normalização de acento/caixa no texto de entrada + caso "sucata qualificada por LTDA continua COMPANY"
- [x] `npm run test -- company-type-classifier` passa (7 testes)
