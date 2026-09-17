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
import { cacheDisponivel, lerCache, reiniciarBusca, salvarProgresso, salvarResultado, salvarErro, estaExpirado } from '../services/painelCache.js';

export const painelRouter = Router();

// Margem de segurança abaixo do maxDuration (60s, o máximo do plano Hobby
// da Vercel) — reserva tempo pra montar a resposta depois do último combo.
const ORCAMENTO_MS = 45_000;

function resolverTipos(tipoParam) {
  if (tipoParam === 'nfe') return [XmlType.NFE];
  if (tipoParam === 'nfce') return [XmlType.NFCE];
  return undefined;
}

function normalizarTipo(tipoParam) {
  return tipoParam === 'nfe' || tipoParam === 'nfce' ? tipoParam : 'todos';
}

function montarPainelDeClassificados(classificados) {
  const documentos = classificados.map(({ doc, operacao }) => ({
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
    qtdItens: doc.itens.length,
  }));

  const docsSaida = classificados.filter((c) => c.operacao === 'saida').map((c) => c.doc);

  return {
    xmls: {
      totalDocumentos: documentos.length,
      totalEntrada: documentos.filter((d) => d.operacao === 'entrada').length,
      totalSaida: documentos.filter((d) => d.operacao === 'saida').length,
      totalDesconhecida: documentos.filter((d) => d.operacao === 'desconhecida').length,
      documentos,
    },
    sequence: { grupos: detectarQuebrasDeSequencia(docsSaida) },
    tax: { meses: cruzarTributacao(classificados) },
    reforma: analisarConformidadeReforma(classificados),
  };
}

painelRouter.get('/', async (req, res) => {
  try {
    const { cnpj, forcar } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.query);
    const tipo = normalizarTipo(req.query.tipo);
    const tipos = resolverTipos(req.query.tipo);

    // Sem Supabase configurado (dev local), busca tudo direto — o modo mock
    // é instantâneo, sem risco de estourar o tempo de execução.
    if (!cacheDisponivel) {
      const classificados = await obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim, tipos });
      return res.json({ status: 'pronto', periodo: { dataInicio, dataFim }, ...montarPainelDeClassificados(classificados) });
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
        ...cache.dados,
      });
    }

    if (cache.status === 'erro') {
      return res.json({ status: 'erro', periodo: { dataInicio, dataFim }, erro: cache.erro_mensagem });
    }

    // status === 'buscando': continua de onde parou. Cada combo (tipo x
    // direção) só é buscado uma vez; o progresso fica salvo no Supabase
    // entre chamadas — cliente com bastante volume termina em várias
    // requisições em sequência (o front-end repete sozinho) em vez de
    // depender de rodar em segundo plano além do tempo de resposta.
    const combos = listarCombos(tipos);
    const combosConcluidos = new Set(cache.combos_concluidos || []);
    let docsAcumulados = cache.docs_parciais || [];
    const inicio = Date.now();

    try {
      for (const combo of combos) {
        const chave = chaveCombo(combo);
        if (combosConcluidos.has(chave)) continue;
        if (Date.now() - inicio > ORCAMENTO_MS) break;

        const docsCombo = await buscarCombo(combo, { clienteCnpj: cnpj, dataInicio, dataFim });
        docsAcumulados = mesclarDocumentos(docsAcumulados, docsCombo);
        combosConcluidos.add(chave);
      }
    } catch (err) {
      await salvarErro(cnpj, dataInicio, dataFim, tipo, err.message);
      return res.json({ status: 'erro', periodo: { dataInicio, dataFim }, erro: err.message });
    }

    if (combosConcluidos.size === combos.length) {
      const classificados = classificarDocumentos(docsAcumulados, cnpj, dataInicio, dataFim, tipos);
      const dados = montarPainelDeClassificados(classificados);
      await salvarResultado(cnpj, dataInicio, dataFim, tipo, dados);
      return res.json({ status: 'pronto', periodo: { dataInicio, dataFim }, desatualizado: false, ...dados });
    }

    await salvarProgresso(cnpj, dataInicio, dataFim, tipo, [...combosConcluidos], docsAcumulados);
    return res.json({
      status: 'buscando',
      periodo: { dataInicio, dataFim },
      progresso: `${combosConcluidos.size}/${combos.length}`,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});
