import { createClient } from '@supabase/supabase-js';
import { linhaParaDocumento, cacheDocumentosDisponivel } from './documentCache.js';

const supabase = cacheDocumentosDisponivel ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY) : null;

const TAMANHO_PAGINA = 1000;

// Todo o histórico de saída já cacheado desse cliente (emit_cnpj = cliente),
// sem recorte de período — isso é um cadastro de produtos, não um relatório
// de um mês específico. Nunca busca ao vivo na SIEG (mesmo espírito do
// painel consolidado e da auditoria do motor tributário).
async function todasSaidasCacheadasDoCliente(cnpj) {
  const todos = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('documentos_fiscais')
      .select('*')
      .eq('emit_cnpj', cnpj)
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
 * Monta um cadastro (uma linha por produto, não por venda) com a
 * classificação fiscal mais recente encontrada pra cada código de produto,
 * a partir de todo o histórico de saída já cacheado do cliente. NFS-e é
 * serviço, não produto (sem NCM/ICMS de verdade) — fica fora desse cadastro.
 */
export async function gerarCadastroProdutosSaida(cnpj) {
  if (!cacheDocumentosDisponivel) {
    return { status: 'ignorado', motivo: 'Supabase não configurado — cadastro de produtos desligado.' };
  }

  const docs = await todasSaidasCacheadasDoCliente(cnpj);
  const docsValidos = docs.filter((d) => !d.cancelada && d.tipoDocumento !== 'NFSe');

  const porProduto = new Map();
  for (const doc of docsValidos) {
    const dataEmissao = String(doc.dataEmissao || '').slice(0, 10);
    for (const item of doc.itens) {
      const codigo = String(item.codigo || '').trim();
      if (!codigo) continue;
      const atual = porProduto.get(codigo);
      if (atual && atual.dataEmissao >= dataEmissao) continue;
      porProduto.set(codigo, {
        codigo,
        descricao: item.descricao || '',
        ncm: item.ncm || '',
        cstIcms: item.icms?.cst ?? '',
        aliquotaIcms: item.icms?.aliquota ?? null,
        cstPis: item.pis?.cst ?? '',
        aliquotaPis: item.pis?.aliquota ?? null,
        cstCofins: item.cofins?.cst ?? '',
        aliquotaCofins: item.cofins?.aliquota ?? null,
        dataEmissao,
      });
    }
  }

  return {
    status: 'concluido',
    totalDocumentosAnalisados: docsValidos.length,
    produtos: [...porProduto.values()].sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true })),
  };
}
