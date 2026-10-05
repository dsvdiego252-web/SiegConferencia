import { construirMapaDeColunas, lerPlanilhaComoLinhas } from './spreadsheetReader.js';

// Cada linha aqui é um PRODUTO do cadastro (código + descrição), não um
// documento fiscal — layout diferente do relatório de notas lido por
// dominioImportService.js, mesmo vindo do mesmo sistema (Domínio).
const SINONIMOS = {
  codigo: ['codigo', 'cod produto', 'codigo produto', 'cod', 'codigo do produto', 'cod prod', 'referencia', 'cod referencia'],
  descricao: ['descricao', 'descricao produto', 'nome', 'nome produto', 'produto', 'descricao do produto', 'discriminacao', 'descricao mercadoria'],
};

const CAMPOS_OBRIGATORIOS = ['codigo', 'descricao'];

/**
 * Lê o cadastro de produtos exportado do Domínio (XLSX ou CSV) — código e
 * descrição cadastrados no sistema do contador pra cada produto — pra
 * cruzar contra a descrição real vista nos XMLs (ver
 * produtoCadastroComparisonService.js). Usada pra achar parametrização
 * errada no Domínio: um código apontando pra descrição de outro produto
 * (caso real que motivou isso — um código de carne cadastrado como água).
 */
export function parseDominioProdutosFile(buffer) {
  const linhas = lerPlanilhaComoLinhas(buffer);

  if (!linhas.length) {
    throw new Error('A planilha de cadastro de produtos está vazia ou não foi possível ler nenhuma linha.');
  }

  const headers = Object.keys(linhas[0]);
  const mapa = construirMapaDeColunas(headers, SINONIMOS);

  const faltando = CAMPOS_OBRIGATORIOS.filter((campo) => !mapa[campo]);
  if (faltando.length) {
    throw new Error(
      `Não encontrei as colunas obrigatórias (${faltando.join(', ')}) na planilha de cadastro de produtos. ` +
        `Colunas encontradas: ${headers.join(', ')}. Renomeie o cabeçalho pra algo reconhecível ` +
        `(ex.: "Código", "Descrição") e exporte de novo.`
    );
  }

  const porCodigo = new Map();
  linhas.forEach((linha, indice) => {
    const codigo = String(linha[mapa.codigo] ?? '').trim();
    if (!codigo) return;
    // Mantém só a primeira ocorrência de cada código — um cadastro de
    // produtos não deveria repetir código; se repetir (erro de exportação),
    // a primeira linha é a mais confiável de assumir.
    if (porCodigo.has(codigo)) return;
    porCodigo.set(codigo, {
      codigo,
      descricao: String(linha[mapa.descricao] ?? '').trim(),
      linhaOrigem: indice + 2, // +2: cabeçalho ocupa a linha 1 da planilha
    });
  });

  return { produtos: [...porCodigo.values()], colunasMapeadas: mapa, colunasEncontradas: headers };
}
