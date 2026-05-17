# Suporte a Refresh Token para Mobile (sem cookies)

## Contexto

A API usa cookies HTTP-only para o refresh token, o que funciona em browsers mas não em apps mobile (iOS/Android). Clientes mobile armazenam tokens em Keychain/Keystore e os enviam via request body. Esta mudança unifica o suporte para web e mobile sem endpoints separados.

## Contrato das rotas

### `POST /v1/auth/login`

**Request**
```json
{ "email": "user@example.com", "password": "123456" }
```

**Response `200`**
```json
{
  "token": "<access_token>",        // expira em 1 dia
  "refreshToken": "<refresh_token>" // expira em 7 dias
}
```

Cookie `refreshToken` também é setado automaticamente para clientes web (httpOnly, secure, sameSite=strict).

---

### `PATCH /v1/auth/refresh`

**Comportamento**: aceita o refresh token de **duas formas** — body (mobile) ou cookie (web). O body tem precedência.

#### Mobile — token no body
```json
{ "refreshToken": "<refresh_token>" }
```

#### Web — sem body, cookie enviado automaticamente
```json
{}
```
ou sem body.

**Response `200`** (igual para ambos os casos)
```json
{
  "token": "<novo_access_token>",        // expira em 1 dia
  "refreshToken": "<novo_refresh_token>" // expira em 7 dias (rotacionado)
}
```

O cookie `refreshToken` também é **rotacionado** na response (novo valor).

**Response `401`** — token inválido, expirado ou usuário não encontrado
```json
{ "message": "Invalid or expired refresh token", "code": "UNAUTHORIZED", "statusCode": 401 }
```

---

## Integração mobile (Flutter/Swift/Kotlin)

1. No login, salvar `refreshToken` em **Keychain** (iOS) ou **EncryptedSharedPreferences / Keystore** (Android).
2. Usar `token` (access token) em todas as requisições autenticadas: `Authorization: Bearer <token>`.
3. Quando receber `401` em qualquer rota protegida, chamar `PATCH /v1/auth/refresh` com `{ "refreshToken": "<valor_salvo>" }`.
4. Salvar o **novo** `refreshToken` retornado (token rotation — o anterior é descartado).
5. Repetir a requisição original com o novo `token`.

---

## Decisões de design

| Decisão | Razão |
|---------|-------|
| Body tem precedência sobre cookie | Token no body é ação explícita; cookie é implícito |
| Token rotation a cada refresh | Token roubado só pode ser usado uma vez |
| Response inclui `refreshToken` no body | Mobile não lê cookies; web pode ignorar o campo extra |
| Endpoint único para web e mobile | Evita duplicação e mantém contrato consistente |

---

## Casos de borda

| Cenário | Comportamento |
|---------|--------------|
| Body com token, sem cookie | Body verificado, sucesso |
| Cookie presente, body ausente | Cookie verificado, sucesso |
| Body e cookie presentes | Body vence |
| Nenhum dos dois | `401 UNAUTHORIZED` |
| Token expirado | `401 UNAUTHORIZED` |
| Usuário deletado após emissão | `401 UNAUTHORIZED` |
