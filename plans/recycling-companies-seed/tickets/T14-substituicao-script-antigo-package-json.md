# T14 — Substituição do script antigo + package.json

**Status:** ✅ Concluído
**Depende de:** T13
**Arquivos:** `scripts/fetch-recycling-places.ts` (removido), `package.json`

## Checklist

- [x] Removido `scripts/fetch-recycling-places.ts`
- [x] Atualizado `"cli"` em `package.json` para `scripts/recycling-companies/index.ts`
- [x] Grep confirmou que só `package.json` e `prisma/seeds/recycling-companies.ts` referenciavam o caminho antigo em código (o segundo é responsabilidade do T15 — mensagem de erro apontando pro script certo)
- [x] `npm run cli -- --city="Poconé" --state=MT --target=3` confirmado funcionando com o novo caminho
