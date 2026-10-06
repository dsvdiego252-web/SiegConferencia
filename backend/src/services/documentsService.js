import { fetchAllXmls, XmlType } from './siegClient.js';
import { parseNfeBatch, classificarOperacao } from './xmlParser.js';
import { estaDentroDoPeriodo } from './dateUtils.js';
import { diasFaltantes, buscarDocumentosCacheados, upsertDocumentosCacheados, marcarDiasSincronizados } from './documentCache.js';

const TIPO_DOCUMENTO_POR_XMLTYPE = { [XmlType.NFE]: 'NFe', [XmlType.NFCE]: 'NFCe', [XmlType.NFSE]: 'NFSe' };

/**
 * Lista os "combos" (tipo de documento x direção emitente/destinatário) que
 * precisam ser consultados na SIEG. tipos (array de XmlType) restringe a
 * NFe e/ou NFCe; sem ele, usa os dois — cada combo é uma requisição de
 * download separada, com sua própria cota na SIEG.
 *
 * `incluirEmitNfse` (default true): quando false, omite o combo NFS-e de
 * emissão (mas mantém o de destinatário) — usado pelo "Todos" do painel pra
 * não gastar cota da SIEG com NFS-e emitida por um cliente que não presta
 * serviço, sem deixar de checar se ELE recebeu NFS-e de algum fornecedor
 * (isso não depende da atividade do próprio cliente).
 */
export function listarCombos(tipos, { incluirEmitNfse = true } = {}) {
  const tiposConsultados = tipos && tipos.length ? tipos : [XmlType.NFE, XmlType.NFCE];
  return tiposConsultados.flatMap((xmlType) => {
    if (xmlType === XmlType.NFSE && !incluirEmitNfse) return [{ xmlType, direcao: 'dest' }];
    return [
      { xmlType, direcao: 'emit' },
      { xmlType, direcao: 'dest' },
    ];
  });
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
 * Se só uma PARTE do período pedido não está cacheada (ex.: pediu o mês
 * inteiro, mas só faltam os últimos 5 dias), busca na SIEG só a faixa entre
 * o primeiro e o último dia faltante — nunca o período inteiro de novo —
 * e completa o resto com o que já está cacheado. Quando a falta é
 * espalhada (ex.: falta o dia 5 e o dia 28, com dias cacheados no meio),
 * essa faixa pode incluir alguns dias que já estavam cacheados; ainda assim
 * é sempre igual ou menor que buscar o período inteiro de novo.
 *
 * `gapInicio`/`gapFim` (opcionais): a faixa já calculada quando a chamada é
 * uma retomada (skipInicial > 0) de uma paginação em andamento — sem isso,
 * a retomada usaria o período inteiro, perdendo o recorte calculado na
 * primeira chamada deste combo. Quem chama deve guardar `gapInicio`/
 * `gapFim` devolvidos aqui junto com o resto do estado parcial, e
 * devolvê-los na próxima chamada do mesmo combo.
 *
 * `ignorarCache` (opcional): quando true, pula o cache permanente de
 * documentos inteiro e busca o período pedido ao vivo na SIEG, como se nada
 * estivesse cacheado — usado pelo "Forçar atualização" (ver painel.js) pra
 * consertar um cliente cujo cache se suspeita incompleto (ex.: dados
 * cacheados por uma versão antiga da paginação, antes de uma correção).
 *
 * Cada página buscada ao vivo é gravada no cache permanente assim que
 * chega (upsertDocumentosCacheados), não só no fim do combo inteiro — pra
 * um combo de alto volume (milhares de documentos), acumular tudo num
 * parâmetro repassado de chamada em chamada (como era antes) fazia esse
 * mesmo parâmetro crescer sem parar, até a própria gravação do progresso no
 * Supabase (painel.js) estourar o tempo (statement timeout). Por isso quem
 * chamou não precisa mais carregar `docs` entre chamadas — só `proximoSkip`/
 * `gapInicio`/`gapFim` — e o resultado de um combo incompleto vem com
 * `docs: []` (os documentos já estão salvos, não precisam viajar de volta).
 *
 * Retorna { docs, completo, proximoSkip, gapInicio, gapFim }: `completo:
 * false` significa que ainda faltam páginas — quem chamou deve guardar
 * `proximoSkip`, `gapInicio` e `gapFim` e tentar de novo depois. Quando
 * `completo: true`, `docs` vem completo (lido de volta do cache permanente,
 * que acabou de ficar com tudo), pronto pra classificar.
 */
export async function buscarCombo(combo, { clienteCnpj, dataInicio, dataFim, skipInicial, prazoFinal, gapInicio, gapFim, ignorarCache }) {
  let faixaInicio = gapInicio ?? dataInicio;
  let faixaFim = gapFim ?? dataFim;
  const tipoDocumento = TIPO_DOCUMENTO_POR_XMLTYPE[combo.xmlType];

  // Só faz sentido calcular a faixa que falta no início do combo (skipInicial
  // 0) — uma busca retomada no meio de uma paginação já está usando a faixa
  // calculada na primeira chamada (gapInicio/gapFim), repassada por quem
  // chamou.
  if (!skipInicial && !ignorarCache) {
    // Uma falha ao consultar o cache (ex.: instabilidade pontual do
    // Supabase) não pode impedir a busca — só faz cair no caminho normal
    // (buscar ao vivo na SIEG o período inteiro), como se nada estivesse
    // cacheado. Já um timeout por falta de orçamento de tempo
    // (erroCache.transitorio) é diferente: os documentos estão mesmo
    // cacheados, só não deu tempo de ler agora — cair pro caminho ao vivo
    // nesse caso gastaria cota da SIEG à toa (e, pior, "comprometeria" as
    // próximas tentativas desse combo com o modo ao vivo, já que
    // skipInicial > 0 pula essa checagem de novo). Propaga como transitório
    // pra quem chamou (painel.js) tratar como as outras instabilidades
    // passageiras: salva o progresso já feito e tenta ler o cache de novo
    // no próximo poll.
    try {
      const faltando = await diasFaltantes(clienteCnpj, combo.xmlType, combo.direcao, dataInicio, dataFim);
      if (!faltando.length) {
        const docs = await buscarDocumentosCacheados(clienteCnpj, combo.direcao, dataInicio, dataFim, tipoDocumento, prazoFinal);
        return { docs, completo: true, proximoSkip: 0, doCache: true, gapInicio: dataInicio, gapFim: dataFim };
      }
      faixaInicio = faltando[0];
      faixaFim = faltando[faltando.length - 1];
    } catch (erroCache) {
      if (erroCache.transitorio) throw erroCache;
      console.error('Falha ao consultar cache permanente de documentos:', erroCache.message);
      faixaInicio = dataInicio;
      faixaFim = dataFim;
    }
  }

  const filtroDirecao = combo.direcao === 'emit' ? { cnpjEmit: clienteCnpj } : { cnpjDest: clienteCnpj };
  const resultado = await fetchAllXmls({
    xmlType: combo.xmlType,
    dataEmissaoInicio: faixaInicio,
    dataEmissaoFim: faixaFim,
    ...filtroDirecao,
    skipInicial,
    prazoFinal,
  });
  const docsAoVivo = parseNfeBatch(resultado.xmls);

  // Idempotente por chave — gravar de novo numa tentativa seguinte (ex.:
  // depois de um erro transitório na página anterior) não duplica nada.
  //
  // Uma falha aqui precisa impedir o combo de avançar: ela nunca pode
  // chegar em marcarDiasSincronizados logo abaixo sem esta página ter sido
  // gravada de verdade. Como os dias "estáveis" nunca mais são
  // reconsultados (ver diaEstavel em documentCache.js), marcar o dia como
  // sincronizado com uma página perdida apaga documentos de verdade do
  // resultado pra sempre, sem deixar rastro.
  if (docsAoVivo.length) {
    try {
      await upsertDocumentosCacheados(docsAoVivo);
    } catch (erroUpsert) {
      const erro = new Error(`Falha ao gravar página de documentos no cache permanente: ${erroUpsert.message}`);
      erro.transitorio = true;
      throw erro;
    }
  }

  if (!resultado.completo) {
    // `docs` aqui é só a página desta chamada (não acumula com chamadas
    // anteriores) — usada por quem chamou (painel.js) só pra feedback de
    // progresso (ex.: "já chegou até tal data"), nunca persistida.
    return { docs: docsAoVivo, completo: false, proximoSkip: resultado.proximoSkip, doCache: false, gapInicio: faixaInicio, gapFim: faixaFim };
  }

  // A faixa que faltava terminou de baixar — marca os dias como
  // sincronizados e devolve o combo inteiro lendo de volta do cache
  // permanente (que inclui tanto o que já estava cacheado antes quanto o
  // que acabou de ser gravado), em vez de ter carregado tudo isso entre
  // chamadas.
  try {
    await marcarDiasSincronizados(clienteCnpj, combo.xmlType, combo.direcao, faixaInicio, faixaFim);
  } catch (erroMarcar) {
    console.error('Falha ao marcar dias sincronizados no cache permanente:', erroMarcar.message);
  }

  let docs;
  try {
    docs = await buscarDocumentosCacheados(clienteCnpj, combo.direcao, dataInicio, dataFim, tipoDocumento, prazoFinal);
  } catch (erroRelerCache) {
    // Não deveria falhar logo depois de gravar, mas por segurança: se a
    // releitura falhar, ainda devolve ao menos os documentos desta última
    // página (já gravados) em vez de perder o combo inteiro.
    console.error('Falha ao reler cache permanente após concluir combo:', erroRelerCache.message);
    docs = docsAoVivo;
  }

  return { docs, completo: true, proximoSkip: 0, doCache: false, gapInicio: dataInicio, gapFim: dataFim };
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
