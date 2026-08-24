import 'dotenv/config';

function parseBool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  sieg: {
    apiKey: process.env.SIEG_API_KEY || '',
    baseUrl: process.env.SIEG_API_BASE_URL || 'https://api.sieg.com',
    // Documentado pela SIEG: no máximo 50 XMLs por página e 30 requisições/minuto.
    pageSize: 50,
    maxRequestsPerMinute: 30,
  },
  mockMode: parseBool(process.env.MOCK_MODE, true),
};

export function assertSiegConfigured() {
  if (!config.mockMode && !config.sieg.apiKey) {
    throw new Error(
      'SIEG_API_KEY não configurada. Defina no .env ou ative MOCK_MODE=true para usar dados de exemplo.'
    );
  }
}
