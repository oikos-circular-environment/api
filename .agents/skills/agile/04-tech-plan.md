# Tech Plan (Plano Técnico)

## Processo Interativo Obrigatório

Esta fase exige colaboração passo a passo. Não pule a clarificação por eficiência.

## Papel

Arquiteto técnico que considera o quadro completo do sistema.

**Foco em:**
- Ver cada componente no contexto de todo o sistema
- Fundamentar recomendações no codebase real, não em suposições genéricas
- Começar simples com um caminho claro para escala
- Deixar as jornadas do usuário informar as escolhas técnicas
- Projetar para mudança e adaptação — os requisitos irão evoluir
- Deixar os requisitos de dados moldar a arquitetura
- Rastrear requisições de ponta a ponta pelo design proposto
- Considerar modos de falha — o que quebra, o que se recupera
- Equilibrar ideais técnicos com restrições práticas

## Filosofia Central

O objetivo é alinhamento, não artefatos.

- Perguntas são investimentos em correção, não sobrecarga
- Surfacear suposições cedo é barato; consertar artefatos errados é caro
- Múltiplas rodadas de clarificação são normais e encorajadas

Antes de rascunhar qualquer artefato:
1. Surface suas suposições-chave
2. Continue usando perguntas de entrevista até estar genuinamente confiante
3. Só rascunhe quando você e o usuário tiverem entendimento compartilhado

## Processamento da Solicitação

1. Internalize o problema a partir do epic brief e core flows. Entenda o que estamos resolvendo e por quê.

2. Analise o codebase existente minuciosamente — padrões de arquitetura, restrições técnicas, pontos de integração. Fundamente todas as recomendações no que você realmente observa, não em suposições sobre como os sistemas geralmente funcionam.

3. Pense no design de alto nível antes de clarificar com o usuário.

   Pense minuciosamente em seu modelo mental:
   - Rastreie uma requisição pelo design proposto de ponta a ponta
   - Mude um requisito — o que isso causa no design?
   - Injete falhas em cada ponto — o que quebra, o que se recupera?

4. Surface suposições e use perguntas de entrevista para alinhar na abordagem. Apresente sua direção proposta, suposições-chave e qualquer coisa que surfaceu durante o passo 3. Alinhe na abordagem geral antes de mergulhar nas seções.

5. Para cada seção, alcance alinhamento por meio de perguntas de entrevista antes de documentar.

   Trabalhe pelas seções uma de cada vez (Abordagem Arquitetural → Modelo de Dados → Arquitetura de Componentes):

   - **Pense:** Rastreie as implicações desta seção. Quais são as decisões-chave? O que tem consequências não óbvias? O que você está incerto?
   - **Entreviste:** Surface decisões-chave e incertezas ao usuário como perguntas de entrevista. Itere até ter entendimento compartilhado.
   - **Documente:** Escreva a seção só após alinhamento. O spec captura decisões tomadas, não deliberação em andamento.

   Complete cada seção (pense → clarifique → documente) antes de mover para a próxima.

## Template do Tech Plan

### Abordagem Arquitetural

Defina as decisões-chave e restrições que moldam o design:

1. Identifique as principais escolhas arquiteturais (padrões, paradigmas, tecnologias)
2. Explique trade-offs e racional para cada decisão
3. Surface restrições (técnicas, de negócio ou regulatórias) que limitam a solução
4. Mantenha abaixo de 100 linhas.

### Modelo de Dados

Defina novos modelos de dados e como se integram com o schema existente:

1. Identifique novas entidades necessárias para a feature
2. Defina relacionamentos com modelos de dados existentes
3. Planeje mudanças no schema do banco (adições, modificações)
4. Mantenha abaixo de 100 linhas.

### Arquitetura de Componentes

Defina novos componentes e sua integração com a arquitetura existente:

1. Identifique novos componentes necessários
2. Defina interfaces com componentes existentes
3. Estabeleça limites e responsabilidades claras
4. Planeje pontos de integração e fluxo de dados
5. Sem estrutura de repositório de código
6. Sem detalhes de implementação de lógica de negócio

**Nota:** Mantenha o tech plan estruturado e legível. Snippets de código apenas para schemas e interfaces. NÃO inclua snippets de código para lógica de negócio ou detalhes de implementação.

**Nota:** Rascunhe apenas estas 3 seções. NÃO rascunhe outras seções.

## Critérios de Aceitação

- A abordagem arquitetural está alinhada com o usuário, com todas as suposições clarificadas
- Decisões e trade-offs chave foram capturados com alinhamento do usuário
- O usuário confirma a direção técnica

## Próximas Fases Sugeridas

- `shared/arch-validate.md` — Stress-test da arquitetura
- `shared/revise.md` — Se os requisitos precisarem ser revisados
- `shared/tickets.md` — Ticket breakdown
