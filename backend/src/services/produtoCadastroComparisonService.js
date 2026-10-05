import { gerarCadastroProdutos } from './productCatalogService.js';

// Mesmo espírito de normalização usada em várias partes do projeto (ex.:
// documentCache.js) — maiúsculas, sem acento, sem pontuação — pra comparar
// texto sem pequenas diferenças de formatação contarem como divergência.
function normalizarDescricao(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function tokens(texto) {
  return normalizarDescricao(texto).split(' ').filter(Boolean);
}

// Duas palavras "combinam" se forem iguais, ou se uma for prefixo da outra
// com pelo menos 3 letras — cobre abreviação comum em descrição de produto
// (“BOV” por “BOVINA”, “RESF” por “RESFRIADA”) sem exigir igualdade exata,
// que quase nunca acontece entre o cadastro e o XML pro mesmo produto.
function palavrasCombinam(a, b) {
  if (a === b) return true;
  return a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a));
}

// Similaridade por sobreposição de palavras (variante de Jaccard, com
// "combinam" no lugar de igualdade exata) em vez de comparação exata — duas
// descrições do mesmo produto quase nunca são idênticas caractere a
// caractere (abreviações, ordem das palavras, unidade no fim), mas
// compartilham a maioria das palavras. Um código apontando pro produto
// errado (o caso real que motivou isso: "CAPA COXÃO MOLE" x "Agua da Fors")
// não compartilha nenhuma palavra significativa.
function similaridade(a, b) {
  const ta = [...new Set(tokens(a))];
  const tb = [...new Set(tokens(b))];
  if (!ta.length && !tb.length) return 1;
  if (!ta.length || !tb.length) return 0;

  const tbDisponiveis = [...tb];
  let combinacoes = 0;
  for (const tokenA of ta) {
    const indice = tbDisponiveis.findIndex((tokenB) => palavrasCombinam(tokenA, tokenB));
    if (indice !== -1) {
      combinacoes += 1;
      tbDisponiveis.splice(indice, 1);
    }
  }
  const uniao = ta.length + tb.length - combinacoes;
  return combinacoes / uniao;
}

// Abaixo de 1/3 das palavras em comum, trata como provavelmente o produto
// errado — acima disso, variações normais de escrita (abreviação, ordem,
// unidade) não devem ser reportadas como se fossem erro de parametrização.
const LIMIAR_DIVERGENCIA = 0.34;

/**
 * Cruza o cadastro de produtos do Domínio (código + descrição, lido por
 * dominioProdutosImportService.js) com a descrição real vista nos XMLs já
 * cacheados desse cliente (ver productCatalogService.js — mesmo código em
 * saída e entrada é mesclado, ficando com a ocorrência de data mais
 * recente), pra achar código cadastrado com a descrição de outro produto.
 */
export async function compararCadastroProdutosComDominio(cnpj, produtosDominio) {
  const cadastro = await gerarCadastroProdutos(cnpj);
  if (cadastro.status !== 'concluido') return cadastro;

  const porCodigoXml = new Map();
  for (const produto of [...cadastro.saida.produtos, ...cadastro.entrada.produtos]) {
    const atual = porCodigoXml.get(produto.codigo);
    if (!atual || (produto.dataEmissao || '') >= (atual.dataEmissao || '')) {
      porCodigoXml.set(produto.codigo, produto);
    }
  }

  const comparados = [];
  const somenteDominio = [];
  for (const produtoDominio of produtosDominio) {
    const xml = porCodigoXml.get(produtoDominio.codigo);
    if (!xml) {
      somenteDominio.push(produtoDominio);
      continue;
    }
    const sim = Math.round(similaridade(produtoDominio.descricao, xml.descricao) * 100) / 100;
    comparados.push({
      codigo: produtoDominio.codigo,
      descricaoDominio: produtoDominio.descricao,
      descricaoXml: xml.descricao,
      ncm: xml.ncm,
      similaridade: sim,
      divergente: sim < LIMIAR_DIVERGENCIA,
    });
  }

  const codigosDominio = new Set(produtosDominio.map((p) => p.codigo));
  const somenteXml = [...porCodigoXml.values()].filter((p) => !codigosDominio.has(p.codigo));

  const porCodigoAsc = (a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true });

  return {
    status: 'concluido',
    totalDominio: produtosDominio.length,
    totalXml: porCodigoXml.size,
    totalComparados: comparados.length,
    totalDivergentes: comparados.filter((c) => c.divergente).length,
    divergentes: comparados.filter((c) => c.divergente).sort(porCodigoAsc),
    conformes: comparados.filter((c) => !c.divergente).sort(porCodigoAsc),
    somenteDominio: somenteDominio.sort(porCodigoAsc),
    somenteXml: somenteXml.sort(porCodigoAsc),
  };
}
