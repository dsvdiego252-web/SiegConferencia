// Estágio de alíquota de ICMS — RICMS/SP arts. 52 a 56-C. Não modela o
// texto integral de cada artigo (arts. 53-A/54/55 dependem de o produto
// "constar no artigo", sem lista de NCM na fonte fornecida) — por isso só
// confirma CORRETO quando a alíquota bate com a regra geral (18% interna)
// ou com uma das duas exceções identificáveis por NCM (54-A: NCM 2203 →
// 20%; 55-A: capítulo 24 → 30%). Quando a alíquota informada é uma das
// alíquotas de ICMS que realmente existem em SP mas não bate com nenhuma
// dessas três, cai em REVISAO_MANUAL (pode ser um produto nomeado em
// art. 53-A/54/55 que não temos como conferir) — só vira DIVERGENTE
// quando a alíquota informada não corresponde a nenhuma alíquota de ICMS
// vigente em SP, interna ou interestadual.
//
// Limitações conhecidas, documentadas (não escondidas):
// - art. 52 §2º (4% em interestadual com conteúdo de importação > 40%)
//   não é verificável: o parser ainda não extrai o campo `orig` do XML
//   (origem da mercadoria) — 4% informado em operação interestadual fica
//   em REVISAO_MANUAL, nunca confirmado nem rejeitado.
// - Simples Nacional/MEI (art. 56-B, regras da LC 123) não seguem esta
//   tabela de alíquota "cheia" — este estágio não roda pra esses clientes.
// - FECOP (art. 56-C, +2% pra NCM 2203/capítulo 24 a consumidor final SP)
//   não é conferido: o parser não extrai vFCP/pFCP do grupo ICMS ainda.
//
// Regime especial de carnes (cliente.regimesEspeciais,
// "icms_carne_4_5_sem_credito"): Decreto 62.647/2017, art. 2º-A (redação
// Decreto 67.524/2023) — confirmado pela RC 16.711/2017 — permite destacar
// 4,5% de ICMS ("Imposto Debitado") em toda saída de carne (NCM capítulo
// 02), sem tomar crédito, pra estabelecimento no lucro real. Só se aplica
// dentro do estado (a fonte fornecida não menciona operação interestadual);
// fora desse escopo, a regra geral do artigo 52 continua valendo normal.

import { canonicalizarNcm, regiaoDaUf } from './util.js';

const ALIQUOTAS_VALIDAS_INTERNA = new Set([18, 20, 25, 30, 7, 12, 4.5]);
const ALIQUOTAS_VALIDAS_INTERESTADUAL = new Set([4, 7, 12]);

function regimeCarneAplicavel(contexto, ncmCanonico) {
  return (
    contexto.regimeTributario === 'lucro_real' &&
    (contexto.regimesEspeciais || []).includes('icms_carne_4_5_sem_credito') &&
    ncmCanonico.startsWith('02')
  );
}

function aliquotaEsperadaInterna(ncmCanonico, contexto) {
  if (regimeCarneAplicavel(contexto, ncmCanonico)) {
    return {
      aliquota: 4.5,
      fundamento: 'Decreto 62.647/2017, art. 2º-A (redação Decreto 67.524/2023) — RC 16.711/2017 (regime especial de carnes, sem crédito)',
    };
  }
  if (ncmCanonico.startsWith('2203')) return { aliquota: 20, fundamento: 'RICMS/SP art. 54-A (NCM 2203)' };
  if (ncmCanonico.startsWith('24')) return { aliquota: 30, fundamento: 'RICMS/SP art. 55-A (capítulo 24)' };
  return { aliquota: 18, fundamento: 'RICMS/SP art. 52, I (alíquota interna geral)' };
}

export function validarAliquotaIcmsItem(item, contexto) {
  const divergencias = [];
  const pendencias = [];

  if (contexto.regimeTributario === 'simples_nacional' || contexto.regimeTributario === 'mei') {
    return { status: 'REVISAO_MANUAL', divergencias, pendencias: ['Cliente no Simples Nacional/MEI — alíquota "cheia" de ICMS (arts. 52-56C) não se aplica; ver LC 123/06, art. 18 (art. 56-B do RICMS/SP).'] };
  }

  const aliquotaXml = item.icms?.aliquota;
  if (!Number.isFinite(aliquotaXml) || aliquotaXml === 0) {
    return { status: 'REVISAO_MANUAL', divergencias, pendencias: ['Alíquota de ICMS zerada ou ausente no item — pode ser isenção/ST/diferimento, conferido em outro estágio.'] };
  }

  const ncmCanonico = canonicalizarNcm(item.ncm);

  if (contexto.mesmoEstado === true) {
    const { aliquota: esperada, fundamento } = aliquotaEsperadaInterna(ncmCanonico, contexto);
    if (Math.abs(aliquotaXml - esperada) < 0.01) {
      return { status: 'CORRETO', aliquotaEsperada: esperada, fundamento, divergencias, pendencias };
    }
    if (!ALIQUOTAS_VALIDAS_INTERNA.has(aliquotaXml)) {
      divergencias.push({
        campo: 'Alíquota ICMS',
        informado: `${aliquotaXml}%`,
        esperado: `${esperada}%`,
        mensagem: `Alíquota de ICMS informada (${aliquotaXml}%) não corresponde a nenhuma alíquota interna vigente em SP (18/20/25/30/7/12 conforme o artigo aplicável).`,
        baseLegal: fundamento,
      });
      return { status: 'DIVERGENTE', divergencias, pendencias };
    }
    pendencias.push(`Alíquota informada (${aliquotaXml}%) diverge da regra geral (${esperada}% — ${fundamento}), mas pode se enquadrar em produto nomeado nos arts. 53-A/54/55 do RICMS/SP, que este motor não confere automaticamente por falta de lista de produtos — revisar manualmente.`);
    return { status: 'REVISAO_MANUAL', divergencias, pendencias };
  }

  if (contexto.mesmoEstado === false) {
    const regiao = regiaoDaUf(contexto.ufDestinatario);
    if (!regiao) {
      if (!ALIQUOTAS_VALIDAS_INTERESTADUAL.has(aliquotaXml)) {
        divergencias.push({
          campo: 'Alíquota ICMS',
          informado: `${aliquotaXml}%`,
          esperado: null,
          mensagem: `Alíquota de ICMS informada (${aliquotaXml}%) não corresponde a nenhuma alíquota interestadual vigente (4/7/12%).`,
          baseLegal: 'RICMS/SP art. 52',
        });
        return { status: 'DIVERGENTE', divergencias, pendencias };
      }
      return { status: 'REVISAO_MANUAL', divergencias, pendencias: ['UF de destino não identificada — não dá pra confirmar se 7% ou 12% seria o esperado.'] };
    }
    const esperada = regiao === 'NORTE' || regiao === 'NORDESTE' || regiao === 'CENTRO_OESTE' || contexto.ufDestinatario === 'ES' ? 7 : 12;
    if (Math.abs(aliquotaXml - esperada) < 0.01) return { status: 'CORRETO', aliquotaEsperada: esperada, fundamento: 'RICMS/SP art. 52, II/III', divergencias, pendencias };
    if (Math.abs(aliquotaXml - 4) < 0.01) {
      return { status: 'REVISAO_MANUAL', divergencias, pendencias: ['Alíquota de 4% informada — só é válida se a mercadoria for importada com conteúdo de importação acima de 40% (art. 52, §2º); este motor ainda não confere a origem da mercadoria no XML.'] };
    }
    divergencias.push({
      campo: 'Alíquota ICMS',
      informado: `${aliquotaXml}%`,
      esperado: `${esperada}%`,
      mensagem: `Alíquota de ICMS informada (${aliquotaXml}%) diverge da esperada pra operação interestadual com destino a ${contexto.ufDestinatario || 'UF não identificada'} (${esperada}% — RICMS/SP art. 52).`,
      baseLegal: 'RICMS/SP art. 52',
    });
    return { status: 'DIVERGENTE', divergencias, pendencias };
  }

  return { status: 'REVISAO_MANUAL', divergencias, pendencias: ['UF de emitente/destinatário não disponível — não dá pra saber se a operação é interna ou interestadual pra conferir a alíquota.'] };
}
