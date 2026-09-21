// Estágio 2 (confronto_xml.ordem: "verificar CFOP" / determina "cfop" no
// resultado final) — confere se o CFOP declarado existe na tabela oficial
// (IT 2023.002), se o movimento (ENTRADA/SAÍDA) bate com a direção real do
// documento, e — quando a UF de emitente/destinatário estiver disponível —
// se o âmbito (dentro do estado / fora do estado) também bate. Nunca
// escolhe "o" CFOP correto sozinho: só valida consistência, exatamente como
// o próprio `meta.regra_importante` da fonte pede ("CFOP válido não
// significa CFOP correto pra operação").

import { getCfop } from '../repository.js';
import { regiaoDaUf } from './util.js';

let indice = null;

function obterIndice() {
  if (indice) return indice;
  const { cfops } = getCfop();
  indice = new Map(cfops.map((c) => [c.cfop, c]));
  return indice;
}

const MOVIMENTO_POR_OPERACAO = { entrada: 'ENTRADA', saida: 'SAIDA' };

export function validarCfopItem(item, contexto) {
  const cfop = String(item.cfop || '').trim();
  const divergencias = [];
  const pendencias = [];

  if (!cfop) {
    return { status: 'DIVERGENTE', existe: false, divergencias: ['CFOP ausente no item.'], pendencias: [] };
  }

  const regra = obterIndice().get(cfop);
  if (!regra) {
    return { status: 'DIVERGENTE', existe: false, divergencias: [`CFOP ${cfop} não consta na tabela oficial (IT 2023.002 v2.10).`], pendencias: [] };
  }

  if (regra.vigencia_fim && contexto.dataEmissao && contexto.dataEmissao > regra.vigencia_fim) {
    divergencias.push(`CFOP ${cfop} não estava mais vigente na data de emissão (vigência encerrada em ${regra.vigencia_fim}).`);
  }

  const movimentoEsperado = MOVIMENTO_POR_OPERACAO[contexto.operacao];
  if (movimentoEsperado && regra.classificacao_derivada?.movimento && regra.classificacao_derivada.movimento !== movimentoEsperado) {
    divergencias.push(
      `CFOP ${cfop} é de ${regra.classificacao_derivada.movimento} ("${regra.titulo}"), mas o documento é de ${movimentoEsperado === 'ENTRADA' ? 'entrada' : 'saída'} pra este cliente.`
    );
  }

  if (contexto.mesmoEstado !== null && contexto.mesmoEstado !== undefined && regra.classificacao_derivada?.ambito) {
    const ambito = regra.classificacao_derivada.ambito;
    if (ambito === 'DENTRO_UF' && contexto.mesmoEstado === false) {
      divergencias.push(`CFOP ${cfop} é de operação dentro do estado, mas emitente e destinatário estão em UFs diferentes.`);
    } else if (ambito === 'FORA_UF' && contexto.mesmoEstado === true) {
      divergencias.push(`CFOP ${cfop} é de operação interestadual, mas emitente e destinatário estão na mesma UF.`);
    }
  } else if (regra.classificacao_derivada?.ambito && regra.classificacao_derivada.ambito !== 'DENTRO_UF') {
    pendencias.push('UF de emitente/destinatário não disponível — não dá pra confirmar se o âmbito (dentro/fora do estado) do CFOP está coerente.');
  }

  const status = divergencias.length ? 'DIVERGENTE' : pendencias.length ? 'REVISAO_MANUAL' : 'CORRETO';
  return { status, existe: true, titulo: regra.titulo, movimento: regra.classificacao_derivada?.movimento, ambito: regra.classificacao_derivada?.ambito, divergencias, pendencias };
}

export { regiaoDaUf };
