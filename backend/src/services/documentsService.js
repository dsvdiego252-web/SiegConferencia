import { fetchAllXmls, XmlType } from './siegClient.js';
import { parseNfeBatch, classificarOperacao } from './xmlParser.js';
import { estaDentroDoPeriodo } from './dateUtils.js';

/**
 * Busca (ou usa o mock) e normaliza todos os documentos NFe relacionados a
 * um cliente num período — tanto os que ele emitiu (saída) quanto os que
 * recebeu (entrada) — e classifica cada um.
 *
 * Retorna uma lista de { doc, operacao } onde operacao é 'entrada',
 * 'saida' ou 'desconhecida' (quando nem emitente nem destinatário batem
 * com o CNPJ do cliente — normalmente não deveria acontecer, mas serve de
 * sinal de dado inconsistente).
 */
export async function obterDocumentosClassificados({ clienteCnpj, dataInicio, dataFim }) {
  const [xmlsComoEmitente, xmlsComoDestinatario] = await Promise.all([
    fetchAllXmls({
      xmlType: XmlType.NFE,
      dataEmissaoInicio: dataInicio,
      dataEmissaoFim: dataFim,
      cnpjEmit: clienteCnpj,
    }),
    fetchAllXmls({
      xmlType: XmlType.NFE,
      dataEmissaoInicio: dataInicio,
      dataEmissaoFim: dataFim,
      cnpjDest: clienteCnpj,
    }),
  ]);

  const docs = parseNfeBatch([...xmlsComoEmitente, ...xmlsComoDestinatario]);

  // Dedup por chave de acesso (o modo mock, por exemplo, devolve o mesmo
  // conjunto de fixtures nas duas buscas acima).
  const docsUnicos = new Map();
  for (const doc of docs) {
    const chave = doc.chave || `${doc.emitente.cnpj}-${doc.serie}-${doc.numero}`;
    docsUnicos.set(chave, doc);
  }

  return [...docsUnicos.values()]
    .filter((doc) => estaDentroDoPeriodo(doc.dataEmissao, dataInicio, dataFim))
    .map((doc) => ({ doc, operacao: classificarOperacao(doc, clienteCnpj) }))
    .sort((a, b) => String(a.doc.dataEmissao).localeCompare(String(b.doc.dataEmissao)));
}
