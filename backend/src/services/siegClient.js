import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, assertSiegConfigured } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'data', 'fixtures');

// Códigos de XmlType documentados pela SIEG.
export const XmlType = {
  NFE: 1,
  CTE: 2,
  NFSE: 3,
  NFCE: 4,
  CFE: 5,
};

// Controle simples de janela deslizante para respeitar o limite de
// 30 requisições/minuto imposto pela SIEG (evita bloqueio/HTTP 429).
const requestTimestamps = [];
async function throttle() {
  const windowMs = 60_000;
  const now = Date.now();
  while (requestTimestamps.length && now - requestTimestamps[0] > windowMs) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= config.sieg.maxRequestsPerMinute) {
    const waitMs = windowMs - (now - requestTimestamps[0]) + 50;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return throttle();
  }
  requestTimestamps.push(Date.now());
}

/**
 * Busca uma página de XMLs na SIEG. Retorna a lista de XMLs já
 * decodificados de base64 para string, e um flag indicando se pode
 * haver mais páginas (heurística: página cheia == provavelmente há mais).
 */
async function fetchPage({ xmlType, dataEmissaoInicio, dataEmissaoFim, cnpjEmit, cnpjDest, take, skip }) {
  await throttle();

  const url = `${config.sieg.baseUrl}/BaixarXmls?api_key=${encodeURIComponent(config.sieg.apiKey)}`;
  const body = {
    XmlType: xmlType,
    Take: take,
    Skip: skip,
    DataEmissaoInicio: dataEmissaoInicio,
    DataEmissaoFim: dataEmissaoFim,
    Downloadevent: false,
  };
  if (cnpjEmit) body.CnpjEmit = cnpjEmit;
  if (cnpjDest) body.CnpjDest = cnpjDest;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SIEG API respondeu ${response.status}: ${text || response.statusText}`);
  }

  const payload = await response.json();

  // A API retorna um array de strings em base64. Alguns tenants/erros
  // retornam um objeto { Status, Message } — tratamos os dois formatos.
  if (!Array.isArray(payload)) {
    if (payload?.Status && payload.Status !== 200 && payload.Status !== 'success') {
      throw new Error(`SIEG API erro: ${payload.Message || JSON.stringify(payload)}`);
    }
    return [];
  }

  return payload.map((base64Xml) => Buffer.from(base64Xml, 'base64').toString('utf-8'));
}

/**
 * Busca todos os XMLs de um período/CNPJ, paginando automaticamente até
 * a SIEG retornar uma página incompleta (fim dos resultados).
 */
export async function fetchAllXmls({ xmlType, dataEmissaoInicio, dataEmissaoFim, cnpjEmit, cnpjDest, maxPages = 40 }) {
  assertSiegConfigured();

  if (config.mockMode) {
    return loadFixtureXmls();
  }

  const take = config.sieg.pageSize;
  const allXmls = [];
  let skip = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const xmls = await fetchPage({ xmlType, dataEmissaoInicio, dataEmissaoFim, cnpjEmit, cnpjDest, take, skip });
    allXmls.push(...xmls);
    if (xmls.length < take) break;
    skip += take;
  }

  return allXmls;
}

async function loadFixtureXmls() {
  const files = await readdir(FIXTURES_DIR);
  const xmlFiles = files.filter((f) => f.endsWith('.xml'));
  const contents = await Promise.all(xmlFiles.map((f) => readFile(path.join(FIXTURES_DIR, f), 'utf-8')));
  return contents;
}
