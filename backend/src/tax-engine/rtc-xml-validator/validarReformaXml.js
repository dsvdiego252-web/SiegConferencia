// XML_REFORMA_VALIDATOR — primeira versão, escopo A do plano apresentado ao
// usuário (ver conversa): confere se os campos de IBS/CBS que o PRÓPRIO XML
// declara (CST, cClassTrib, percentuais, reduções, valores) são
// internamente coerentes com a tabela oficial de tratamentos carregada em
// tax-engine/legal-rules/data/classification/treatments.json.
//
// O QUE ESTE MÓDULO NÃO FAZ (ainda): não determina qual É o benefício
// correto para o produto/serviço (isso depende do Motor de Mercadorias/
// Serviços, que usa NCM + descrição + regras legais — ainda não
// implementado). Por isso nunca gera CST_IBSCBS_INCORRETO nem
// CCLASSTRIB_INCORRETO "porque o produto deveria ser outro código" — só
// aponta quando o cClassTrib informado no XML não bate com o CST que a
// própria tabela associa a ele (isso não exige saber o produto, só a
// tabela). Quando o cClassTrib nem consta na tabela carregada (que tem
// apenas 26 tratamentos, um subconjunto), o resultado é REVISAO_MANUAL —
// ausência na nossa tabela não significa código errado.
//
// Também não valida diferimento, crédito presumido, tributação regular
// (gTribRegular) nem monofásico (gIBSCBSMono) em detalhe — a base de dados
// atual não trouxe as regras de cálculo desses grupos — e não calcula
// Imposto Seletivo (a própria base confirma: alíquota pendente de lei
// ordinária, LC 214/2025 art. 409/422). Esses pontos ficam sinalizados
// como nota informativa, nunca como divergência.

import { getClassification, getTax } from '../legal-rules/repository.js';
import { DATA_CORTE_PADRAO } from '../../services/reformaTributariaAnalyzer.js';

const TOLERANCIA_PADRAO = 0.02;

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function numeroOuNull(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

let indicesCache = null;

function obterIndices() {
  if (indicesCache) return indicesCache;
  const { treatments } = getClassification();
  const byPair = new Map();
  const byClassTrib = new Map();
  for (const linha of treatments) {
    const [classTrib, cst, tratamento, percReducaoIbs, percReducaoCbs, fundamento, descricao] = linha;
    const registro = {
      classTrib: Number(classTrib),
      cst: Number(cst),
      tratamento,
      percReducaoIbs: numeroOuNull(percReducaoIbs),
      percReducaoCbs: numeroOuNull(percReducaoCbs),
      fundamento,
      descricao,
    };
    byPair.set(`${registro.classTrib}|${registro.cst}`, registro);
    if (!byClassTrib.has(registro.classTrib)) byClassTrib.set(registro.classTrib, registro);
  }
  indicesCache = { byPair, byClassTrib };
  return indicesCache;
}

let regrasSeletivoCache = null;

function ncmCandidataASeletivo(ncm) {
  if (!ncm) return null;
  if (!regrasSeletivoCache) regrasSeletivoCache = getTax().selectiveTaxRules;
  const ncmLimpo = String(ncm).replace(/\D/g, '');
  return (
    regrasSeletivoCache.find((regra) => {
      const codigo = String(regra.code || '');
      return regra.match_type === 'EXATO' ? ncmLimpo === codigo : ncmLimpo.startsWith(codigo);
    }) || null
  );
}

function compararComTolerancia(esperado, informado, tolerancia = TOLERANCIA_PADRAO) {
  if (esperado === null || informado === null) return null;
  const diferenca = round2(informado - esperado);
  return { esperado: round2(esperado), informado: round2(informado), diferenca, ok: Math.abs(diferenca) <= tolerancia };
}

// Confere um grupo (ibsUf/ibsMunicipio/cbs): recalcula valor = base * alíquota
// aplicada (a alíquota efetiva, se houver redução; senão a nominal) usando
// os próprios campos do XML — não depende de saber se a alíquota está
// legalmente correta, só se a conta fecha. Quando a alíquota vier zerada
// mas houver valor informado, o problema não é "conta errada" — é que o
// XML não trouxe o percentual (campo ausente), então não dá pra recalcular
// com confiança; sinaliza isso separadamente em vez de acusar divergência.
function conferirCalculoGrupo(grupo, vbc) {
  if (!grupo || vbc === null) return null;
  const aliquotaAplicada = grupo.reducao?.pAliqEfet ?? grupo.percentual;
  if (!(aliquotaAplicada >= 0) || !(vbc >= 0)) return null;
  if (aliquotaAplicada === 0 && grupo.valor > TOLERANCIA_PADRAO) return { percentualAusente: true };
  return compararComTolerancia(vbc * (aliquotaAplicada / 100), grupo.valor);
}

function statusMaisGrave(candidatos) {
  const prioridade = [
    'CST_CCLASSTRIB_INCOMPATIVEL',
    'BENEFICIO_APLICADO_INDEVIDAMENTE',
    'BENEFICIO_NAO_APLICADO',
    'REDUCAO_INCORRETA',
    'CALCULO_IBS_INCORRETO',
    'CALCULO_CBS_INCORRETO',
    'REVISAO_MANUAL',
    'CORRETO',
  ];
  for (const status of prioridade) {
    if (candidatos.includes(status)) return status;
  }
  return 'REVISAO_MANUAL';
}

/**
 * Valida os campos de Reforma Tributária de um item já normalizado pelo
 * xmlParser (item.reformaTributaria). Retorna null quando o grupo IBSCBS
 * nem está presente no XML — esse caso já é tratado pela análise de
 * conformidade (reformaTributariaAnalyzer), que aponta "sem adequação".
 */
export function validarReformaItem(item, dataEmissaoDocumento, dataCorte = DATA_CORTE_PADRAO) {
  const r = item?.reformaTributaria;
  if (!r || !r.presente) return null;

  if (dataEmissaoDocumento && String(dataEmissaoDocumento).slice(0, 10) < dataCorte) {
    return { status: 'REVISAO_MANUAL', notas: ['Documento anterior à vigência considerada (antes de ' + dataCorte + ') — validação não aplicada.'], divergencias: [] };
  }

  if (r.monofasico) {
    return {
      status: 'REVISAO_MANUAL',
      notas: ['Item monofásico (gIBSCBSMono) — estrutura própria ainda não validada por este módulo.'],
      divergencias: [],
    };
  }

  const { byPair, byClassTrib } = obterIndices();
  const classTrib = numeroOuNull(r.classTrib);
  const cst = numeroOuNull(r.cst);
  const notas = [];
  const divergencias = [];
  const candidatosStatus = [];

  let tratamento = null;
  if (classTrib === null) {
    notas.push('cClassTrib ausente ou não numérico no XML.');
    candidatosStatus.push('REVISAO_MANUAL');
  } else {
    const par = byPair.get(`${classTrib}|${cst}`);
    if (par) {
      tratamento = par;
    } else {
      const porClassTrib = byClassTrib.get(classTrib);
      if (porClassTrib) {
        divergencias.push(
          `cClassTrib ${r.classTrib} está associado a CST ${porClassTrib.cst} na tabela de referência, mas o XML informa CST ${r.cst}.`
        );
        candidatosStatus.push('CST_CCLASSTRIB_INCOMPATIVEL');
        tratamento = porClassTrib;
      } else {
        notas.push(
          `cClassTrib ${r.classTrib} não consta na tabela de referência carregada (26 tratamentos) — ausência não significa código incorreto, apenas que este módulo não pode confirmar automaticamente.`
        );
        candidatosStatus.push('REVISAO_MANUAL');
      }
    }
  }

  if (tratamento) {
    const percIbs = tratamento.percReducaoIbs;
    const percCbs = tratamento.percReducaoCbs;
    const possuiBeneficio = (percIbs !== null && percIbs > 0) || (percCbs !== null && percCbs > 0);

    for (const [nomeGrupo, grupo, percEsperado] of [
      ['IBS UF', r.ibsUf, percIbs],
      ['IBS Município', r.ibsMunicipio, percIbs],
      ['CBS', r.cbs, percCbs],
    ]) {
      if (percEsperado === null) continue; // ex.: PROUNI (VARIÁVEL) — não avaliado
      const temReducao = Boolean(grupo?.reducao);
      if (percEsperado === 0 && temReducao) {
        divergencias.push(`${nomeGrupo}: tratamento "${tratamento.tratamento}" não prevê redução, mas o XML informa grupo de redução.`);
        candidatosStatus.push('BENEFICIO_APLICADO_INDEVIDAMENTE');
      } else if (percEsperado > 0 && !temReducao && grupo && percEsperado < 100) {
        divergencias.push(`${nomeGrupo}: tratamento "${tratamento.tratamento}" prevê redução de ${percEsperado}%, mas o XML não informa grupo de redução.`);
        candidatosStatus.push('BENEFICIO_NAO_APLICADO');
      } else if (percEsperado > 0 && temReducao) {
        const cmp = compararComTolerancia(percEsperado, grupo.reducao.pRedAliq, 0.01);
        if (cmp && !cmp.ok) {
          divergencias.push(`${nomeGrupo}: percentual de redução informado (${cmp.informado}%) diverge do previsto (${cmp.esperado}%).`);
          candidatosStatus.push('REDUCAO_INCORRETA');
        }
      }
    }

    notas.push(`Tratamento na tabela de referência: ${tratamento.tratamento} (${tratamento.fundamento}) — ${possuiBeneficio ? 'com' : 'sem'} benefício.`);
  }

  const vbc = r.valorBaseCalculo || null;
  for (const [nomeGrupo, calculo, statusCalculo] of [
    ['IBS UF', conferirCalculoGrupo(r.ibsUf, vbc), 'CALCULO_IBS_INCORRETO'],
    ['IBS Município', conferirCalculoGrupo(r.ibsMunicipio, vbc), 'CALCULO_IBS_INCORRETO'],
    ['CBS', conferirCalculoGrupo(r.cbs, vbc), 'CALCULO_CBS_INCORRETO'],
  ]) {
    if (!calculo) continue;
    if (calculo.percentualAusente) {
      notas.push(`${nomeGrupo}: há valor informado mas o percentual não veio no XML — não é possível recalcular.`);
      candidatosStatus.push('REVISAO_MANUAL');
    } else if (!calculo.ok) {
      divergencias.push(`${nomeGrupo}: valor informado (${calculo.informado}) diverge do recalculado (${calculo.esperado}).`);
      candidatosStatus.push(statusCalculo);
    }
  }

  const somaIbsUfMun = (r.ibsUf?.valor || 0) + (r.ibsMunicipio?.valor || 0);
  const totalIbsInformado = r.valorIbs;
  const calculoIbsTotal =
    r.ibsUf || r.ibsMunicipio ? compararComTolerancia(somaIbsUfMun, totalIbsInformado) : null;
  if (calculoIbsTotal && !calculoIbsTotal.ok) {
    divergencias.push(`IBS total: soma UF+Município (${calculoIbsTotal.esperado}) diverge do valor total informado (${calculoIbsTotal.informado}).`);
    candidatosStatus.push('CALCULO_IBS_INCORRETO');
  }

  const seletivo = ncmCandidataASeletivo(item.ncm);
  if (seletivo) {
    notas.push(
      `NCM candidata a Imposto Seletivo (${seletivo.category}, ${seletivo.ncm_display}) — alíquota pendente de lei ordinária (LC 214/2025); não validado.`
    );
  }

  if (candidatosStatus.length === 0) candidatosStatus.push('CORRETO');

  return { status: statusMaisGrave(candidatosStatus), notas, divergencias };
}

export function validarReformaDocumento(doc, dataCorte = DATA_CORTE_PADRAO) {
  const itens = doc.itens.map((item, indice) => ({
    numeroItem: item.numeroItem ?? indice + 1,
    validacao: validarReformaItem(item, doc.dataEmissao, dataCorte),
  }));

  const totalItem = { valorIbs: 0, valorCbs: 0, houveItemComGrupo: false };
  for (const item of doc.itens) {
    if (item.reformaTributaria?.presente) {
      totalItem.houveItemComGrupo = true;
      totalItem.valorIbs = round2(totalItem.valorIbs + (item.reformaTributaria.valorIbs || 0));
      totalItem.valorCbs = round2(totalItem.valorCbs + (item.reformaTributaria.valorCbs || 0));
    }
  }

  const divergenciasTotais = [];
  if (totalItem.houveItemComGrupo && doc.reformaTributariaTotal) {
    const cmpIbs = compararComTolerancia(totalItem.valorIbs, doc.reformaTributariaTotal.valorIbs, 0.05);
    const cmpCbs = compararComTolerancia(totalItem.valorCbs, doc.reformaTributariaTotal.valorCbs, 0.05);
    if (cmpIbs && !cmpIbs.ok) divergenciasTotais.push(`IBS do documento: soma dos itens (${cmpIbs.esperado}) diverge do total informado (${cmpIbs.informado}).`);
    if (cmpCbs && !cmpCbs.ok) divergenciasTotais.push(`CBS do documento: soma dos itens (${cmpCbs.esperado}) diverge do total informado (${cmpCbs.informado}).`);
  }

  const statusGeral = itens.some((i) => i.validacao && !['CORRETO', 'REVISAO_MANUAL'].includes(i.validacao.status))
    ? 'DIVERGENTE'
    : divergenciasTotais.length > 0
      ? 'TOTAL_REFORMA_DIVERGENTE'
      : itens.some((i) => i.validacao?.status === 'REVISAO_MANUAL')
        ? 'REVISAO_MANUAL'
        : itens.some((i) => i.validacao)
          ? 'CORRETO'
          : null;

  return { itens, divergenciasTotais, status: statusGeral };
}
