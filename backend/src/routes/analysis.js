import { Router } from 'express';
import { obterDocumentosClassificados } from '../services/documentsService.js';
import { resolverPeriodo } from '../services/dateUtils.js';
import { detectarQuebrasDeSequencia } from '../services/sequenceAnalyzer.js';
import { cruzarTributacao } from '../services/taxAnalyzer.js';
import { analisarConformidadeReforma } from '../services/reformaTributariaAnalyzer.js';

export const analysisRouter = Router();

analysisRouter.get('/sequence', async (req, res) => {
  try {
    const { cnpj } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.query);
    const classificados = await obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim });
    const docsSaida = classificados.filter((c) => c.operacao === 'saida').map((c) => c.doc);

    res.json({
      periodo: { dataInicio, dataFim },
      grupos: detectarQuebrasDeSequencia(docsSaida),
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

analysisRouter.get('/tax', async (req, res) => {
  try {
    const { cnpj } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.query);
    const classificados = await obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim });

    res.json({
      periodo: { dataInicio, dataFim },
      meses: cruzarTributacao(classificados),
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

analysisRouter.get('/reforma-tributaria', async (req, res) => {
  try {
    const { cnpj } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.query);
    const classificados = await obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim });

    res.json({
      periodo: { dataInicio, dataFim },
      ...analisarConformidadeReforma(classificados),
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});
