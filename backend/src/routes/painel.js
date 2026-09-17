import { Router } from 'express';
import { waitUntil } from '@vercel/functions';
import { obterDocumentosClassificados } from '../services/documentsService.js';
import { resolverPeriodo } from '../services/dateUtils.js';
import { detectarQuebrasDeSequencia } from '../services/sequenceAnalyzer.js';
import { cruzarTributacao } from '../services/taxAnalyzer.js';
import { analisarConformidadeReforma } from '../services/reformaTributariaAnalyzer.js';
import { XmlType } from '../services/siegClient.js';
import {
  cacheDisponivel,
  lerCache,
  marcarBuscando,
  salvarResultado,
  salvarErro,
  estaExpirado,
  estaTravado,
} from '../services/painelCache.js';

export const painelRouter = Router();

// "nfe"/"nfce" restringem a busca a um tipo só (metade das requisições à
// SIEG); qualquer outro valor (ou ausente) busca os dois.
function resolverTipos(tipoParam) {
  if (tipoParam === 'nfe') return [XmlType.NFE];
  if (tipoParam === 'nfce') return [XmlType.NFCE];
  return undefined;
}

function normalizarTipo(tipoParam) {
  return tipoParam === 'nfe' || tipoParam === 'nfce' ? tipoParam : 'todos';
}

async function montarPainel(cnpj, dataInicio, dataFim, tipos) {
  const classificados = await obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim, tipos });

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

async function buscarEAtualizarCache(cnpj, dataInicio, dataFim, tipo, tipos) {
  try {
    const dados = await montarPainel(cnpj, dataInicio, dataFim, tipos);
    await salvarResultado(cnpj, dataInicio, dataFim, tipo, dados);
  } catch (err) {
    await salvarErro(cnpj, dataInicio, dataFim, tipo, err.message);
  }
}

painelRouter.get('/', async (req, res) => {
  try {
    const { cnpj, forcar } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.query);
    const tipo = normalizarTipo(req.query.tipo);
    const tipos = resolverTipos(req.query.tipo);

    // Sem Supabase configurado (dev local), busca direto — sem persistência
    // não tem como coordenar o "buscando em segundo plano" entre chamadas.
    if (!cacheDisponivel) {
      const dados = await montarPainel(cnpj, dataInicio, dataFim, tipos);
      return res.json({ status: 'pronto', periodo: { dataInicio, dataFim }, ...dados });
    }

    const cache = await lerCache(cnpj, dataInicio, dataFim, tipo);

    if (!cache || forcar === '1') {
      await marcarBuscando(cnpj, dataInicio, dataFim, tipo);
      waitUntil(buscarEAtualizarCache(cnpj, dataInicio, dataFim, tipo, tipos));
      return res.json({ status: 'buscando', periodo: { dataInicio, dataFim } });
    }

    if (cache.status === 'buscando') {
      if (estaTravado(cache.atualizado_em)) {
        await marcarBuscando(cnpj, dataInicio, dataFim, tipo);
        waitUntil(buscarEAtualizarCache(cnpj, dataInicio, dataFim, tipo, tipos));
      }
      return res.json({ status: 'buscando', periodo: { dataInicio, dataFim } });
    }

    if (cache.status === 'erro') {
      return res.json({ status: 'erro', periodo: { dataInicio, dataFim }, erro: cache.erro_mensagem });
    }

    // status === 'pronto': responde na hora com o que já tem; se estiver
    // velho, dispara uma atualização em segundo plano sem travar a resposta.
    const desatualizado = estaExpirado(cache.atualizado_em);
    if (desatualizado) {
      waitUntil(buscarEAtualizarCache(cnpj, dataInicio, dataFim, tipo, tipos));
    }

    res.json({
      status: 'pronto',
      periodo: { dataInicio, dataFim },
      atualizadoEm: cache.atualizado_em,
      desatualizado,
      ...cache.dados,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});
