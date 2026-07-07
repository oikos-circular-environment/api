# T24 — Melhorias no consumidor de seed

**Status:** ✅ Concluído
**Depende de:** T15
**Arquivos:** `prisma/seeds/recycling-companies.ts`

## Checklist

- [x] **Bug real corrigido**: `is_company_valid` era hardcoded `true` na criação da `Company`, nunca calculado — agora usa a mesma fórmula de `computeIsCompanyValid()` (`general_registration && address && business_hours && (wastes || services)`), inline com comentário apontando a fonte da verdade em `company-validation-utils.ts`
- [x] Log de categoria não resolvida (`console.warn`) para resíduos e serviços, em vez de descarte silencioso
- [x] Validação Zod prévia (`companyGeneralRegistrationValidationSchema`, `upsertCompanyAddressSchema`, `upsertCompanyBusinessHoursSchema`, os mesmos usados nos testes do gerador) antes da checagem de idempotência — rejeita com motivo claro em vez de deixar o Prisma falhar com erro genérico
- [x] Resumo final com contadores: criadas / já existiam / inválidas (schema) / falharam / total
- [x] Modo `SEED_DRY_RUN=true` — valida tudo (schema + resolução de categoria) sem escrever no banco
- [x] Senha do seed configurável via `SEED_USER_PASSWORD` (default preservado: `Seed@123456`)
- [x] **Achado real durante a verificação**: rodando contra um dataset real de 5 cidades (156 empresas, incluindo 4 cidades que o usuário gerou testando o CLI manualmente), a nova validação Zod rejeitou 17 empresas do dataset legado migrado de Rondonópolis por terem `phones: []` ou `business_hours: []` — dados que a versão anterior aceitava silenciosamente como "válidos" (o bug do `is_company_valid` hardcoded escondia exatamente esse problema)
- [x] Verificado: dry-run e seed real produzem os mesmos contadores; idempotência confirmada (segunda execução real: 0 criadas); `is_company_valid = true` para as 162 empresas no banco (as 17 inválidas nunca chegam a ser inseridas); warning de categoria não resolvida testado com um arquivo descartável (criado e removido só para o teste, empresa de teste removida do banco depois)
- [x] `npm run test` — suíte completa (314 testes) passa sem regressão
