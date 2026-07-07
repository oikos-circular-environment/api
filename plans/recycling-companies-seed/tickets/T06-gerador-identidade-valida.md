# T6 — Gerador de identidade válida (CPF/CNPJ)

**Status:** ✅ Concluído
**Depende de:** T1
**Arquivos:** `services/identity-generator.ts` (+spec)

## Checklist

- [x] `class BrazilianIdentityGenerator` com `computeCpfCheckDigits`/`computeCnpjCheckDigits` (módulo 11)
- [x] `nextCpf()`/`nextCnpj()` com `Set` interno de unicidade por instância, retry em colisão
- [x] Spec valida dígitos verificadores contra CPFs/CNPJs reais conhecidos (123.456.789-09 e 11.222.333/0001-81, verificados manualmente antes de escrever o código)
- [x] Spec confirma que N chamadas sucessivas nunca colidem (200 pares CPF/CNPJ)
- [x] `npm run test -- identity-generator` passa (6 testes)
