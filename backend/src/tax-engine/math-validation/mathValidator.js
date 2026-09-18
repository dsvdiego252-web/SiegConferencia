// Motor de Validação Matemática — primeiro módulo do motor tributário
// central (ver /backend/src/tax-engine). Propositalmente o mais simples de
// todos: não decide qual É a tributação correta (isso é trabalho dos
// motores de Mercadorias/Serviços/Reforma, ainda não implementados) — só
// recalcula os valores a partir dos próprios campos do XML (quantidade,
// base, alíquota) e confere se a aritmética do documento fecha.
//
// Puramente determinístico e sem dependência de tabelas fiscais externas
// (NCM, CST×cClassTrib etc.) — por isso é o ponto de partida seguro: dá pra
// confiar 100% no resultado sem precisar de nenhuma base de regras ainda
// não carregada no sistema.

const TOLERANCIA_ITEM_PADRAO = 0.02; // diferença de arredondamento aceitável por item
const TOLERANCIA_TOTAL_PADRAO = 0.05; // diferença aceitável ao somar vários itens

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function avaliarStatus(diferencaAbsoluta, tolerancia) {
  if (diferencaAbsoluta === 0) return 'CORRETO';
  if (diferencaAbsoluta <= tolerancia) return 'DIVERGENCIA_ARREDONDAMENTO';
  return 'DIVERGENCIA_CALCULO';
}

function compararValores(esperado, xml, tolerancia = TOLERANCIA_ITEM_PADRAO) {
  const esperadoArred = round2(esperado);
  const xmlArred = round2(xml);
  const diferenca = round2(xmlArred - esperadoArred);
  return { esperado: esperadoArred, xml: xmlArred, diferenca, status: avaliarStatus(Math.abs(diferenca), tolerancia) };
}

function statusMaisGrave(statusList) {
  if (statusList.includes('DIVERGENCIA_CALCULO')) return 'DIVERGENCIA_CALCULO';
  if (statusList.includes('DIVERGENCIA_ARREDONDAMENTO')) return 'DIVERGENCIA_ARREDONDAMENTO';
  return 'CORRETO';
}

/**
 * Recalcula produto (quantidade × valor unitário) e os impostos com
 * base × alíquota conhecidas (ICMS, PIS, COFINS) de um item, comparando com
 * o que o emissor informou. Impostos sem base/alíquota informadas (isento,
 * substituição tributária, CSOSN sem destaque etc.) não têm como ser
 * recalculados por aqui — ficam de fora do resultado (null) em vez de gerar
 * um falso positivo comparando contra zero.
 */
export function validarItem(item) {
  const produto = compararValores(item.quantidade * item.valorUnitario, item.valorProduto);

  const icms =
    item.icms.baseCalculo > 0 && item.icms.aliquota > 0
      ? compararValores(item.icms.baseCalculo * (item.icms.aliquota / 100), item.icms.valor)
      : null;

  const pis =
    item.pis.baseCalculo > 0 && item.pis.aliquota > 0
      ? compararValores(item.pis.baseCalculo * (item.pis.aliquota / 100), item.pis.valor)
      : null;

  const cofins =
    item.cofins.baseCalculo > 0 && item.cofins.aliquota > 0
      ? compararValores(item.cofins.baseCalculo * (item.cofins.aliquota / 100), item.cofins.valor)
      : null;

  const status = statusMaisGrave([produto, icms, pis, cofins].filter(Boolean).map((c) => c.status));

  return { produto, icms, pis, cofins, status };
}

/**
 * Valida um documento inteiro: recalcula cada item e confere se a soma dos
 * itens reconcilia com os totais informados no cabeçalho do documento
 * (vProd, vICMS, vPIS, vCOFINS). Não reconcilia o valor final da nota
 * (vNF) — essa fórmula soma/subtrai frete, seguro, desconto, IPI, outras
 * despesas etc. em combinações que variam por documento, e vale mais a
 * pena implementar depois com confirmação exata do leiaute do que arriscar
 * uma fórmula genérica errada aqui.
 */
export function validarDocumento(doc) {
  const itens = doc.itens.map((item, indice) => ({
    numeroItem: item.numeroItem ?? indice + 1,
    ...validarItem(item),
  }));

  const somar = (campo) => round2(doc.itens.reduce((acc, item) => acc + campo(item), 0));

  const totais = {
    produtos: renomearTotal(compararValores(somar((i) => i.valorProduto), doc.valorProdutosTotal, TOLERANCIA_TOTAL_PADRAO)),
    icms: renomearTotal(compararValores(somar((i) => i.icms.valor), doc.valorIcmsTotal, TOLERANCIA_TOTAL_PADRAO)),
    pis: renomearTotal(compararValores(somar((i) => i.pis.valor), doc.valorPisTotal, TOLERANCIA_TOTAL_PADRAO)),
    cofins: renomearTotal(compararValores(somar((i) => i.cofins.valor), doc.valorCofinsTotal, TOLERANCIA_TOTAL_PADRAO)),
  };

  const status = statusMaisGrave([...itens.map((i) => i.status), ...Object.values(totais).map((t) => t.status)]);

  return { itens, totais, status };
}

// compararValores() usa "esperado"/"xml" genericamente; nos totais do
// documento o que se compara é "soma dos itens" x "total declarado no
// cabeçalho" — renomeia só pra deixar isso explícito pra quem consome o
// resultado (frontend, relatórios etc.).
function renomearTotal({ esperado, xml, diferenca, status }) {
  return { somaItens: esperado, totalDocumento: xml, diferenca, status };
}
