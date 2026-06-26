/**
 * Fábrica de options compartilhadas para todos os scripts k6.
 *
 * @param {Array<{duration: string, target: number}>} stages - Estágios de carga
 * @param {Object} thresholds - Thresholds específicos do script (mesclados com os padrão)
 * @returns {import('k6/options').Options}
 */
export function makeOptions(stages, thresholds = {}) {
  const prometheusRwUrl = __ENV.K6_PROMETHEUS_RW_SERVER_URL;

  return {
    stages,
    thresholds: {
      http_req_failed: ["rate<0.01"],
      http_req_duration: ["p(95)<2000"],
      ...thresholds,
    },
    ...(prometheusRwUrl
      ? {
          ext: {
            loadimpact: {
              projectID: __ENV.K6_PROJECT_ID || "",
              name: __ENV.K6_TEST_NAME || "oikos-load-test",
            },
          },
        }
      : {}),
  };
}

export const BASE_URL = __ENV.BASE_URL || "http://localhost:3333";
