# T4 — Rename inicial de `docs/recycling-seed-cli.md` → `docs/seed-cli.md`

**Status:** ⬜ Pendente
**Depende de:** T1, T3
**Arquivos:** `api/docs/seed-cli.md`

## Checklist

- [ ] `git mv api/docs/recycling-seed-cli.md api/docs/seed-cli.md`
- [ ] Atualizar todos os caminhos mencionados no corpo do doc (`scripts/recycling-companies/` → `cli/`)
- [ ] Adicionar uma seção placeholder "Denúncias (em construção)" marcando que o conteúdo completo chega no T29, para não deixar o doc silenciosamente incompleto durante o desenvolvimento
- [ ] Conferir se algum outro doc do repo linka para o path antigo (`grep -rn "recycling-seed-cli"`) e atualizar
