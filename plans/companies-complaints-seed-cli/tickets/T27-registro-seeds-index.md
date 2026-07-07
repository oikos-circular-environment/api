# T27 — Registro em `prisma/seeds/index.ts`

**Status:** ⬜ Pendente
**Depende de:** T26
**Arquivos:** `prisma/seeds/index.ts`

## Checklist

- [ ] Import de `seedComplaints` de `./complaints.js`
- [ ] Chamada `await seedComplaints(prisma)` adicionada APÓS `await seedRecyclingCompanies(prisma)` (ordem importa: `PREFER_COMPANY` só resolve de verdade se as empresas já existirem no banco)
- [ ] Comentário inline confirmando a dependência de ordem (não é óbvio só lendo os dois arquivos separadamente)
