# Instrucoes de Testes Automatizados para Agents

Estas instrucoes sao obrigatorias para qualquer agent que implemente ou altere casos de uso neste repositorio.

## Objetivo

Garantir cobertura completa dos fluxos de negocio dos use-cases, com foco em confiabilidade, regressao e validacao de erros esperados.

## Regras Obrigatorias

1. Sempre criar testes unitarios para cada caso de uso.
2. Cada arquivo de teste deve ficar ao lado do arquivo testado e usar o sufixo `.spec.ts`.
3. Para testes unitarios de use-case, sempre usar implementacoes de repositorio em `in-memory`.
4. Em cada teste, cobrir cenarios positivos (sucesso) e negativos (falhas e regras de erro).
5. Validar explicitamente erros esperados (mensagens, tipos de erro e comportamento de retorno).
6. Evitar mocks desnecessarios. Preferir composicao real com repositorios `in-memory`.
7. Sempre importar explicitamente `describe`, `it` e `expect` de `vitest`.
8. Manter um unico `describe` de topo por arquivo de teste e evitar `describe` aninhado.
9. Priorizar asserts exatos (`toBe`, `toStrictEqual`, `toEqual`) para evitar falsos positivos.
10. Antes de escrever os testes, sempre consultar:
   - Fluxo principal do use-case
   - Regras de negocio e validacoes
   - Erros de dominio esperados
   - Contratos dos repositorios e DTOs

## Cobertura e Validacao Final

Ao terminar qualquer implementacao de testes, seguir obrigatoriamente esta ordem de execucao usando os scripts do `package.json`:

```bash
npm run test -- <arquivo-ou-filtro>
npm run test
npm run test:coverage
```

Regras para execucao:

- Primeiro validar o teste isolado (arquivo ou filtro especifico) com `npm run test -- <arquivo-ou-filtro>`.
- Somente apos o teste isolado passar, executar `npm run test` para validar a suite alvo.
- `npm run test:coverage` deve ser executado apenas ao final, como etapa de validacao final e revisao de logica.
- `npm run test:ui` pode ser usado para depuracao, mas nao substitui a execucao final de coverage.

Meta minima:

- Cobrir 100% dos fluxos relevantes do use-case (caminhos de sucesso e erro).
- Usar o relatorio de cobertura como checklist para revisar lacunas de logica.

## Diretriz de Qualidade com Skills

Ao escrever testes, usar as Skills aplicaveis do workspace para elevar qualidade e consistencia:

- `.agents/skills/tests/SKILL.md`
- `.agents/skills/vitest/SKILL.md`
- `.agents/skills/typescript/SKILL.md`

Os testes devem ser claros, deterministas e focados em comportamento observavel.
