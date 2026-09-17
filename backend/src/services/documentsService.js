import { fetchAllXmls, XmlType } from './siegClient.js';
import { parseNfeBatch, classificarOperacao } from './xmlParser.js';
import { estaDentroDoPeriodo } from './dateUtils.js';

const TIPO_DOCUMENTO_POR_XMLTYPE = { [XmlType.NFE]: 'NFe', [XmlType.NFCE]: 'NFCe' };

/**
 * Busca (ou usa o mock) e normaliza os documentos relacionados a um cliente
 * num período — tanto os que ele emitiu (saída) quanto os que recebeu
 * (entrada) — e classifica cada um. O parâmetro opcional `tipos` (array de
 * XmlType) restringe a busca a NFe e/ou NFCe; sem ele, busca os dois. Além
 * de economizar consultas à SIEG (cada tipo consome sua própria cota de
 * requisições), o resultado também é filtrado por tipo no final, como
 * segurança extra (o modo mock ignora o tipo pedido nas fixtures).
 *
 * Retorna uma lista de { doc, operacao } onde operacao é 'entrada',
 * 'saida' ou 'desconhecida' (quando nem emitente nem destinatário batem
 * com o CNPJ do cliente — normalmente não deveria acontecer, mas serve de
 * sinal de dado inconsistente).
 */
export async function obterDocumentosClassificados({ clienteCnpj, dataInicio, dataFim, tipos }) {
  const tiposConsultados = tipos && tipos.length ? tipos : [XmlType.NFE, XmlType.NFCE];
  const tiposDocumentoPermitidos = new Set(tiposConsultados.map((t) => TIPO_DOCUMENTO_POR_XMLTYPE[t]));

  const buscas = tiposConsultados.flatMap((xmlType) => [
    fetchAllXmls({ xmlType, dataEmissaoInicio: dataInicio, dataEmissaoFim: dataFim, cnpjEmit: clienteCnpj }),
    fetchAllXmls({ xmlType, dataEmissaoInicio: dataInicio, dataEmissaoFim: dataFim, cnpjDest: clienteCnpj }),
  ]);

  const resultados = await Promise.all(buscas);
  const docs = parseNfeBatch(resultados.flat());

  // Dedup por chave de acesso (o modo mock, por exemplo, devolve o mesmo
  // conjunto de fixtures nas duas buscas acima).
  const docsUnicos = new Map();
  for (const doc of docs) {
    const chave = doc.chave || `${doc.emitente.cnpj}-${doc.serie}-${doc.numero}`;
    docsUnicos.set(chave, doc);
  }

  return [...docsUnicos.values()]
    .filter((doc) => estaDentroDoPeriodo(doc.dataEmissao, dataInicio, dataFim))
    .filter((doc) => tiposDocumentoPermitidos.has(doc.tipoDocumento))
    .map((doc) => ({ doc, operacao: classificarOperacao(doc, clienteCnpj) }))
    .sort((a, b) => String(a.doc.dataEmissao).localeCompare(String(b.doc.dataEmissao)));
}
