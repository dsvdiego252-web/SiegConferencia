function mesReferencia(dataEmissao) {
  if (!dataEmissao) return 'desconhecido';
  return String(dataEmissao).slice(0, 7); // "AAAA-MM"
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Cruza os documentos (já normalizados e classificados em entrada/saída)
 * e agrega, por mês e por produto (NCM), quanto entrou e quanto saiu em
 * valor de produto e em cada tributo. Isso é a base para comparar se a
 * tributação de saída está compatível com o que entrou (ex.: crédito x
 * débito de ICMS, substituição tributária, margem etc.).
 */
export function cruzarTributacao(docsClassificados) {
  const porMes = new Map();

  for (const { doc, operacao } of docsClassificados) {
    if (operacao !== 'entrada' && operacao !== 'saida') continue;
    const mes = mesReferencia(doc.dataEmissao);

    if (!porMes.has(mes)) porMes.set(mes, { mes, produtos: new Map(), totais: criarAcumulador() });
    const bucketMes = porMes.get(mes);
    somarNoAcumulador(bucketMes.totais, doc, operacao);

    for (const item of doc.itens) {
      const chaveProduto = item.ncm || item.codigo || item.descricao;
      if (!bucketMes.produtos.has(chaveProduto)) {
        bucketMes.produtos.set(chaveProduto, {
          ncm: item.ncm,
          descricaoExemplo: item.descricao,
          entrada: criarAcumuladorItens(),
          saida: criarAcumuladorItens(),
        });
      }
      const bucketProduto = bucketMes.produtos.get(chaveProduto);
      somarItemNoAcumulador(bucketProduto[operacao], item);
    }
  }

  return [...porMes.values()]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((bucket) => ({
      mes: bucket.mes,
      totais: arredondarAcumulador(bucket.totais),
      produtos: [...bucket.produtos.values()]
        .map((p) => ({
          ncm: p.ncm,
          descricaoExemplo: p.descricaoExemplo,
          entrada: arredondarAcumulador(p.entrada),
          saida: arredondarAcumulador(p.saida),
          saldoQuantidade: round2(p.saida.quantidade - p.entrada.quantidade),
        }))
        .sort((a, b) => (b.saida.valorProduto + b.entrada.valorProduto) - (a.saida.valorProduto + a.entrada.valorProduto)),
    }));
}

function criarAcumulador() {
  return {
    entrada: criarAcumuladorItens(),
    saida: criarAcumuladorItens(),
    qtdDocumentos: { entrada: 0, saida: 0 },
  };
}

function criarAcumuladorItens() {
  return { quantidade: 0, valorProduto: 0, valorIcms: 0, valorPis: 0, valorCofins: 0 };
}

function somarNoAcumulador(acc, doc, operacao) {
  acc.qtdDocumentos[operacao] += 1;
  for (const item of doc.itens) {
    somarItemNoAcumulador(acc[operacao], item);
  }
}

function somarItemNoAcumulador(acc, item) {
  acc.quantidade += item.quantidade;
  acc.valorProduto += item.valorProduto;
  acc.valorIcms += item.icms.valor;
  acc.valorPis += item.pis.valor;
  acc.valorCofins += item.cofins.valor;
}

function arredondarAcumulador(acc) {
  if (typeof acc === 'number') return round2(acc);
  if (acc && typeof acc === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(acc)) out[k] = arredondarAcumulador(v);
    return out;
  }
  return acc;
}
