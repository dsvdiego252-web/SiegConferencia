// Motor de ICMS/CFOP/CST — compara o que o XML informou (CFOP, CST/CSOSN,
// alíquota de ICMS) com o que a base de regras (data/, ver README.md deste
// diretório) diz que deveria ser, dado o contexto da operação. Mesmo
// princípio do goods-engine: "primeiro descobrir como deveria estar
// tributado, depois comparar com o que veio no documento" — e nunca
// confirmar uma divergência sem ter uma regra carregada que sustente isso.
//
// Enquanto data/*.json estiverem vazios (`[]`, o estado inicial deste
// motor), toda conferência devolve SEM_BASE_CARREGADA — nunca um CFOP/CST/
// alíquota "provável" inventado.

import { getIcmsRules } from './repository.js';

function apenasDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function canonicalizarNcm(valor) {
  return apenasDigitos(valor);
}

function condicoesBatem(condicoes, valores) {
  return Object.entries(condicoes || {}).every(([chave, esperado]) => {
    if (esperado === undefined || esperado === null) return true;
    return valores[chave] === esperado;
  });
}

function encontrarRegra(regras, valores) {
  return regras.find((regra) => condicoesBatem(regra.condicoes, valores)) || null;
}

function encontrarRegraAliquota(regras, ncmCanonico, ufOrigem, ufDestino) {
  return (
    regras.find((regra) => {
      const prefixo = canonicalizarNcm(regra.ncmPrefixo);
      if (!prefixo || !ncmCanonico.startsWith(prefixo)) return false;
      if (regra.ufOrigem && regra.ufOrigem !== ufOrigem) return false;
      if (regra.ufDestino && regra.ufDestino !== ufDestino) return false;
      return true;
    }) || null
  );
}

function montarResultadoSemBase() {
  return {
    status: 'SEM_BASE_CARREGADA',
    cfopEsperado: null,
    cstEsperado: null,
    aliquotaEsperada: null,
    divergencias: [],
    pendencias: [],
    notas: ['Base de regras de ICMS/CFOP/CST ainda não foi cadastrada — ver tax-engine/icms-engine/README.md.'],
  };
}

/**
 * Confere CFOP, CST/CSOSN e alíquota de ICMS de um item contra a base de
 * regras carregada. `contexto`: { tipoOperacao: 'venda'|'compra',
 * regimeTributario, mesmoEstado: true|false|null, consumidorFinal:
 * true|false|null, ufEmitente, ufDestinatario } — qualquer campo do
 * contexto que seja `null`/`undefined` simplesmente não participa do
 * casamento de regras (a regra correspondente cai em pendência, nunca em
 * divergência arriscada).
 */
export function conferirIcmsItem(item, contexto = {}) {
  const { cfopRules, cstRules, aliquotaRules } = getIcmsRules();
  if (!cfopRules.length && !cstRules.length && !aliquotaRules.length) {
    return montarResultadoSemBase();
  }

  const valoresContexto = {
    tipoOperacao: contexto.tipoOperacao ?? null,
    mesmoEstado: contexto.mesmoEstado ?? null,
    consumidorFinal: contexto.consumidorFinal ?? null,
    regimeTributario: contexto.regimeTributario ?? null,
  };

  const divergencias = [];
  const pendencias = [];

  let cfopEsperado = null;
  if (cfopRules.length) {
    const regra = encontrarRegra(cfopRules, valoresContexto);
    if (regra) {
      cfopEsperado = regra.cfopEsperado;
      if (item.cfop && item.cfop !== cfopEsperado) {
        divergencias.push(`CFOP informado (${item.cfop}) diverge do esperado (${cfopEsperado}${regra.descricao ? ` — ${regra.descricao}` : ''}).`);
      }
    } else {
      pendencias.push('Nenhuma regra de CFOP cadastrada bate com o contexto desta operação — revisar manualmente.');
    }
  }

  let cstEsperado = null;
  if (cstRules.length) {
    const regra = encontrarRegra(cstRules, valoresContexto);
    if (regra) {
      cstEsperado = regra.cstEsperado;
      const cstInformado = item.icms?.cst !== null && item.icms?.cst !== undefined ? String(item.icms.cst) : null;
      if (cstInformado && cstInformado !== String(cstEsperado)) {
        divergencias.push(`CST/CSOSN informado (${cstInformado}) diverge do esperado (${cstEsperado}${regra.descricao ? ` — ${regra.descricao}` : ''}).`);
      }
    } else {
      pendencias.push('Nenhuma regra de CST/CSOSN cadastrada bate com o regime/situação desta operação — revisar manualmente.');
    }
  }

  let aliquotaEsperada = null;
  if (aliquotaRules.length) {
    const ncmCanonico = canonicalizarNcm(item.ncm);
    if (!ncmCanonico) {
      pendencias.push('NCM ausente ou inválida no item — não é possível conferir a alíquota de ICMS.');
    } else {
      const regra = encontrarRegraAliquota(aliquotaRules, ncmCanonico, contexto.ufEmitente, contexto.ufDestinatario);
      if (regra) {
        const usarInterestadual = valoresContexto.mesmoEstado === false && Number.isFinite(regra.aliquotaInterestadual);
        aliquotaEsperada = usarInterestadual ? regra.aliquotaInterestadual : regra.aliquotaInterna;
        if (valoresContexto.mesmoEstado === null && Number.isFinite(regra.aliquotaInterestadual) && regra.aliquotaInterestadual !== regra.aliquotaInterna) {
          pendencias.push('UF de emitente/destinatário não disponível — não dá pra saber se a operação é interna ou interestadual pra conferir a alíquota.');
          aliquotaEsperada = null;
        } else if (Number.isFinite(item.icms?.aliquota) && item.icms.aliquota > 0 && Math.abs(item.icms.aliquota - aliquotaEsperada) > 0.01) {
          divergencias.push(`Alíquota de ICMS informada (${item.icms.aliquota}%) diverge da esperada (${aliquotaEsperada}%${regra.observacao ? ` — ${regra.observacao}` : ''}).`);
        }
      } else {
        pendencias.push(`NCM ${item.ncm} não encontrado na tabela de alíquotas de ICMS carregada — revisar manualmente.`);
      }
    }
  }

  const status = divergencias.length ? 'DIVERGENTE' : pendencias.length ? 'REVISAO_MANUAL' : 'CORRETO';
  return { status, cfopEsperado, cstEsperado, aliquotaEsperada, divergencias, pendencias, notas: [] };
}

/**
 * Monta o contexto de uma operação a partir do documento já classificado
 * (entrada/saída) e do regime tributário do cliente — usado antes de
 * chamar conferirIcmsItem pra cada item do documento. `mesmoEstado`/
 * `ufEmitente`/`ufDestinatario` ficam `null` até o parser/cache passarem a
 * guardar a UF de emitente/destinatário (ver "Limitação atual" no README).
 */
export function contextoIcmsDocumento(doc, operacao, regimeTributario) {
  return {
    tipoOperacao: operacao === 'saida' ? 'venda' : operacao === 'entrada' ? 'compra' : null,
    regimeTributario: regimeTributario ?? null,
    consumidorFinal: doc.tipoDocumento === 'NFCe' ? true : null,
    mesmoEstado: null,
    ufEmitente: null,
    ufDestinatario: null,
  };
}

export function conferirIcmsDocumento(doc, operacao, regimeTributario) {
  const contexto = contextoIcmsDocumento(doc, operacao, regimeTributario);
  const itens = doc.itens.map((item, indice) => ({
    numeroItem: item.numeroItem ?? indice + 1,
    conferencia: conferirIcmsItem(item, contexto),
  }));

  const status = itens.some((i) => i.conferencia.status === 'DIVERGENTE')
    ? 'DIVERGENTE'
    : itens.some((i) => i.conferencia.status === 'REVISAO_MANUAL')
      ? 'REVISAO_MANUAL'
      : itens.every((i) => i.conferencia.status === 'SEM_BASE_CARREGADA')
        ? 'SEM_BASE_CARREGADA'
        : 'CORRETO';

  return { itens, status };
}
