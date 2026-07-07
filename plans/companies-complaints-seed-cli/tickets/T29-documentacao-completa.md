# T29 — Documentação completa do CLI

**Status:** ⬜ Pendente
**Depende de:** T4, T23, T26 (comportamento final implementado e testado manualmente)
**Arquivos:** `api/docs/seed-cli.md`

## Checklist

- [ ] Substitui o placeholder de T4 por conteúdo completo: nova estrutura de pastas (`shared/`/`companies/`/`complaints/`/`assets/`), tabela completa de flags (`--city`, `--state`, `--residents`, `--companies`, `--complaints`, `--force`, `--output-dir`) — sem flags de dataset, deixar claro que a quantidade `0` é a forma de desligar um tipo
- [ ] Documenta o fluxo interativo completo: os três prompts de quantidade (moradores/empresas/denúncias) em sequência, sem seletor de dataset
- [ ] Exemplo de execução completa: `npx tsx cli/index.ts --city="Rondonópolis" --state=MT --residents=15 --companies=20 --complaints=30`; exemplo de execução parcial reaproveitando moradores/empresas existentes: `npx tsx cli/index.ts --city="Rondonópolis" --state=MT --companies=0 --complaints=50`
- [ ] Nota destacada (bloco de aviso) sobre a dependência de `docker compose up minio createbuckets` rodando ANTES de `npm run seed` para que o upload real de anexos de denúncia complete com sucesso
- [ ] Explica em uma frase o conceito de "morador da cidade" (`CityResidentSeed`) e por que empresas e denúncias compartilham o mesmo pool
- [ ] Revisão final: nenhum caminho antigo (`scripts/recycling-companies/`) remanescente no documento
