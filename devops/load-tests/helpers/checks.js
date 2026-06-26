import { check } from "k6";
import { Counter } from "k6/metrics";

export const rateLimitedRequests = new Counter("rate_limited_requests");

/**
 * Verifica status 200. Registra 429s separadamente (não como erro).
 */
export function checkOk(res, name) {
  if (res.status === 429) {
    rateLimitedRequests.add(1);
    return true;
  }
  return check(res, {
    [`${name}: status 200`]: (r) => r.status === 200,
  });
}

/**
 * Verifica status 201.
 */
export function checkCreated(res, name) {
  return check(res, {
    [`${name}: status 201`]: (r) => r.status === 201,
  });
}

/**
 * Verifica status 204.
 */
export function checkNoContent(res, name) {
  return check(res, {
    [`${name}: status 204`]: (r) => r.status === 204,
  });
}
