# API Key Methodology

## Problema: valor fixo

Uma API key sozinha é um **segredo compartilhado** — quem a tem, pode usá-la.

```
GET /api/resource
x-api-key: minha-chave-secreta-fixa
```

Vulnerabilidades:
- Interceptação em HTTP
- Logs de servidor expostos
- Chave vazada em repositório, nunca expira
- Replay attack: capturou a request, pode reenviá-la depois

---

## Estratégias de mitigação

### 1. HTTPS obrigatório

Pré-requisito. Sem HTTPS qualquer outra estratégia falha.

---

### 2. Hash da chave no banco

Nunca armazenar plain text. Banco armazena o hash; cliente recebe a chave original uma única vez.

```typescript
// Geração
const rawKey = crypto.randomBytes(32).toString('hex') // "sk_live_abc123..."
const hashedKey = await bcrypt.hash(rawKey, 12)

// Validação
const isValid = await bcrypt.compare(incomingKey, storedHash)
```

Padrão usado por Stripe, GitHub, etc. — prefixo visível (`sk_live_`, `ghp_`) + hash do restante.

---

### 3. HMAC Request Signing

A **chave nunca é enviada**. Ela é usada para assinar a requisição, eliminando replay attacks.

```
// Headers enviados:
x-api-key-id: key_abc        ← identifica qual chave
x-timestamp: 1716734400      ← unix timestamp
x-signature: sha256=...      ← assinatura HMAC
```

```typescript
// Server valida:
function validateHmac(req) {
  const { keyId, timestamp, signature } = extractHeaders(req)

  // Rejeita requests antigas (janela de 5 min)
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
    throw new Error('Request expired')
  }

  const secret = await getSecretByKeyId(keyId)

  const bodyHash = crypto.createHash('sha256').update(req.body).digest('hex')
  const payload = `${req.method}${req.path}${timestamp}${bodyHash}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  // Comparação em tempo constante (evita timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  )
}
```

---

### 4. Nonce (complemento ao timestamp)

Garante que cada request só possa ser usada uma vez.

```typescript
const nonce = req.headers['x-nonce']
const exists = await redis.exists(`nonce:${nonce}`)
if (exists) throw new Error('Replay attack detected')
await redis.setex(`nonce:${nonce}`, 300, '1') // TTL = janela de validade
```

---

### 5. Escopos e rate limiting

```typescript
{
  keyId: "key_abc",
  scopes: ["market:read", "orders:write"],
  rateLimit: { requests: 1000, window: '1h' },
  allowedIps: ["10.0.0.0/24"],  // opcional
  expiresAt: "2027-01-01"
}
```

---

## Comparação

| Estratégia          | Protege contra          | Complexidade |
|---------------------|-------------------------|--------------|
| HTTPS + chave fixa  | Sniffing básico         | Baixa        |
| Hash no banco       | Vazamento de DB         | Baixa        |
| Timestamp + HMAC    | Replay attack           | Média        |
| Nonce               | Replay preciso          | Média        |
| IP whitelist        | Uso não autorizado      | Baixa        |
| Scopes + rate limit | Abuso pós-comprometimento | Média      |

---

## Referência de mercado

- **AWS Signature V4** — HMAC com timestamp + nonce, padrão mais robusto
- **Stripe** — prefixo identificável (`sk_live_`) + hash, sem HMAC (compensa com HTTPS estrito + revogação rápida)
- **GitHub** — prefixo `ghp_` + hash BCrypt + escopos

---

## Recomendação para APIs internas/B2B

**HTTPS + hash no banco + timestamp HMAC + escopos** — modelo sólido sem over-engineering.
