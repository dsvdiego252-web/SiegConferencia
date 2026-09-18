import { fetchAllXmls, XmlType } from './siegClient.js';
import { parseNfeBatch, classificarOperacao } from './xmlParser.js';
import { estaDentroDoPeriodo } from './dateUtils.js';
import { periodoTotalmenteCacheado, buscarDocumentosCacheados } from './documentCache.js';

const TIPO_DOCUMENTO_POR_XMLTYPE = { [XmlType.NFE]: 'NFe', [XmlType.NFCE]: 'NFCe' };

/**
 * Lista os "combos" (tipo de documento x direção emitente/destinatário) que
 * precisam ser consultados na SIEG. tipos (array de XmlType) restringe a
 * NFe e/ou NFCe; sem ele, usa os dois — cada combo é uma requisição de
 * download separada, com sua própria cota na SIEG.
 */
export function listarCombos(tipos) {
  const tiposConsultados = tipos && tipos.length ? tipos : [XmlType.NFE, XmlType.NFCE];
  return tiposConsultados.flatMap((xmlType) => [
    { xmlType, direcao: 'emit' },
    { xmlType, direcao: 'dest' },
  ]);
}

export function chaveCombo(combo) {
  return `${combo.xmlType}:${combo.direcao}`;
}

/**
 * Busca e faz o parsing de um único combo, com suporte a pausar no meio da
 * paginação (`skipInicial`/`prazoFinal`) — usada para avançar a busca aos
 * poucos (ver painel.js) em vez de buscar tudo de uma vez, o que pode
 * estourar o tempo máximo de execução de uma função na Vercel quando o
 * combo sozinho já tem bastante volume (o rate limit real da SIEG é de só
 * 2 requisições/minuto, e cada página são até 50 documentos).
 *
 * Retorna { docs, completo, proximoSkip }: `completo: false` significa que
 * ainda faltam páginas — quem chamou deve guardar `proximoSkip` e tentar de
 * novo depois.
 */
export async function buscarCombo(combo, { clienteCnpj, dataInicio, dataFim, skipInicial, prazoFinal }) {
  // Se o período inteiro já foi sincronizado antes (nenhum dia "recente
  // demais" pra confiar — ver documentCache.js), usa o que já está
  // guardado, sem gastar cota da SIEG. Só faz sentido checar isso no início
  // do combo (skipInicial 0): uma busca retomada no meio de uma paginação
  // já está usando dados vindos da SIEG, por definição não veio do cache.
  if (!skipInicial) {
    // Uma falha ao consultar o cache (ex.: instabilidade pontual do
    // Supabase) não pode impedir a busca — só faz cair no caminho normal
    // (buscar ao vivo na SIEG), como se nada estivesse cacheado.
    try {
      const cacheado = await periodoTotalmenteCacheado(clienteCnpj, combo.xmlType, combo.direcao, dataInicio, dataFim);
      if (cacheado) {
        const docs = await buscarDocumentosCacheados(clienteCnpj, combo.direcao, dataInicio, dataFim);
        return { docs, completo: true, proximoSkip: 0, doCache: true };
      }
    } catch (erroCache) {
      console.error('Falha ao consultar cache permanente de documentos:', erroCache.message);
    }
  }

  const filtroDirecao = combo.direcao === 'emit' ? { cnpjEmit: clienteCnpj } : { cnpjDest: clienteCnpj };
  const resultado = await fetchAllXmls({
    xmlType: combo.xmlType,
    dataEmissaoInicio: dataInicio,
    dataEmissaoFim: dataFim,
    ...filtroDirecao,
    skipInicial,
    prazoFinal,
  });
  return {
    docs: parseNfeBatch(resultado.xmls),
    completo: resultado.completo,
    proximoSkip: resultado.proximoSkip,
    doCache: false,
  };
}

/** Junta duas listas de documentos já parseados, sem duplicar por chave de acesso. */
export function mesclarDocumentos(docsExistentes, docsNovos) {
  const mapa = new Map(docsExistentes.map((d) => [d.chave || `${d.emitente.cnpj}-${d.serie}-${d.numero}`, d]));
  for (const doc of docsNovos) {
    mapa.set(doc.chave || `${doc.emitente.cnpj}-${doc.serie}-${doc.numero}`, doc);
  }
  return [...mapa.values()];
}

/**
 * Filtra por período/tipo, classifica cada documento como entrada/saída (do
 * ponto de vista do cliente) e ordena por data de emissão.
 */
export function classificarDocumentos(docs, clienteCnpj, dataInicio, dataFim, tipos) {
  const tiposConsultados = tipos && tipos.length ? tipos : [XmlType.NFE, XmlType.NFCE];
  const tiposDocumentoPermitidos = new Set(tiposConsultados.map((t) => TIPO_DOCUMENTO_POR_XMLTYPE[t]));

  return docs
    .filter((doc) => estaDentroDoPeriodo(doc.dataEmissao, dataInicio, dataFim))
    .filter((doc) => tiposDocumentoPermitidos.has(doc.tipoDocumento))
    .map((doc) => ({ doc, operacao: classificarOperacao(doc, clienteCnpj) }))
    .sort((a, b) => String(a.doc.dataEmissao).localeCompare(String(b.doc.dataEmissao)));
}

/**
 * Busca todos os combos de uma vez e já classifica — usado no modo sem
 * cache (dev local, onde o modo mock é instantâneo e não há risco de
 * estourar o tempo de execução). Em produção com o Supabase configurado,
 * painel.js busca combo por combo em vez de chamar esta função.
 */
export async function obterDocumentosClassificados({ clienteCnpj, dataInicio, dataFim, tipos }) {
  const combos = listarCombos(tipos);
  const resultados = await Promise.all(combos.map((combo) => buscarCombo(combo, { clienteCnpj, dataInicio, dataFim })));
  const docs = mesclarDocumentos([], resultados.flatMap((r) => r.docs));
  return classificarDocumentos(docs, clienteCnpj, dataInicio, dataFim, tipos);
}
