# Gerador de Empresas de Reciclagem Multi-Cidade — Índice de Tickets

Cada ticket é um arquivo próprio em `tickets/`, com checklist de execução. Marcar `[x]` no arquivo do ticket conforme concluído. Ver `02-execution-plan.md` para o grafo de dependências completo.

| Ticket | Título | Status |
|---|---|---|
| [T1](tickets/T01-entidades-tipos-dominio.md) | Entidades e tipos de domínio | ✅ Concluído |
| [T2](tickets/T02-providers-dados-externos.md) | Providers de dados externos | ✅ Concluído |
| [T3](tickets/T03-arquivos-http-inspecao-manual.md) | Arquivos `.http` de inspeção manual | ✅ Concluído |
| [T4](tickets/T04-parsers-endereco-horario.md) | Parsers de endereço e horário | ✅ Concluído |
| [T5](tickets/T05-classificador-tipo-empresa.md) | Classificador de tipo de empresa | ✅ Concluído |
| [T6](tickets/T06-gerador-identidade-valida.md) | Gerador de identidade válida (CPF/CNPJ) | ✅ Concluído |
| [T7](tickets/T07-gerador-residuos-servicos.md) | Gerador de resíduos/serviços variados | ✅ Concluído |
| [T8](tickets/T08-preenchimento-lacunas-gap-filler.md) | Preenchimento de lacunas (gap-filler) | ✅ Concluído |
| [T9](tickets/T09-mapper-empresa-seed.md) | Mapper de empresa real → seed | ✅ Concluído |
| [T10](tickets/T10-gerador-empresa-sintetica.md) | Gerador de empresa sintética | ✅ Concluído |
| [T11](tickets/T11-writer-seed-json.md) | Writer de seed (interface + JSON) | ✅ Concluído |
| [T12](tickets/T12-use-cases-resolucao-busca.md) | Use-cases de resolução/busca | ✅ Concluído |
| [T13](tickets/T13-use-case-orquestrador-cli.md) | Use-case orquestrador + CLI | ✅ Concluído |
| [T14](tickets/T14-substituicao-script-antigo-package-json.md) | Substituição do script antigo + package.json | ✅ Concluído |
| [T15](tickets/T15-fix-bug-consumidor-seed.md) | Fix do bug no consumidor de seed | ✅ Concluído |
| [T16](tickets/T16-migracao-dataset-legado.md) | Migração do dataset legado | ✅ Concluído |
| [T17](tickets/T17-teste-unitario-pipeline-completo.md) | Teste unitário de ponta a ponta (pipeline completo) | ✅ Concluído |
| [T18](tickets/T18-provider-ibge-estados.md) | Provider IBGE estados (fetchUfs) | ✅ Concluído |
| [T19](tickets/T19-modulo-prompts-clack.md) | Módulo de prompts interativos (Clack) | ✅ Concluído |
| [T20](tickets/T20-refatoracao-use-case-fases.md) | Refatorar GenerateCitySeedUseCase em fases granulares | ✅ Concluído |
| [T21](tickets/T21-cli-hibrido-listr2.md) | CLI reestruturado (flags híbridas + Listr2) | ✅ Concluído |
| [T22](tickets/T22-documentacao-cli.md) | Documentação da CLI | ✅ Concluído |
| [T23](tickets/T23-cache-outputdir-rename.md) | Correção do cache + flag de diretório de saída + rename do comando | ✅ Concluído |
| [T24](tickets/T24-melhorias-consumidor-seed.md) | Melhorias no consumidor de seed (is_company_valid, validação Zod, dry-run) | ✅ Concluído |
