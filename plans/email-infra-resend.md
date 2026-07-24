# Infra de e-mail transacional (Resend) — devops#72

## Contexto

`devops#72` é pré-requisito de infra do épico **E04 (api#65)** — e-mail transacional real —, que por sua vez destrava a recuperação de senha do rework de auth (`api#8`). Enquanto ela não fecha, o `EmailProvider` da API roda com o **fake de console** (E03.1 / api#74) e nenhum e-mail sai de verdade.

O objetivo é deixar o domínio `oikos.company` capaz de **enviar** e-mail transacional pelo Resend sem quebrar o **recebimento** já operante pelo iCloud+, e sem furar a política DMARC `p=reject` que hoje protege o domínio contra spoofing.

## Status: em execução

## Issues

| Issue | Papel |
|---|---|
| **devops#72** | Guarda-chuva — não executa trabalho, só vincula os descendentes. Filha de api#8. |
| **devops#78** | Publicar os registros na Cloudflare, verificar o domínio e gerar a API key. P1. |
| **api#79** | Monitoramento DMARC (`rua`) — escolher serviço e publicar o destino dos relatórios. P2, posterior. |
| **api#65 (E04)** | `ResendEmailProvider`, templates e verificação de e-mail obrigatória. Bloqueado por devops#72. |

## Estado atual (verificado)

DNS consultado no autoritativo (`dig @1.1.1.1`) — não há CLI da Cloudflare instalada na máquina, só o `cloudflared` (túnel):

| Registro | Valor | Situação |
|---|---|---|
| NS `@` | `katja/todd.ns.cloudflare.com` | zona na Cloudflare |
| MX `@` | `10 mx01/mx02.mail.icloud.com` | iCloud inbound, operante |
| TXT `@` | `apple-domain=SSvA9CWe5vFN1cSg` | verificação Apple |
| TXT `@` | `v=spf1 include:icloud.com ~all` | SPF só do iCloud |
| CNAME `sig1._domainkey` | `sig1.dkim.oikos.company.at.icloudmailadmin.com` | DKIM iCloud |
| TXT `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` | alinhamento estrito |

Caixas existentes no iCloud+ (limite de 3, esgotado): `christian.cesar@`, `suporte@`, `no-reply@`.

**Domínio criado no Resend** (via MCP):

- Nome `mail.oikos.company` · ID `928c5d3b-9fa3-48e7-8e9a-ac9498a9a644`
- Região `sa-east-1` (imutável) · open/click tracking **desligados**
- Status `verified` — os 3 registros (DKIM, SPF/MX, SPF/TXT) confirmados via `get-domain` (MCP).

**Registros publicados na Cloudflare** via `cf` CLI (OAuth, zone ID `5111c188dcc303817ec4d9281d6f6281`) — não foi usado o token em `devops/cloudflare/.env.cloudflare` (bloqueado por Client IP Address Filtering nesta sessão):

| Tipo | Nome | Record ID |
|---|---|---|
| TXT | `resend._domainkey.mail.oikos.company` | `e29348afaeeb49e6a7c8d4944336d132` |
| MX | `send.mail.oikos.company` | `850b78cb559480ce9401b359880ac04a` |
| TXT | `send.mail.oikos.company` | `406af802bcb554c6703f29aa0d6b3f4f` |

Confirmado por `dig @1.1.1.1`: os 3 resolvem com os valores esperados; `MX oikos.company` continua `mx01/mx02.mail.icloud.com` (iCloud intacto).

**API key criada no Resend** (via MCP): `oikos-api-transactional` · ID `7577d14d-7244-4926-b09b-b13e647ef805` · permissão `sending_access` restrita a `mail.oikos.company`. Gravada em:
- `api/.env` (local, gitignored) como `RESEND_API_KEY`.
- Secret `RESEND_API_KEY` no GitHub Environment `api-production` do repo `devops`.

Nenhum código consome essa variável ainda — fica pronta para quando `api#65` implementar o `ResendEmailProvider`. **Nada foi codificado em Terraform nesta rodada** — decisão do usuário: a configuração ainda pode mudar, então os registros (tanto os do Resend quanto os do iCloud) ficam fora do Terraform por ora.

## Decisões

1. **Subdomínio `mail.oikos.company`, não o apex.** É a recomendação da própria Resend (isolamento de reputação; problema de e-mail não respinga em serviço crítico do domínio raiz). O nome `mail` foi escolhido em vez de `send` porque a Resend acrescenta o prefixo `send.` para o Return-Path — registrar `send.oikos.company` produziria `send.send.oikos.company`.
2. **Região `sa-east-1`** — público brasileiro.
3. **Tracking desligado** (`openTracking: false`, `clickTracking: false`). Elimina o CNAME `links.*` e evita reescrita de URL em e-mail de reset de senha, onde link rewriting é ponto de falha extra.
4. **O DMARC estrito não é bloqueante nesta arquitetura.** Com From `no-reply@mail.oikos.company`, o DKIM assina com `d=mail.oikos.company` — idêntico ao domínio do From, portanto alinhado **mesmo no modo estrito atual**. O registro `_dmarc` pode ficar como está; o e-mail passa via DKIM. (O `adkim=s; aspf=s` seria bloqueante se tivéssemos verificado o apex, porque aí o Return-Path `send.oikos.company` não alinharia com o From `@oikos.company`.)
5. **Ajuste do `_dmarc` fica como melhoria posterior**, não pré-requisito — ver abaixo.
6. **Monitoramento DMARC vira issue própria (api#79)**, não pré-requisito. O limite de 3 endereços do iCloud+ está esgotado, mas isso não é obstáculo: a própria Resend recebe e-mail (`capabilities.receiving`), então dá para receber em `dmarc@mail.oikos.company` sem gastar slot. Como `mail.oikos.company` está no mesmo domínio organizacional de `oikos.company`, **não** é preciso o registro de autorização `_report._dmarc` que o DMARC exige quando o `rua` aponta para domínio de terceiro — motivo pelo qual apontar `rua` direto para um Gmail **não funciona**. Opções levantadas:
   - [resend/resend-dmarc-analyzer](https://github.com/resend/resend-dmarc-analyzer) — self-hosted, open source, tudo num vendor só.
   - [dmarcian](https://dmarcian.com/) e [Postmark DMARC](https://dmarc.postmarkapp.com/) — SaaS, digest pronto, zero código.
   - [Google Postmaster Tools](https://postmaster.google.com) — **complementar, não substituto**: mostra reputação e autenticação do tráfego que chega ao Gmail, mas não consome relatórios `rua` nem cobre outros provedores.

## Registros a publicar na Cloudflare

Exatamente o que a API do Resend devolveu. **Todos com proxy desligado (nuvem cinza)** — proxy quebra a verificação.

| Tipo | Nome | Valor | Prioridade |
|---|---|---|---|
| TXT | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4MhtQnHZlKrXSoWVzI11dicB4UUKWOELT0yP6bt/PNWac52mbqYCVKRjIc2kVBNfBfKA/GO8d1rk3G6kUevXc/NL+Be6n5X9WkKur84OxSY0SBrO3cWW34gyldChoEPXfs8LV6kNBlVdggAZbmPOHW3k5H4gE453n/ZUe6IjE0QIDAQAB` | — |
| MX | `send.mail` | `feedback-smtp.sa-east-1.amazonses.com` | 10 |
| TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` | — |

Nenhum toca o apex → o MX do iCloud fica intacto, e o seletor DKIM `resend` não colide com o `sig1` do iCloud.

## Passos restantes (devops#78) — concluído

- [x] Publicar os 3 registros na Cloudflare, proxy off.
- [x] Disparar `verify-domain` (MCP) — `get-domain` confirma `status: verified`.
- [x] Gerar API key no Resend com permissão de envio, restrita a `mail.oikos.company`. Guardada como secret: `RESEND_API_KEY` no `.env` local da API e no GitHub Environment `api-production` do repo `devops`.
- [x] Envio de teste para `delivered@resend.dev` e para uma caixa real — header confirmado com `spf=pass`, `dkim=pass`, `dmarc=pass`.
- [~] Codificação em Terraform **adiada por decisão do usuário** — a configuração de e-mail ainda pode mudar; registros do Resend e do iCloud ficam fora do Terraform por ora.

`devops#78` fechada. Seguem abertas: `api#79` (monitoramento DMARC, P2) e `api#65`/E04 (`ResendEmailProvider`), que já pode iniciar — o pré-requisito de infra está pronto.

## Melhorias recomendadas (não bloqueantes)

- **`_dmarc` → `v=DMARC1; p=reject; sp=reject; rua=mailto:<endereço do analisador>`.** Relaxed é o padrão do DMARC, então basta omitir `adkim`/`aspf`. Isso **não** enfraquece o anti-spoofing: quem bloqueia terceiros é o `p=reject` somado ao fato de o atacante não conseguir nem assinatura DKIM válida nem host autorizado no SPF. O alinhamento relaxed apenas passa a aceitar `send.mail.oikos.company` (que é nosso) como alinhado, dando ao SPF o papel de **segunda via** — hoje, se um encaminhamento quebrar a assinatura DKIM, o e-mail é rejeitado sem plano B.
- **`Reply-To: suporte@oikos.company`** nos envios com From `no-reply@`, para resposta de usuário não morrer numa caixa que ninguém abre.
- **Warm-up**: domínio novo começa com teto baixo (~150 e-mails no dia 1). Sem impacto no volume transacional atual, mas vale saber antes de qualquer disparo em massa.

## Verificação

```bash
dig +short TXT resend._domainkey.mail.oikos.company @1.1.1.1
dig +short MX  send.mail.oikos.company @1.1.1.1
dig +short TXT send.mail.oikos.company @1.1.1.1

# o inbound do iCloud tem que continuar intacto:
dig +short MX oikos.company @1.1.1.1   # -> mx01/mx02.mail.icloud.com
```

- `get-domain` (MCP) devolve `status: verified`.
- Envio de teste chega com `spf=pass`, `dkim=pass`, `dmarc=pass` no header.
- Recebimento pelo iCloud segue funcionando nas 3 caixas.
- `terraform plan` sem drift depois dos `import`.

## Fora de escopo

Implementação do `ResendEmailProvider`, verificação de e-mail obrigatória e troca do fake de console — tudo isso é **E04 / api#65**, no repo `api`.
