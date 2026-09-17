import 'dotenv/config';

function parseBool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  sieg: {
    // Credenciais do "Cadastro de sistema externo" (clientId/secretKey),
    // usadas para gerar o JWT em /api/v1/create-jwt.
    clientId: process.env.SIEG_CLIENT_ID || '',
    secretKey: process.env.SIEG_SECRET_KEY || '',
    // API Key gerada em Minha Conta >> Integrações API SIEG. Enviada em
    // conjunto com o JWT (header X-Api-Key) em toda chamada.
    apiKey: process.env.SIEG_API_KEY || '',
    baseUrl: process.env.SIEG_API_BASE_URL || 'https://api.sieg.com',
    // A SIEG documenta até 50 XMLs por página, mas pra clientes com bastante
    // volume (ex.: muitas vendas NFCe no período) o tempo que a SIEG leva
    // pra montar o ZIP de 50 documentos de uma vez pode passar do tempo que
    // uma função na Vercel aguenta rodar — reduzimos pra 20 pra cada página
    // ter mais chance de completar dentro do orçamento de tempo (ver
    // painel.js), mesmo que precise de mais páginas no total.
    pageSize: 20,
    // Limite de 2 requisições/minuto por API Key — bem mais restritivo que
    // o /ContarXmls legado. /api/v1/contar-xmls não documenta um limite
    // específico; usamos um valor conservador.
    maxRequestsPerMinuteDownload: 2,
    maxRequestsPerMinuteContagem: 20,
  },
  mockMode: parseBool(process.env.MOCK_MODE, true),
};

export function assertSiegConfigured() {
  if (config.mockMode) return;
  const faltando = ['clientId', 'secretKey', 'apiKey'].filter((campo) => !config.sieg[campo]);
  if (faltando.length) {
    throw new Error(
      `Configuração da SIEG incompleta (faltando: ${faltando.join(', ')}). ` +
        'Defina SIEG_CLIENT_ID, SIEG_SECRET_KEY e SIEG_API_KEY no .env, ou ative MOCK_MODE=true.'
    );
  }
}
