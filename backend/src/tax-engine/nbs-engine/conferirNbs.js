// Orquestrador da conferência de NFS-e — hoje só o estágio de NBS
// (existência/descrição do código de serviço). Mesmo padrão de isolamento
// contra exceção do motor de ICMS/CFOP/CST (icms-engine/conferirIcms.js):
// um item quebrando não derruba a conferência do documento inteiro.

import { validarNbsItem } from './validarNbs.js';

function comProtecao(fn) {
  try {
    return fn();
  } catch (err) {
    console.error('Falha na conferência de NBS — item ignorado:', err.message, err.stack);
    return null;
  }
}

export function conferirNbsItem(item) {
  const resultado = comProtecao(() => validarNbsItem(item)) || { status: 'REVISAO_MANUAL', divergencias: [], pendencias: [] };
  return {
    ...resultado,
    // Tag de motor/estágio igual ao que conferirIcms.js grava em cada
    // divergência — é o que o frontend usa pra agrupar tudo do mesmo
    // assunto num só cartão de "Inconsistência Fiscal".
    divergencias: (resultado.divergencias || []).map((d) => ({ ...d, motor: 'nbs', estagio: 'nbs' })),
  };
}

export function conferirNbsDocumento(doc) {
  const itens = doc.itens.map((item, indice) => ({
    numeroItem: item.numeroItem ?? indice + 1,
    conferencia: conferirNbsItem(item),
  }));

  const status = itens.some((i) => i.conferencia.status === 'DIVERGENTE')
    ? 'DIVERGENTE'
    : itens.some((i) => i.conferencia.status === 'REVISAO_MANUAL')
      ? 'REVISAO_MANUAL'
      : 'CORRETO';

  return { itens, status };
}
