import { createClient } from '@supabase/supabase-js';
import { linhaParaDocumento, cacheDocumentosDisponivel } from './documentCache.js';
import { classificarOperacao } from './xmlParser.js';

const supabase = cacheDocumentosDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

const TAMANHO_PAGINA = 1000;

// Todo o histórico já cacheado em que o cliente aparece como emitente OU
// destinatário, sem recorte de período — isso é um cadastro de produtos, não
// um relatório de um mês específico. Nunca busca ao vivo na SIEG (mesmo
// espírito do painel consolidado e da auditoria do motor tributário).
async function todosDocumentosCacheadosDoCliente(cnpj) {
  const todos = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('documentos_fiscais')
      .select('*')
      .or(`emit_cnpj.eq.${cnpj},dest_cnpj.eq.${cnpj}`)
      .range(offset, offset + TAMANHO_PAGINA - 1);
    if (error) throw new Error(`Falha ao ler documentos cacheados pro cadastro de produtos: ${error.message}`);
    todos.push(...(data || []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    offset += TAMANHO_PAGINA;
  }
  const porChave = new Map(todos.map((linha) => [linha.chave, linha]));
  return [...porChave.values()].map(linhaParaDocumento);
}

/**
 * Monta um cadastro (uma linha por produto, não por venda/compra) com a
 * classificação fiscal mais recente encontrada pra cada código de produto,
 * a partir da lista de documentos já filtrada (saída ou entrada).
 */
function montarCadastroProdutos(docs) {
  const porProduto = new Map();
  for (const doc of docs) {
    const dataEmissao = String(doc.dataEmissao || '').slice(0, 10);
    for (const item of doc.itens) {
      const codigo = String(item.codigo || '').trim();
      if (!codigo) continue;
      const atual = porProduto.get(codigo);
      if (atual && atual.dataEmissao >= dataEmissao) continue;
      const reforma = item.reformaTributaria;
      porProduto.set(codigo, {
        codigo,
        descricao: item.descricao || '',
        ncm: item.ncm || '',
        cest: item.cest || '',
        cstIcms: item.icms?.cst ?? '',
        aliquotaIcms: item.icms?.aliquota ?? null,
        cBenefIcms: item.icms?.cBenef ?? '',
        cstPis: item.pis?.cst ?? '',
        aliquotaPis: item.pis?.aliquota ?? null,
        cstCofins: item.cofins?.cst ?? '',
        aliquotaCofins: item.cofins?.aliquota ?? null,
        // Campos da Reforma Tributária (IBS/CBS, NT 2025.002) — presente=false
        // significa que o item não tem esse grupo no XML (emissor desatualizado
        // ou documento anterior à adequação), não que a alíquota é zero.
        reformaPreenchida: reforma?.presente ?? false,
        cstReforma: reforma?.cst ?? '',
        classTribReforma: reforma?.classTrib ?? '',
        cBenefReforma: reforma?.cBenef ?? '',
        aliquotaIbsUf: reforma?.ibsUf?.percentual ?? null,
        aliquotaIbsMunicipio: reforma?.ibsMunicipio?.percentual ?? null,
        aliquotaCbs: reforma?.cbs?.percentual ?? null,
        dataEmissao,
      });
    }
  }
  return [...porProduto.values()].sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }));
}

/**
 * Cadastro de produtos (saída e entrada, cada um na sua própria lista) a
 * partir de todo o histórico já cacheado do cliente — uma linha por produto
 * único, não por venda/compra. NFS-e é serviço, não produto (sem NCM/ICMS de
 * verdade) — fica fora dos dois cadastros, assim como documentos cancelados.
 */
export async function gerarCadastroProdutos(cnpj) {
  if (!cacheDocumentosDisponivel) {
    return { status: 'ignorado', motivo: 'Supabase não configurado — cadastro de produtos desligado.' };
  }

  const docs = await todosDocumentosCacheadosDoCliente(cnpj);
  const docsValidos = docs.filter((d) => !d.cancelada && d.tipoDocumento !== 'NFSe');
  const classificados = docsValidos.map((doc) => ({ doc, operacao: classificarOperacao(doc, cnpj) }));
  const docsSaida = classificados.filter((c) => c.operacao === 'saida').map((c) => c.doc);
  const docsEntrada = classificados.filter((c) => c.operacao === 'entrada').map((c) => c.doc);

  return {
    status: 'concluido',
    saida: { totalDocumentosAnalisados: docsSaida.length, produtos: montarCadastroProdutos(docsSaida) },
    entrada: { totalDocumentosAnalisados: docsEntrada.length, produtos: montarCadastroProdutos(docsEntrada) },
  };
}
