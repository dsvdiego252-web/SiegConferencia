const TOLERANCIA_VALOR = 0.05; // diferenças de centavos por arredondamento não contam como divergência

function normalizarChave(chave) {
  return String(chave || '').replace(/\D/g, '');
}

function chaveComposta(numero, serie, operacao) {
  return `${numero}|${serie}|${operacao}`;
}

function somarTributosItens(doc) {
  return doc.itens.reduce(
    (acc, item) => ({
      pis: acc.pis + item.pis.valor,
      cofins: acc.cofins + item.cofins.valor,
    }),
    { pis: 0, cofins: 0 }
  );
}

function normalizarSieg(siegClassificados) {
  return siegClassificados
    .filter(({ operacao }) => operacao === 'entrada' || operacao === 'saida')
    .map(({ doc, operacao }) => {
      const tributos = somarTributosItens(doc);
      return {
        origem: 'sieg',
        chave: normalizarChave(doc.chave),
        numero: doc.numero,
        serie: doc.serie,
        operacao,
        dataEmissao: (doc.dataEmissao || '').slice(0, 10),
        valorTotal: doc.valorTotal,
        valorIcms: doc.valorIcmsTotal,
        valorPis: tributos.pis,
        valorCofins: tributos.cofins,
        cancelada: doc.cancelada,
      };
    });
}

function normalizarDominio(dominioDocs) {
  return dominioDocs
    .filter((d) => d.operacao === 'entrada' || d.operacao === 'saida')
    .map((d) => ({
      origem: 'dominio',
      chave: normalizarChave(d.chave),
      numero: d.numero,
      serie: d.serie,
      operacao: d.operacao,
      dataEmissao: d.dataEmissao,
      valorTotal: d.valorTotal,
      valorIcms: d.valorIcms,
      valorPis: d.valorPis,
      valorCofins: d.valorCofins,
      linhaOrigem: d.linhaOrigem,
    }));
}

function diferencaRelevante(a, b) {
  return Math.abs((a || 0) - (b || 0)) > TOLERANCIA_VALOR;
}

/**
 * Cruza os documentos já baixados/parseados da SIEG (XML real) com o que
 * foi importado da planilha exportada do Domínio, para apontar:
 *  - notas que a SIEG já tem mas ainda não foram lançadas no Domínio;
 *  - lançamentos no Domínio sem XML correspondente na SIEG;
 *  - documentos que existem nos dois lados mas com valores divergentes.
 *
 * O pareamento é feito prioritariamente pela chave de acesso (44 dígitos);
 * quando a planilha do Domínio não traz a chave, cai para o par
 * (número, série, operação), que é a segunda melhor aproximação disponível.
 */
export function reconciliar(siegClassificados, dominioDocs) {
  const sieg = normalizarSieg(siegClassificados);
  const dominio = normalizarDominio(dominioDocs);

  const siegPorChave = new Map(sieg.filter((d) => d.chave).map((d) => [d.chave, d]));
  const dominioPorChave = new Map(dominio.filter((d) => d.chave).map((d) => [d.chave, d]));

  const siegPorComposto = new Map(sieg.map((d) => [chaveComposta(d.numero, d.serie, d.operacao), d]));
  const dominioPorComposto = new Map(dominio.map((d) => [chaveComposta(d.numero, d.serie, d.operacao), d]));

  const dominioUsados = new Set();
  const pareados = [];
  const somenteSieg = [];

  for (const docSieg of sieg) {
    let par = docSieg.chave ? dominioPorChave.get(docSieg.chave) : null;
    if (!par) par = dominioPorComposto.get(chaveComposta(docSieg.numero, docSieg.serie, docSieg.operacao));

    if (!par || dominioUsados.has(par)) {
      somenteSieg.push(docSieg);
      continue;
    }

    dominioUsados.add(par);
    const divergente =
      diferencaRelevante(docSieg.valorTotal, par.valorTotal) ||
      diferencaRelevante(docSieg.valorIcms, par.valorIcms);

    pareados.push({
      numero: docSieg.numero,
      serie: docSieg.serie,
      operacao: docSieg.operacao,
      dataEmissao: docSieg.dataEmissao,
      divergente,
      sieg: { valorTotal: docSieg.valorTotal, valorIcms: docSieg.valorIcms, valorPis: docSieg.valorPis, valorCofins: docSieg.valorCofins },
      dominio: { valorTotal: par.valorTotal, valorIcms: par.valorIcms, valorPis: par.valorPis, valorCofins: par.valorCofins, linhaOrigem: par.linhaOrigem },
      diffValorTotal: Math.round((par.valorTotal - docSieg.valorTotal) * 100) / 100,
      diffValorIcms: Math.round((par.valorIcms - docSieg.valorIcms) * 100) / 100,
    });
  }

  const somenteDominio = dominio.filter((d) => !dominioUsados.has(d));

  const resumoPorMes = construirResumoPorMes(sieg, dominio);

  return {
    totalSieg: sieg.length,
    totalDominio: dominio.length,
    totalPareados: pareados.length,
    totalDivergentes: pareados.filter((p) => p.divergente).length,
    pareados: pareados.sort((a, b) => (a.dataEmissao || '').localeCompare(b.dataEmissao || '')),
    somenteSieg: somenteSieg.sort((a, b) => (a.dataEmissao || '').localeCompare(b.dataEmissao || '')),
    somenteDominio: somenteDominio.sort((a, b) => (a.dataEmissao || '').localeCompare(b.dataEmissao || '')),
    resumoPorMes,
  };
}

function construirResumoPorMes(sieg, dominio) {
  const meses = new Map();

  const acumular = (lista, origem) => {
    for (const d of lista) {
      const mes = (d.dataEmissao || '').slice(0, 7) || 'desconhecido';
      if (!meses.has(mes)) {
        meses.set(mes, {
          mes,
          sieg: { entrada: 0, saida: 0 },
          dominio: { entrada: 0, saida: 0 },
        });
      }
      if (d.operacao === 'entrada' || d.operacao === 'saida') {
        meses.get(mes)[origem][d.operacao] += d.valorTotal;
      }
    }
  };

  acumular(sieg, 'sieg');
  acumular(dominio, 'dominio');

  return [...meses.values()]
    .map((m) => ({
      mes: m.mes,
      sieg: { entrada: round2(m.sieg.entrada), saida: round2(m.sieg.saida) },
      dominio: { entrada: round2(m.dominio.entrada), saida: round2(m.dominio.saida) },
      diferenca: {
        entrada: round2(m.dominio.entrada - m.sieg.entrada),
        saida: round2(m.dominio.saida - m.sieg.saida),
      },
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
