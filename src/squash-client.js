const axios = require('axios');
const https = require('https');

const client = axios.create({
  baseURL: process.env.SQUASH_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.SQUASH_TOKEN}`,
    'Content-Type': 'application/json',
  },
  // Accepte les certificats auto-signés sur le réseau interne
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 10000,
});

/**
 * Récupère les exécutions en FAILURE modifiées depuis `sinceIso`.
 * Endpoint Squash TM 11 : GET /api/executions
 * Si l'endpoint ne correspond pas, vérifier dans /squash/swagger-ui.html
 */
async function getRecentFailures(sinceIso) {
  const response = await client.get('/api/executions', {
    params: {
      executionStatus: 'FAILURE',
      lastModifiedAfter: sinceIso,
      _pageSize: 100,
    },
  });

  // Squash TM répond soit { _embedded: { executions: [...] } } soit directement []
  return response.data?._embedded?.executions ?? response.data ?? [];
}

module.exports = { getRecentFailures };
