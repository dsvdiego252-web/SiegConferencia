import { Router } from 'express';
import multer from 'multer';
import { parseDominioFile } from '../services/dominioImportService.js';
import { parseDominioProdutosFile } from '../services/dominioProdutosImportService.js';
import { obterDocumentosClassificados } from '../services/documentsService.js';
import { resolverPeriodo, estaDentroDoPeriodo } from '../services/dateUtils.js';
import { reconciliar } from '../services/reconciliationService.js';
import { compararCadastroProdutosComDominio } from '../services/produtoCadastroComparisonService.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export const reconciliationRouter = Router();

reconciliationRouter.post('/', upload.single('dominioFile'), async (req, res) => {
  try {
    const { cnpj } = req.body;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });
    if (!req.file) return res.status(400).json({ erro: 'Envie o arquivo exportado do Domínio no campo "dominioFile".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.body);

    const [{ docs: dominioDocs, colunasMapeadas, colunasEncontradas }, siegClassificados] = await Promise.all([
      Promise.resolve(parseDominioFile(req.file.buffer)),
      obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim }),
    ]);

    const dominioDocsNoPeriodo = dominioDocs.filter((d) => estaDentroDoPeriodo(d.dataEmissao, dataInicio, dataFim));
    const resultado = reconciliar(siegClassificados, dominioDocsNoPeriodo);

    res.json({
      periodo: { dataInicio, dataFim },
      colunasMapeadas,
      colunasEncontradas,
      ...resultado,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Cadastro de produtos (código x descrição) — diferente da conferência acima
// (que compara totais de documento por período): aqui cruza o cadastro
// inteiro do Domínio contra todo o histórico de XML já cacheado do cliente,
// sem recorte de período, pra achar código apontando pra descrição errada
// (parametrização incorreta no Domínio).
reconciliationRouter.post('/produtos', upload.single('dominioProdutosFile'), async (req, res) => {
  try {
    const { cnpj } = req.body;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });
    if (!req.file) return res.status(400).json({ erro: 'Envie o arquivo de cadastro de produtos exportado do Domínio no campo "dominioProdutosFile".' });

    const { produtos, colunasMapeadas, colunasEncontradas } = parseDominioProdutosFile(req.file.buffer);
    const resultado = await compararCadastroProdutosComDominio(cnpj, produtos);
    if (resultado.status === 'ignorado') return res.json(resultado);

    res.json({ colunasMapeadas, colunasEncontradas, ...resultado });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});
