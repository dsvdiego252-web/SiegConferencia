import { Router } from 'express';
import multer from 'multer';
import { parseDominioFile } from '../services/dominioImportService.js';
import { obterDocumentosClassificados } from '../services/documentsService.js';
import { resolverPeriodo, estaDentroDoPeriodo } from '../services/dateUtils.js';
import { reconciliar } from '../services/reconciliationService.js';

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
