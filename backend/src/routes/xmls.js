import { Router } from 'express';
import { obterDocumentosClassificados } from '../services/documentsService.js';
import { resolverPeriodo } from '../services/dateUtils.js';

export const xmlsRouter = Router();

xmlsRouter.get('/', async (req, res) => {
  try {
    const { cnpj } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.query);
    const classificados = await obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim });

    const documentos = classificados.map(({ doc, operacao }) => ({
      chave: doc.chave,
      operacao,
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

    res.json({
      periodo: { dataInicio, dataFim },
      totalDocumentos: documentos.length,
      totalEntrada: documentos.filter((d) => d.operacao === 'entrada').length,
      totalSaida: documentos.filter((d) => d.operacao === 'saida').length,
      totalDesconhecida: documentos.filter((d) => d.operacao === 'desconhecida').length,
      documentos,
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});
