# Self-Hosted Infra — Epic Brief

## Resumo

O objetivo é eliminar a dependência do Supabase (storage e banco) para o ambiente local, substituindo-o por uma stack completamente containerizada e auto-hospedada. O banco PostgreSQL e Redis já rodam em containers; agora será adicionado o MinIO como provider S3-compatible e a própria API será containerizada com hot-reload. A seleção de provider de storage passará a ser controlada por variável de ambiente (`STORAGE_PROVIDER`), permitindo que o provider Supabase permaneça no código como alternativa futura sem ser o padrão. Futuramente, a mesma arquitetura de provider facilitará a migração para AWS S3 em produção. O ambiente local será exposto externamente via ngrok, gerenciado fora dos containers.

## Contexto & Problema

**Quem é afetado:** O time de desenvolvimento que depende do Supabase Free Tier para rodar o projeto localmente.

**Onde no produto:** Camada de infraestrutura — storage de arquivos (fotos de perfil, logos de empresas, arquivos de denúncias) e conexão com banco de dados.

**Dor atual:**
- O Supabase Free Tier tem limitações de uso que travam o desenvolvimento local
- A API roda fora de container, dificultando reprodutibilidade e a exposição via ngrok como servidor
- Não há mecanismo de troca de provider — mudar storage exige alteração de código, não de configuração
- O ambiente local não é portável: depende de serviços externos (Supabase) para funcionar

**Resultado esperado:** Com um único `docker compose up`, toda a infraestrutura sobe localmente — API (hot-reload), PostgreSQL, Redis e MinIO — sem nenhuma dependência externa, pronta para ser exposta via ngrok.
