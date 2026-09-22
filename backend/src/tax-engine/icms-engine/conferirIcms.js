// Motor de conferência de ICMS/CFOP/CST/PIS-COFINS/cBenef — pipeline
// sequencial (ordem definida junto com o usuário: NCM/TIPI → CFOP →
// PIS/COFINS → alíquota de ICMS → cBenef×CST → ICMS-ST → benefícios dos
// Anexos I/II), cada estágio isolado em pipeline/*.js e protegido contra
// exceção (um estágio quebrando não pode derrubar os outros). Mesmo
// princípio de todo o motor tributário deste projeto: "primeiro descobrir
// como deveria estar tributado, depois comparar com o documento" — e nunca
// confirmar uma divergência sem uma base de dados real por trás (ver
// README.md e fontes-sp/ pra rastrear cada regra até a fonte oficial).

import { validarNcmItem } from './pipeline/validarNcm.js';
import { validarCfopItem } from './pipeline/validarCfop.js';
import { validarPisCofinsItem } from './pipeline/validarPisCofins.js';
import { validarAliquotaIcmsItem } from './pipeline/validarAliquotaIcms.js';
import { validarCbenefItem } from './pipeline/validarCbenef.js';
import { verificarStItem } from './pipeline/verificarSt.js';
import { verificarBeneficiosAnexosItem } from './pipeline/verificarBeneficiosAnexos.js';

function comProtecao(rotulo, fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`Falha no estágio "${rotulo}" da conferência de ICMS/CFOP/CST — item ignorado nesse estágio:`, err.message, err.stack);
    return null;
  }
}

/**
 * Monta o contexto da operação a partir do documento já classificado
 * (entrada/saída) e do regime tributário do cliente — usado antes de rodar
 * o pipeline em cada item do documento.
 */
export function contextoIcmsDocumento(doc, operacao, regimeTributario, atividade) {
  const ufEmitente = doc.emitente?.uf || null;
  const ufDestinatario = doc.destinatario?.uf || null;
  // NFCe (modelo 65) é, por definição do próprio modelo fiscal, restrita a
  // venda presencial de varejo dentro do estado do emitente — a SEFAZ não
  // autoriza NFCe em operação interestadual (só NF-e modelo 55 pode). Por
  // isso, mesmo sem UF de emitente/destinatário disponível (comum: venda a
  // consumidor final sem endereço, ou documento cacheado antes de o parser
  // guardar esse campo), dá pra afirmar "mesmo estado" com segurança só
  // pelo tipo de documento — não é um chute, é uma regra do próprio modelo.
  const mesmoEstado = ufEmitente && ufDestinatario
    ? ufEmitente === ufDestinatario
    : doc.tipoDocumento === 'NFCe' ? true : null;
  return {
    operacao,
    tipoOperacao: operacao === 'saida' ? 'venda' : operacao === 'entrada' ? 'compra' : null,
    regimeTributario: regimeTributario ?? null,
    atividade: atividade ?? null,
    consumidorFinal: doc.tipoDocumento === 'NFCe' ? true : null,
    mesmoEstado,
    ufEmitente,
    ufDestinatario,
    dataEmissao: String(doc.dataEmissao || '').slice(0, 10) || null,
    // null/ausente = documento cacheado antes de existir extração de cBenef
    // (ou outro campo futuro) com confiança — ver xmlParser.js VERSAO_PARSER.
    versaoParser: doc.versaoParser ?? null,
  };
}

const ESTAGIOS = [
  { nome: 'ncmTipi', motor: 'ncm', fn: (item) => validarNcmItem(item) },
  { nome: 'cfop', motor: 'cfop', fn: (item, contexto) => validarCfopItem(item, contexto) },
  { nome: 'pisCofins', motor: 'pis_cofins', fn: (item, contexto) => validarPisCofinsItem(item, contexto) },
  { nome: 'aliquotaIcms', motor: 'icms_aliquota', fn: (item, contexto) => validarAliquotaIcmsItem(item, contexto) },
  { nome: 'cbenef', motor: 'icms_cbenef', fn: (item, contexto) => validarCbenefItem(item, contexto) },
  { nome: 'icmsSt', motor: 'icms_st', fn: (item, contexto) => verificarStItem(item, contexto) },
  { nome: 'beneficiosAnexos', motor: 'icms_anexos', fn: (item, contexto) => verificarBeneficiosAnexosItem(item, contexto) },
];

function statusMaisGrave(statusList) {
  if (statusList.includes('DIVERGENTE')) return 'DIVERGENTE';
  if (statusList.includes('REVISAO_MANUAL')) return 'REVISAO_MANUAL';
  if (statusList.length === 0) return 'SEM_BASE_CARREGADA';
  return 'CORRETO';
}

/**
 * Roda o pipeline completo de conferência fiscal de SP num único item,
 * combinando os resultados de todos os estágios num só veredito. Cada
 * mensagem de divergência/pendência já cita a fonte (fundamento legal,
 * tabela, artigo) que a gerou — nunca uma afirmação solta.
 */
export function conferirIcmsItem(item, contexto = {}) {
  const divergencias = [];
  const pendencias = [];
  const porEstagio = {};
  const statusPorEstagio = [];

  for (const estagio of ESTAGIOS) {
    const resultado = comProtecao(estagio.nome, () => estagio.fn(item, contexto));
    if (!resultado) continue;
    porEstagio[estagio.nome] = resultado;
    statusPorEstagio.push(resultado.status);
    // divergencias já vêm estruturadas (campo/informado/esperado/mensagem/
    // baseLegal) de cada estágio — só marca de qual motor/agrupamento veio,
    // pra o front conseguir juntar tudo do mesmo assunto (ICMS/CFOP de um
    // lado, PIS/COFINS de outro) num cartão só.
    for (const d of resultado.divergencias || []) divergencias.push({ ...d, motor: estagio.motor, estagio: estagio.nome });
    for (const p of resultado.pendencias || []) pendencias.push(`[${estagio.nome}] ${p}`);
  }

  return {
    status: statusMaisGrave(statusPorEstagio),
    estagios: porEstagio,
    divergencias,
    pendencias,
  };
}

export function conferirIcmsDocumento(doc, operacao, regimeTributario, atividade) {
  const contexto = contextoIcmsDocumento(doc, operacao, regimeTributario, atividade);
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

  return { itens, status, contexto };
}
