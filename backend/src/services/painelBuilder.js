import { detectarQuebrasDeSequencia } from './sequenceAnalyzer.js';
import { cruzarTributacao } from './taxAnalyzer.js';
import { analisarConformidadeReforma } from './reformaTributariaAnalyzer.js';
import { validarDocumento } from '../tax-engine/math-validation/mathValidator.js';
import { validarReformaDocumento } from '../tax-engine/rtc-xml-validator/validarReformaXml.js';
import { classificarMercadoriasDocumento } from '../tax-engine/goods-engine/classificarMercadoria.js';
import { conferirIcmsDocumento } from '../tax-engine/icms-engine/conferirIcms.js';

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Roda um módulo do motor tributário protegido contra exceção — um bug
// num módulo mais novo (ex.: classificação de mercadorias, ainda recente)
// não pode derrubar a resposta inteira do painel, que documentos/valores/
// validação matemática dependem de sempre aparecer mesmo se algo mais
// experimental falhar num item específico. Loga o erro (visível nos logs
// da função na Vercel) e devolve null nesse documento só.
export function comProtecao(rotulo, fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`Falha no módulo "${rotulo}" — documento ignorado nesse módulo:`, err.message, err.stack);
    return null;
  }
}

// "OK" — documento normal; "cancelada" — cancelada na SEFAZ; "inconsistente"
// — desde a vigência da Reforma Tributária, mas sem os campos de IBS/CBS
// completos (situação vem de reformaTributariaAnalyzer.js).
function situacaoDocumento(doc, situacaoReforma) {
  if (doc.cancelada) return 'cancelada';
  if (situacaoReforma === 'parcial' || situacaoReforma === 'sem_adequacao') return 'inconsistente';
  return 'ok';
}

/**
 * Roda o motor tributário inteiro (validação matemática, XML_REFORMA_
 * VALIDATOR, Motor de Mercadorias, conferência de ICMS/CFOP/CST) sobre uma
 * lista de documentos já classificados (entrada/saída/desconhecida) e monta
 * a mesma estrutura que /api/painel devolve — usada tanto pela busca ao
 * vivo quanto pelo painel consolidado (que só lê do cache permanente, nunca
 * busca na SIEG). `regimeTributario` e `atividade` (opcionais) são do
 * cadastro do cliente, repassados à conferência de ICMS/CFOP/CST (ver
 * tax-engine/icms-engine).
 */
export function montarPainelDeClassificados(classificados, dataCorteReforma, regimeTributario = null, atividade = null) {
  const reforma = analisarConformidadeReforma(classificados, dataCorteReforma);
  const situacaoReformaPorChave = new Map(reforma.porDocumento.map((d) => [d.chave, d.situacao]));

  const documentos = classificados.map(({ doc, operacao }) => {
    const situacaoReforma = situacaoReformaPorChave.get(doc.chave) || null;
    return {
      chave: doc.chave,
      operacao,
      tipoDocumento: doc.tipoDocumento,
      numero: doc.numero,
      serie: doc.serie,
      dataEmissao: doc.dataEmissao,
      naturezaOperacao: doc.naturezaOperacao,
      cancelada: doc.cancelada,
      emitente: doc.emitente,
      destinatario: doc.destinatario,
      valorTotal: doc.valorTotal,
      valorIcmsTotal: doc.valorIcmsTotal,
      qtdItens: doc.itens.length,
      itens: doc.itens,
      situacaoReforma,
      situacao: situacaoDocumento(doc, situacaoReforma),
      validacaoMatematica: doc.cancelada ? null : comProtecao('validacaoMatematica', () => validarDocumento(doc)),
      validacaoReforma: doc.cancelada ? null : comProtecao('validacaoReforma', () => validarReformaDocumento(doc, dataCorteReforma)),
      classificacaoMercadorias: doc.cancelada ? null : comProtecao('classificacaoMercadorias', () => classificarMercadoriasDocumento(doc)),
      conferenciaIcms: doc.cancelada ? null : comProtecao('conferenciaIcms', () => conferirIcmsDocumento(doc, operacao, regimeTributario, atividade)),
    };
  });

  const docsSaida = classificados.filter((c) => c.operacao === 'saida').map((c) => c.doc);

  const valores = { entrada: { valor: 0, icms: 0, pis: 0, cofins: 0 }, saida: { valor: 0, icms: 0, pis: 0, cofins: 0 } };
  for (const { doc, operacao } of classificados) {
    if (operacao !== 'entrada' && operacao !== 'saida') continue;
    valores[operacao].valor += doc.valorTotal;
    valores[operacao].icms += doc.valorIcmsTotal;
    for (const item of doc.itens) {
      valores[operacao].pis += item.pis.valor;
      valores[operacao].cofins += item.cofins.valor;
    }
  }
  const resumoValores = {
    entrada: {
      valor: round2(valores.entrada.valor),
      icms: round2(valores.entrada.icms),
      pisCofins: round2(valores.entrada.pis + valores.entrada.cofins),
    },
    saida: {
      valor: round2(valores.saida.valor),
      icms: round2(valores.saida.icms),
      pisCofins: round2(valores.saida.pis + valores.saida.cofins),
    },
    saldo: round2(valores.saida.valor - valores.entrada.valor),
  };

  return {
    xmls: {
      totalDocumentos: documentos.length,
      totalEntrada: documentos.filter((d) => d.operacao === 'entrada').length,
      totalSaida: documentos.filter((d) => d.operacao === 'saida').length,
      totalDesconhecida: documentos.filter((d) => d.operacao === 'desconhecida').length,
      totalInconsistentes: documentos.filter((d) => d.situacao === 'inconsistente').length,
      totalCanceladas: documentos.filter((d) => d.situacao === 'cancelada').length,
      totalDivergenciaCalculo: documentos.filter((d) => d.validacaoMatematica && d.validacaoMatematica.status !== 'CORRETO')
        .length,
      totalDivergenciaReforma: documentos.filter((d) => d.validacaoReforma && d.validacaoReforma.status === 'DIVERGENTE')
        .length,
      totalDivergenciaIcms: documentos.filter((d) => d.conferenciaIcms && d.conferenciaIcms.status === 'DIVERGENTE').length,
      documentos,
    },
    valores: resumoValores,
    sequence: { grupos: detectarQuebrasDeSequencia(docsSaida) },
    tax: { meses: cruzarTributacao(classificados) },
    reforma,
  };
}
