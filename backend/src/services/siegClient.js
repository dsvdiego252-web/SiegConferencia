import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { createClient } from '@supabase/supabase-js';
import { config, assertSiegConfigured } from '../config.js';

// Mesmo padrão usado em painelCache.js/clientsStore.js: sem Supabase
// configurado (dev local), fica indisponível e cai no limitador em memória.
const cacheDisponivel = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const supabase = cacheDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'data', 'fixtures');

// Códigos de TipoXml/XmlType confirmados na documentação real da API
// (integracoes.sieg.com): 1=NFe, 2=CTe, 3=NFSe, 4=NFCe, 5=CFe.
export const XmlType = {
  NFE: 1,
  CTE: 2,
  NFSE: 3,
  NFCE: 4,
  CFE: 5,
};

function criarLimitadorDeTaxa(maxPorMinuto) {
  const timestamps = [];
  // Se `prazoFinal` for informado e a espera necessária ultrapassar esse
  // horário, não espera — devolve false pra quem chamou decidir parar por
  // agora e continuar depois (ver fetchAllXmls), em vez de estourar o tempo
  // de execução da função no meio da espera.
  async function aguardarSlot(prazoFinal) {
    const janelaMs = 60_000;
    const agora = Date.now();
    while (timestamps.length && agora - timestamps[0] > janelaMs) timestamps.shift();
    if (timestamps.length >= maxPorMinuto) {
      const espera = janelaMs - (agora - timestamps[0]) + 200;
      if (prazoFinal && agora + espera > prazoFinal) return false;
      await new Promise((resolve) => setTimeout(resolve, espera));
      return aguardarSlot(prazoFinal);
    }
    timestamps.push(Date.now());
    return true;
  }
  return aguardarSlot;
}

const aguardarSlotDownloadMemoria = criarLimitadorDeTaxa(config.sieg.maxRequestsPerMinuteDownload);
const aguardarSlotContagem = criarLimitadorDeTaxa(config.sieg.maxRequestsPerMinuteContagem);

// Intervalo mínimo entre chamadas de download, derivado do limite real da
// SIEG (2/min) — usado pelo controle persistido abaixo, com uma margem de
// 1s sobre o valor exato (30s) pra não arriscar cair bem em cima do limite.
const INTERVALO_MINIMO_DOWNLOAD_MS = Math.ceil(60_000 / config.sieg.maxRequestsPerMinuteDownload) + 1000;

/**
 * Controla o intervalo entre chamadas a /api/v1/baixar-xmls persistindo a
 * data/hora da última chamada no Supabase, em vez de só na memória do
 * processo. Isso importa porque, na Vercel, cada requisição a /api/painel
 * pode ser atendida por uma instância de função diferente (ou por uma
 * instância "fria" reiniciada) — uma instância nova não tem como saber que
 * outra já fez uma chamada há poucos segundos, e o limitador em memória
 * sozinho deixa passar rajadas que estouram o limite real da SIEG (erro
 * 429), como aconteceu numa busca de alto volume. Sem Supabase configurado
 * (dev local), cai no limitador em memória de sempre — só há um processo.
 *
 * Não é um lock atômico (duas chamadas quase simultâneas podem ambas
 * passar), mas cobre o caso real desta aplicação (uma busca por vez,
 * avançando requisição a requisição).
 */
async function aguardarSlotDownloadPersistente(prazoFinal) {
  if (!cacheDisponivel) return aguardarSlotDownloadMemoria(prazoFinal);

  for (;;) {
    const { data, error } = await supabase
      .from('sieg_rate_limit')
      .select('ultima_chamada')
      .eq('chave', 'baixar_xmls')
      .maybeSingle();
    if (error) throw new Error(`Falha ao ler controle de rate limit da SIEG no Supabase: ${error.message}`);

    const ultima = data?.ultima_chamada ? new Date(data.ultima_chamada).getTime() : 0;
    const agora = Date.now();
    const liberadoEm = ultima + INTERVALO_MINIMO_DOWNLOAD_MS;

    if (agora >= liberadoEm) {
      const { error: erroGravar } = await supabase
        .from('sieg_rate_limit')
        .upsert({ chave: 'baixar_xmls', ultima_chamada: new Date().toISOString() });
      if (erroGravar) throw new Error(`Falha ao gravar controle de rate limit da SIEG no Supabase: ${erroGravar.message}`);
      return true;
    }

    const espera = liberadoEm - agora;
    if (prazoFinal && agora + espera > prazoFinal) return false;
    await new Promise((resolve) => setTimeout(resolve, Math.min(espera, 5000)));
  }
}

// O JWT (gerado a partir de ClientId/SecretKey) vale 24h segundo a
// documentação da SIEG. Cacheamos com uma margem de segurança de 1h para
// não arriscar usar um token vencido no meio de um lote de chamadas.
let jwtCache = { token: null, expiraEm: 0 };

async function obterJwt() {
  const agora = Date.now();
  if (jwtCache.token && agora < jwtCache.expiraEm) return jwtCache.token;

  const response = await fetch(`${config.sieg.baseUrl}/api/v1/create-jwt`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Client-Id': config.sieg.clientId,
      'X-Secret-Key': config.sieg.secretKey,
    },
    body: '',
  });

  if (!response.ok) {
    const texto = await response.text().catch(() => '');
    const erro = new Error(`Falha ao gerar JWT na SIEG (${response.status}): ${texto || response.statusText}`);
    erro.transitorio = STATUS_TRANSITORIOS.includes(response.status);
    throw erro;
  }

  const token = await response.json(); // a API devolve o token como uma string JSON, ex: "eyJhbGciOi..."
  jwtCache = { token, expiraEm: agora + 23 * 60 * 60 * 1000 };
  return token;
}

class PrazoExcedidoError extends Error {
  constructor() {
    super('Sem tempo suficiente para aguardar o limite de requisições da SIEG nesta chamada.');
    this.prazoExcedido = true;
  }
}

async function chamarApiV1(caminho, body, aguardarSlot, prazoFinal) {
  const conseguiuSlot = await aguardarSlot(prazoFinal);
  if (!conseguiuSlot) throw new PrazoExcedidoError();

  const jwt = await obterJwt();

  // A própria chamada HTTP à SIEG (não a espera do rate limit) também pode
  // demorar — um cliente com muitas notas no período faz a SIEG levar mais
  // tempo pra montar o ZIP de uma página. Sem um limite aqui, uma chamada
  // lenta sozinha pode estourar o tempo de execução da função mesmo já
  // tendo passado pela checagem de rate limit. Aborta com folga antes do
  // prazo final desta requisição, devolvendo o mesmo sinal de "sem tempo"
  // pra tentar de novo (mesma página) na próxima chamada.
  const controller = new AbortController();
  let timeoutId;
  if (prazoFinal) {
    const restante = prazoFinal - Date.now() - 1000;
    if (restante <= 0) throw new PrazoExcedidoError();
    timeoutId = setTimeout(() => controller.abort(), restante);
  }

  try {
    return await fetch(`${config.sieg.baseUrl}${caminho}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        'X-Api-Key': config.sieg.apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new PrazoExcedidoError();
    // Falha de rede na própria chamada (não uma resposta de erro da SIEG) —
    // normalmente uma instabilidade passageira, vale tentar de novo.
    err.transitorio = true;
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// Códigos de erro tratados como temporários — quem chamou pode tentar de
// novo (na próxima página/próxima chamada) em vez de encerrar a busca
// inteira. 429 é o que motivou isso: mesmo com o controle de intervalo
// entre chamadas, uma rajada real ainda pode esbarrar no limite da SIEG.
const STATUS_TRANSITORIOS = [408, 425, 429, 500, 502, 503, 504];

/**
 * Conta quantos XMLs de cada tipo existem para o filtro informado.
 * Útil para saber se vale a pena chamar o download, e para diagnóstico.
 * Limite da SIEG: intervalo de datas de até 3 meses.
 */
export async function contarXmls({ dataEmissaoInicio, dataEmissaoFim, cnpjEmit, cnpjDest }) {
  assertSiegConfigured();

  const body = { DataEmissaoInicio: dataEmissaoInicio, DataEmissaoFim: dataEmissaoFim };
  if (cnpjEmit) body.CnpjEmit = cnpjEmit;
  if (cnpjDest) body.CnpjDest = cnpjDest;

  const response = await chamarApiV1('/api/v1/contar-xmls', body, aguardarSlotContagem);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.IsFailure) {
    throw new Error(`SIEG contar-xmls falhou: ${payload.ErrorMessage || response.status}`);
  }
  return payload.Data;
}

/**
 * Busca uma página de XMLs (até 50) na SIEG. A resposta é um arquivo ZIP
 * binário contendo um .xml por documento — não mais um array de base64
 * como a documentação pública antiga descrevia.
 */
async function fetchPage({ xmlType, dataEmissaoInicio, dataEmissaoFim, cnpjEmit, cnpjDest, take, skip, prazoFinal }) {
  const body = {
    TipoXml: xmlType,
    Take: take,
    Skip: skip,
    DataEmissaoInicio: dataEmissaoInicio,
    DataEmissaoFim: dataEmissaoFim,
  };
  if (cnpjEmit) body.CnpjEmit = cnpjEmit;
  if (cnpjDest) body.CnpjDest = cnpjDest;

  const response = await chamarApiV1('/api/v1/baixar-xmls', body, aguardarSlotDownloadPersistente, prazoFinal);

  if (response.status === 404) {
    return []; // "Nenhum arquivo XML localizado" — fim dos resultados para esse filtro.
  }
  if (!response.ok) {
    const texto = await response.text().catch(() => '');
    const erro = new Error(`SIEG baixar-xmls respondeu ${response.status}: ${texto || response.statusText}`);
    erro.transitorio = STATUS_TRANSITORIOS.includes(response.status);
    throw erro;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = new AdmZip(buffer);
  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.xml'))
    .map((entry) => entry.getData().toString('utf-8'));
}

/**
 * Busca XMLs de um período/CNPJ, paginando até a SIEG não retornar mais
 * nenhum arquivo — ou até `prazoFinal` (timestamp em ms) chegar perto o
 * bastante de exigir uma espera do rate limit que não caberia no tempo
 * restante. Nesse caso para e devolve `completo: false` com `proximoSkip`,
 * pra quem chamou continuar de onde parou numa próxima chamada (ver
 * painel.js) — sem isso, um cliente com bastante volume numa única direção
 * (ex.: muitas vendas NFCe no mês) podia estourar sozinho o tempo máximo de
 * execução da função, mesmo já buscando um combo por vez.
 *
 * Sem `prazoFinal` (uso do modo mock/dev local, sem risco de timeout),
 * busca tudo de uma vez, como antes.
 *
 * Atenção: a SIEG limita /baixar-xmls a um intervalo de até 2 meses entre
 * DataEmissaoInicio e DataEmissaoFim. O uso atual do projeto (filtro por
 * mês no painel) sempre respeita esse limite.
 */
export async function fetchAllXmls({
  xmlType,
  dataEmissaoInicio,
  dataEmissaoFim,
  cnpjEmit,
  cnpjDest,
  maxPages = 40,
  skipInicial = 0,
  prazoFinal,
}) {
  assertSiegConfigured();

  if (config.mockMode) {
    return { xmls: await loadFixtureXmls(), completo: true, proximoSkip: 0 };
  }

  const take = config.sieg.pageSize;
  const allXmls = [];
  let skip = skipInicial;

  for (let page = 0; page < maxPages; page += 1) {
    let xmls;
    try {
      xmls = await fetchPage({ xmlType, dataEmissaoInicio, dataEmissaoFim, cnpjEmit, cnpjDest, take, skip, prazoFinal });
    } catch (err) {
      if (err.prazoExcedido) return { xmls: allXmls, completo: false, proximoSkip: skip };
      throw err;
    }
    allXmls.push(...xmls);
    if (xmls.length < take) return { xmls: allXmls, completo: true, proximoSkip: skip + take };
    skip += take;
  }

  return { xmls: allXmls, completo: true, proximoSkip: skip };
}

async function loadFixtureXmls() {
  const files = await readdir(FIXTURES_DIR);
  const xmlFiles = files.filter((f) => f.endsWith('.xml'));
  const contents = await Promise.all(xmlFiles.map((f) => readFile(path.join(FIXTURES_DIR, f), 'utf-8')));
  return contents;
}
