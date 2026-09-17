import { Router } from 'express';
import {
  obterDocumentosClassificados,
  listarCombos,
  chaveCombo,
  buscarCombo,
  mesclarDocumentos,
  classificarDocumentos,
} from '../services/documentsService.js';
import { resolverPeriodo } from '../services/dateUtils.js';
import { detectarQuebrasDeSequencia } from '../services/sequenceAnalyzer.js';
import { cruzarTributacao } from '../services/taxAnalyzer.js';
import { analisarConformidadeReforma } from '../services/reformaTributariaAnalyzer.js';
import { XmlType } from '../services/siegClient.js';
import { obterCliente } from '../services/clientsStore.js';
import { cacheDisponivel, lerCache, reiniciarBusca, salvarProgresso, salvarResultado, salvarErro, estaExpirado } from '../services/painelCache.js';

export const painelRouter = Router();

// Margem de segurança abaixo do maxDuration (60s, o máximo do plano Hobby
// da Vercel) — reserva tempo pra montar a resposta depois do último combo.
const ORCAMENTO_MS = 45_000;

// Empresas do Simples Nacional e MEI não são obrigadas a preencher
// CST/cClassTrib do IBS/CBS em 2026 — a exigência para elas só começa em
// janeiro de 2027. Regime Normal (lucro presumido/real) ou desconhecido
// segue o prazo padrão de 01/2026.
const DATA_CORTE_REGIME_NORMAL = '2026-01-01';
const DATA_CORTE_SIMPLES_MEI = '2027-01-01';

function resolverDataCorteReforma(regimeTributario) {
  return regimeTributario === 'simples_nacional' || regimeTributario === 'mei'
    ? DATA_CORTE_SIMPLES_MEI
    : DATA_CORTE_REGIME_NORMAL;
}

function resolverTipos(tipoParam) {
  if (tipoParam === 'nfe') return [XmlType.NFE];
  if (tipoParam === 'nfce') return [XmlType.NFCE];
  return undefined;
}

function normalizarTipo(tipoParam) {
  return tipoParam === 'nfe' || tipoParam === 'nfce' ? tipoParam : 'todos';
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// "OK" — documento normal; "cancelada" — cancelada na SEFAZ; "inconsistente"
// — desde a vigência da Reforma Tributária, mas sem os campos de IBS/CBS
// completos (situação vem de reformaTributariaAnalyzer.js).
function situacaoDocumento(doc, situacaoReforma) {
  if (doc.cancelada) return 'cancelada';
  if (situacaoReforma === 'parcial' || situacaoReforma === 'sem_adequacao') return 'inconsistente';
  return 'ok';
}

function montarPainelDeClassificados(classificados, dataCorteReforma) {
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
      documentos,
    },
    valores: resumoValores,
    sequence: { grupos: detectarQuebrasDeSequencia(docsSaida) },
    tax: { meses: cruzarTributacao(classificados) },
    reforma,
  };
}

painelRouter.get('/', async (req, res) => {
  try {
    const { cnpj, forcar } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.query);
    const tipo = normalizarTipo(req.query.tipo);
    const tipos = resolverTipos(req.query.tipo);

    const cliente = await obterCliente(cnpj);
    const dataCorteReforma = resolverDataCorteReforma(cliente?.regimeTributario);

    // Sem Supabase configurado (dev local), busca tudo direto — o modo mock
    // é instantâneo, sem risco de estourar o tempo de execução.
    if (!cacheDisponivel) {
      const classificados = await obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim, tipos });
      return res.json({
        status: 'pronto',
        periodo: { dataInicio, dataFim },
        cliente,
        ...montarPainelDeClassificados(classificados, dataCorteReforma),
      });
    }

    let cache = await lerCache(cnpj, dataInicio, dataFim, tipo);

    const precisaReiniciar = !cache || forcar === '1' || (cache.status === 'pronto' && estaExpirado(cache.atualizado_em));
    if (precisaReiniciar) {
      cache = await reiniciarBusca(cnpj, dataInicio, dataFim, tipo);
    }

    if (cache.status === 'pronto') {
      return res.json({
        status: 'pronto',
        periodo: { dataInicio, dataFim },
        atualizadoEm: cache.atualizado_em,
        desatualizado: false,
        cliente,
        ...cache.dados,
      });
    }

    if (cache.status === 'erro') {
      return res.json({ status: 'erro', periodo: { dataInicio, dataFim }, erro: cache.erro_mensagem });
    }

    // status === 'buscando': continua de onde parou. Cada combo (tipo x
    // direção) fica pausável no meio da paginação também — um combo
    // sozinho com bastante volume (várias páginas de 50 documentos) não
    // pode estourar o tempo de execução da função, então o `prazoFinal`
    // passado pra buscarCombo faz a busca parar antes de uma espera do
    // rate limit que não caberia no tempo restante desta requisição.
    const combos = listarCombos(tipos);
    const combosConcluidos = new Set(cache.combos_concluidos || []);
    let docsAcumulados = cache.docs_parciais || [];
    let comboParcial = cache.combo_parcial || null;
    const prazoFinal = Date.now() + ORCAMENTO_MS;

    try {
      for (const combo of combos) {
        const chave = chaveCombo(combo);
        if (combosConcluidos.has(chave)) continue;
        if (Date.now() >= prazoFinal) break;

        const emAndamento = comboParcial && comboParcial.chave === chave;
        const skipInicial = emAndamento ? comboParcial.proximoSkip : 0;
        const docsJaDoCombo = emAndamento ? comboParcial.docs : [];

        const resultado = await buscarCombo(combo, { clienteCnpj: cnpj, dataInicio, dataFim, skipInicial, prazoFinal });
        const docsDoComboAtualizados = mesclarDocumentos(docsJaDoCombo, resultado.docs);

        if (resultado.completo) {
          docsAcumulados = mesclarDocumentos(docsAcumulados, docsDoComboAtualizados);
          combosConcluidos.add(chave);
          comboParcial = null;
        } else {
          comboParcial = { chave, proximoSkip: resultado.proximoSkip, docs: docsDoComboAtualizados };
          break;
        }
      }
    } catch (err) {
      await salvarErro(cnpj, dataInicio, dataFim, tipo, err.message);
      return res.json({ status: 'erro', periodo: { dataInicio, dataFim }, erro: err.message });
    }

    if (combosConcluidos.size === combos.length) {
      const classificados = classificarDocumentos(docsAcumulados, cnpj, dataInicio, dataFim, tipos);
      const dados = montarPainelDeClassificados(classificados, dataCorteReforma);
      await salvarResultado(cnpj, dataInicio, dataFim, tipo, dados);
      return res.json({ status: 'pronto', periodo: { dataInicio, dataFim }, desatualizado: false, cliente, ...dados });
    }

    await salvarProgresso(cnpj, dataInicio, dataFim, tipo, [...combosConcluidos], docsAcumulados, comboParcial);
    const documentosNoComboAtual = comboParcial?.docs?.length || 0;
    return res.json({
      status: 'buscando',
      periodo: { dataInicio, dataFim },
      progresso: `${combosConcluidos.size}/${combos.length}`,
      // Um combo sozinho pode ter muitas páginas quando o cliente tem
      // bastante volume (ex.: muitas vendas NFCe) — sem isso, o contador de
      // combos concluídos fica parado em "0/2" por bastante tempo mesmo com
      // a busca avançando de verdade, página a página.
      documentosNoComboAtual,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});
