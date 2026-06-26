import http from "k6/http";
import { check } from "k6";

/**
 * Autentica um usuário e retorna o token de acesso JWT.
 * Usar no setup() do script para evitar autenticar a cada iteração.
 *
 * @param {string} baseUrl
 * @param {string} email
 * @param {string} password
 * @returns {string} token JWT
 */
export function getToken(baseUrl, email, password) {
  const res = http.post(
    `${baseUrl}/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(res, { "login: status 200": (r) => r.status === 200 });

  if (res.status !== 200) {
    throw new Error(
      `Login falhou (${res.status}): verifique TEST_USER_EMAIL e TEST_USER_PASSWORD`
    );
  }

  return res.json("token");
}

/**
 * Retorna os headers padrão para requisições autenticadas.
 */
export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}
