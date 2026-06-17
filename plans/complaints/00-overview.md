# Epic Brief (Traycer)

## Summary

Hoje o módulo de denúncias (file:src/modules/complaints/) só funciona como um caderno privado: o usuário registra denúncias capturadas ao vivo no celular e consulta apenas as próprias. Isso limita quem pode denunciar (precisa estar no local com o app aberto), permite duplicidade quando várias pessoas reportam o mesmo evento e impede que a comunidade colabore na validação e resolução dos casos. Este Epic transforma o módulo em uma central de denúncias colaborativa: (1) adiciona um caminho **manual** para registrar denúncias a partir de fotos já existentes com endereço informado pelo usuário; (2) refatora o modelo de dados para suportar múltiplas capturas por denúncia e múltiplos anexos por captura; (3) **expõe denúncias publicamente em um mapa** para todos os usuários autenticados, com agrupamento por proximidade pré-calculado; e (4) permite que **qualquer usuário autenticado vote** se uma denúncia foi resolvida (ou não) e submeta sua própria resolução, fechando a denúncia por **quórum** em vez de decisão unilateral do dono. Confiabilidade de perfis e empresas fica fora deste Epic e vira iniciativa separada.

## Context &amp; Problem

**Onde no produto.** Módulo de denúncias do backend Oikos: file:src/modules/complaints/, schema em file:prisma/schema.prisma (`Complaint`, `UserComplaint`, `ComplaintAttachment`) e documentação em file:docs/complaints.md. Consumidor primário é o app mobile (Expo).

**Quem é afetado.**

- **Cidadãos que querem denunciar mas não estavam com o celular no momento** — hoje não têm como, porque o fluxo único depende da câmera nativa em tempo real.
- **Cidadãos navegando pela plataforma** — não enxergam denúncias de terceiros, então acabam reabrindo casos já existentes (duplicidade) e não conseguem contribuir.
- **Donos de denúncias** — atualmente fecham o caso sozinhos com um `PATCH /complaints/:id/resolved`, sem qualquer evidência ou validação por terceiros, o que infla números sem registro plausível.
- **Comunidade e potenciais resolvedores** (órgãos, ONGs, vizinhos) — não têm voz no ciclo de vida da denúncia, mesmo sendo quem efetivamente atua sobre o problema.

**Dores atuais.**

1. **Cobertura limitada de registro.** O caminho automático exige presença física + câmera + app aberto; não acomoda quem só pode reportar depois, a partir de mídia já capturada.
2. **Modelo de dados engessado.** `Complaint` 1:1 com `ComplaintAttachment` e `UserComplaint` apenas como link dono↔denúncia não comportam múltiplas capturas/anexos nem participação de terceiros.
3. **Sem visibilidade pública.** Não há endpoint que retorne denúncias na vizinhança de uma coordenada, então duplicatas são inevitáveis e o ecossistema não pode se auto-organizar.
4. **Resolução sem validação.** Status `RESOLVED` é flag unilateral do dono, sem evidência (descrição, quem resolveu, anexos, nota) e sem qualquer contrapeso da comunidade.
5. **Sem capacidade de processamento assíncrono.** Agrupar denúncias próximas, recalcular quórum de votos ou processar metadados são tarefas que não podem rodar no caminho síncrono das requisições — e hoje não existe fila/worker no projeto.

**Premissas explícitas.**

- Backend-only neste Epic; o mapa interativo do mobile é consumidor, não escopo.
- Compatibilidade de dados preservada: o JSON `geospatial` (location + addresses) continua sendo a fonte primária para o frontend, mesmo com a nova coluna geoespacial sendo introduzida em paralelo.
- Confiabilidade de perfis/empresas, fórum/comentários, plataforma web e selo pago **não** entram aqui.

## Resultado esperado (alto nível)

- Qualquer usuário pode registrar uma denúncia **manual** com múltiplas fotos e endereço informado, além do fluxo automático já existente.
- Qualquer usuário autenticado pode **descobrir denúncias próximas a uma coordenada** no mapa, com denúncias próximas e do mesmo tipo já **agrupadas** pelo backend.
- Qualquer usuário autenticado pode **votar** (resolvido / não resolvido) e **submeter sua própria resolução** estruturada; o status `RESOLVED` é atingido por **quórum ponderado** (dono pesa 2, terceiros pesam 1, positivos ≥ 5 + negativos).
- Autoria das denúncias é **anonimizada** no consumo público.

