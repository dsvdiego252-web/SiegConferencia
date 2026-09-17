import { Router } from 'express';
import { obterDocumentosClassificados } from '../services/documentsService.js';
import { resolverPeriodo } from '../services/dateUtils.js';
import { detectarQuebrasDeSequencia } from '../services/sequenceAnalyzer.js';
import { cruzarTributacao } from '../services/taxAnalyzer.js';
import { analisarConformidadeReforma } from '../services/reformaTributariaAnalyzer.js';

export const painelRouter = Router();

// Reúne documentos + sequência + tributação + reforma tributária numa única
// busca à SIEG. As análises antigas em /api/xmls e /api/analysis/* cada uma
// buscava os XMLs de novo — 4 chamadas paralelas do front geravam 4 buscas
// completas à SIEG pra uma única atualização de tela, estourando o limite
// real de 2 requisições/minuto por chave muito rápido.
painelRouter.get('/', async (req, res) => {
  try {
    const { cnpj } = req.query;
    if (!cnpj) return res.status(400).json({ erro: 'Informe o parâmetro "cnpj".' });

    const { dataInicio, dataFim } = resolverPeriodo(req.query);
    const classificados = await obterDocumentosClassificados({ clienteCnpj: cnpj, dataInicio, dataFim });

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

    res.json({
      periodo: { dataInicio, dataFim },
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
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});
